import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaymentModal, type PaymentMethod } from './payment-modal';

describe(PaymentModal.name, () => {
  let fixture: ComponentFixture<PaymentModal>;
  let paid: PaymentMethod[];

  beforeEach(async () => {
    paid = [];
    await TestBed.configureTestingModule({ imports: [PaymentModal] }).compileComponents();

    fixture = TestBed.createComponent(PaymentModal);
    fixture.componentRef.setInput('id', 'm1');
    fixture.componentRef.setInput('totalCents', 1250);
    fixture.componentRef.setInput('onConfirm', (m: PaymentMethod) => void paid.push(m));
    fixture.detectChanges();
  });

  const text = () => fixture.nativeElement.textContent as string;
  const cash = () => {
    fixture.componentInstance['choose']('cash');
    fixture.detectChanges();
  };

  it('demande le montant remis avant d’encaisser en espèces', () => {
    expect(text()).not.toContain('Montant remis');
    cash();
    expect(text()).toContain('Montant remis');
    expect(paid).toEqual([]);
  });

  it('cumule les coupures tapées', () => {
    cash();
    fixture.componentInstance['addDenomination'](1000);
    fixture.componentInstance['addDenomination'](500);
    expect(fixture.componentInstance['givenCents']()).toBe(1500);
  });

  it('annonce le rendu', () => {
    cash();
    fixture.componentInstance['addDenomination'](2000);
    fixture.detectChanges();

    expect(fixture.componentInstance['changeCents']()).toBe(750);
    expect(text()).toContain('7,50');
  });

  /** `@if (x; as y)` traiterait 0 comme absent : le compte juste doit s'afficher. */
  it('affiche un rendu nul plutôt que de retomber sur l’invite', () => {
    cash();
    fixture.componentInstance['setExact']();
    fixture.detectChanges();

    expect(fixture.componentInstance['changeCents']()).toBe(0);
    expect(text()).toContain('À rendre');
    expect(text()).not.toContain('Saisissez ce que le client a donné');
  });

  it('refuse de valider tant que le compte n’y est pas', () => {
    cash();
    fixture.componentInstance['addDenomination'](1000);
    expect(fixture.componentInstance['canConfirmCash']()).toBe(false);

    fixture.componentInstance['addDenomination'](500);
    expect(fixture.componentInstance['canConfirmCash']()).toBe(true);
  });

  it('nomme ce qui manque', () => {
    cash();
    fixture.componentInstance['addDenomination'](1000);
    fixture.detectChanges();

    expect(text()).toContain('Montant insuffisant');
    expect(text()).toContain('2,50');
  });
});
