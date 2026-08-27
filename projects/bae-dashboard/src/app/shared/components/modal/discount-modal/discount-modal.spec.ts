import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { DiscountModal } from './discount-modal';
import { ModalService } from '../modal.service';
import type { OrderDiscount } from '#core/services/orders/orders-service';

describe(DiscountModal.name, () => {
  let fixture: ComponentFixture<DiscountModal>;

  function internals(component: DiscountModal): {
    onAmount(v: string): void;
    onReason(v: string): void;
    onFreeReason(v: string): void;
    submit(): void;
    remove(): void;
    valid(): boolean;
    tooLarge(): boolean;
  } {
    return component as unknown as ReturnType<typeof internals>;
  }

  /** Rend la modale et capture ce que le rappel `applied` reçoit. */
  async function render(maxCents = 1000, current: OrderDiscount | null = null) {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [DiscountModal] }).compileComponents();

    const applied = vi.fn();
    fixture = TestBed.createComponent(DiscountModal);
    fixture.componentRef.setInput('id', 'modal-1');
    fixture.componentRef.setInput('maxCents', maxCents);
    fixture.componentRef.setInput('current', current);
    fixture.componentRef.setInput('applied', applied);
    vi.spyOn(TestBed.inject(ModalService), 'close').mockImplementation(() => undefined);
    fixture.detectChanges();

    return { component: internals(fixture.componentInstance), applied };
  }

  it('convertit les euros saisis en centimes', async () => {
    const { component, applied } = await render();
    component.onAmount('2,50');
    component.onReason('Geste commercial');

    component.submit();

    expect(applied).toHaveBeenCalledWith({ amountCents: 250, label: 'Geste commercial' });
  });

  /**
   * Le serveur ramènerait la remise au dû sans rien dire. Le refus est donc à
   * l'écran : sinon le comptoir annonce un montant et le ticket en porte un
   * autre.
   */
  it('refuse une remise supérieure au panier', async () => {
    const { component, applied } = await render(1000);
    component.onAmount('15,00');
    component.onReason('Geste commercial');

    component.submit();

    expect(component.tooLarge()).toBe(true);
    expect(applied).not.toHaveBeenCalled();
  });

  it('exige un motif quand « Autre » est choisi', async () => {
    const { component, applied } = await render();
    component.onAmount('1,00');
    component.onReason('Autre');

    component.submit();
    expect(applied).not.toHaveBeenCalled();

    component.onFreeReason('Commande offerte au staff');
    component.submit();

    expect(applied).toHaveBeenCalledWith({
      amountCents: 100,
      label: 'Commande offerte au staff',
    });
  });

  it('refuse un montant nul', async () => {
    const { component, applied } = await render();
    component.onAmount('0');
    component.onReason('Geste commercial');

    component.submit();

    expect(applied).not.toHaveBeenCalled();
  });

  /** Retirer est un geste distinct : saisir 0 n'est pas « pas de remise ». */
  it('retire la remise en envoyant null', async () => {
    const { component, applied } = await render(1000, { amountCents: 200, label: 'Geste' });

    component.remove();

    expect(applied).toHaveBeenCalledWith(null);
  });
});
