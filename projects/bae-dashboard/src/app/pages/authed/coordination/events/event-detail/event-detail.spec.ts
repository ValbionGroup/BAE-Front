import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { vi } from 'vitest';

import { CoordinationEventDetail } from './event-detail';
import { CoordinationStore } from '#core/store/coordination.store';
import type { CoordinationEvent } from '../events.types';

const soiree: CoordinationEvent = {
  id: 12,
  name: 'Soirée Hivernale',
  date: '14 fév.',
  rawDate: '2026-02-14T19:00:00.000Z',
  status: 'planning',
  statusLabel: 'En préparation',
  statusKind: 'blue',
  members: 4,
  maxMembers: 10,
  duration: null,
  description: null,
  capacity: 50,
  expectedAttendees: null,
  payerName: null,
  preOrderCloseLeadHours: null,
};

describe(CoordinationEventDetail.name, () => {
  let component: CoordinationEventDetail;
  let fixture: ComponentFixture<CoordinationEventDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoordinationEventDetail],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(CoordinationEventDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  /**
   * ⚠️ Champ vide ⇒ `null`, et non `0` : le back lit `null` comme « suivre la
   * valeur globale », alors que `0` fermerait les précommandes au moment même où
   * la soirée commence.
   */
  it('enregistre le délai de clôture saisi, et `null` quand le champ est vide', async () => {
    const store = TestBed.inject(CoordinationStore);
    const update = vi.spyOn(store, 'updateEvent').mockResolvedValue({
      id: 12,
      name: 'Soirée Hivernale',
      date: soiree.rawDate,
      duration: null,
    });

    fixture.componentRef.setInput('event', soiree);
    await fixture.whenStable();

    component['updateCloseLeadHours']('4');
    component['save']();
    expect(update).toHaveBeenCalledWith(12, expect.objectContaining({ preOrderCloseLeadHours: 4 }));

    // `save()` se garde contre le double-clic tant que la requête est en vol :
    // sans laisser la promesse se résoudre, le second appel sort tout de suite.
    await fixture.whenStable();

    component['updateCloseLeadHours']('   ');
    component['save']();
    expect(update).toHaveBeenLastCalledWith(
      12,
      expect.objectContaining({ preOrderCloseLeadHours: null }),
    );
  });
});
