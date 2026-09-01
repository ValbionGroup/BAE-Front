import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { API_BASE_URL } from '@bae/ui';

import { SponsorshipPickerModal } from './sponsorship-picker-modal';
import { ModalService } from '../modal.service';
import type { SponsorshipCategory } from '#core/services/sponsorships/sponsorships-service';

const baseUrl = 'http://api.test/v1';

const staff: SponsorshipCategory = {
  id: 3,
  eventId: 7,
  label: 'Staff BDE',
  mode: 'internal',
  prices: [{ productId: 1, priceCents: 0 }],
};

describe(SponsorshipPickerModal.name, () => {
  function internals(component: SponsorshipPickerModal): {
    categories(): readonly SponsorshipCategory[];
    loading(): boolean;
    lowestPrice(category: SponsorshipCategory): number | null;
    choose(category: SponsorshipCategory): void;
    remove(): void;
  } {
    return component as unknown as ReturnType<typeof internals>;
  }

  /** Rend la modale, sert la liste et capture ce que `picked` reçoit. */
  async function render(currentId: number | null = null) {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SponsorshipPickerModal],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
      ],
    }).compileComponents();

    const picked = vi.fn();
    const fixture = TestBed.createComponent(SponsorshipPickerModal);
    fixture.componentRef.setInput('id', 'modal-1');
    fixture.componentRef.setInput('eventId', '7');
    fixture.componentRef.setInput('currentId', currentId);
    fixture.componentRef.setInput('picked', picked);
    vi.spyOn(TestBed.inject(ModalService), 'close').mockImplementation(() => undefined);
    fixture.detectChanges();

    const http = TestBed.inject(HttpTestingController);
    http.expectOne(`${baseUrl}/events/7/sponsorship-categories`).flush([staff]);
    await fixture.whenStable();
    fixture.detectChanges();

    return { component: internals(fixture.componentInstance), picked };
  }

  it('sert les tranches de la soirée', async () => {
    const { component } = await render();

    expect(component.loading()).toBe(false);
    expect(component.categories()).toEqual([staff]);
  });

  /** Une tranche à 0 € est le cas courant : elle ne doit pas passer pour « prix public ». */
  it('retient un prix nul comme un prix', async () => {
    const { component } = await render();

    expect(component.lowestPrice(staff)).toBe(0);
    expect(component.lowestPrice({ ...staff, prices: [] })).toBeNull();
  });

  it('remonte la tranche choisie', async () => {
    const { component, picked } = await render();
    component.choose(staff);

    expect(picked).toHaveBeenCalledWith(staff);
  });

  it('remonte `null` pour retirer la prise en charge', async () => {
    const { component, picked } = await render(3);
    component.remove();

    expect(picked).toHaveBeenCalledWith(null);
  });
});
