import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { SoireeLive } from './live';

/** La page charge par promesses nues ; en zoneless, Angular ne les suit pas. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe(SoireeLive.name, () => {
  let component: SoireeLive;
  let fixture: ComponentFixture<SoireeLive>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SoireeLive],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(SoireeLive);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  /**
   * La page annonçait « Soirée Hivernale » écrit en dur dans le gabarit, sans
   * savoir quelle soirée elle affichait.
   */
  it('names the soonest event that is not completed', async () => {
    http
      .expectOne((r) => r.url.endsWith('/events'))
      .flush([
        { id: '1', name: 'Gala de fin', date: '2026-12-01T19:00:00.000Z', status: 'scheduled' },
        { id: '2', name: 'Soirée BBQ', date: '2026-08-20T19:00:00.000Z', status: 'ongoing' },
        { id: '3', name: 'Vieille soirée', date: '2026-01-01T19:00:00.000Z', status: 'completed' },
      ]);
    await settle();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    // La plus proche parmi les non clôturées — pas la plus ancienne, qui est
    // justement celle qu'il ne faut pas piloter.
    expect(text).toContain('Soirée BBQ');
    expect(text).not.toContain('Vieille soirée');
    expect(text).not.toContain('Soirée Hivernale');
  });

  it('says so when there is no event to pilot, rather than inventing one', async () => {
    http.expectOne((r) => r.url.endsWith('/events')).flush([]);
    await settle();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Aucune soirée en cours ni à venir');
  });

  /**
   * Le §32 du handoff : les tickets, la cadence, les transactions et le stock
   * critique n'ont aucun endpoint. L'écran doit le dire plutôt que de laisser
   * croire à des chiffres réels.
   */
  it('marks the demonstration data as not wired', async () => {
    http.expectOne((r) => r.url.endsWith('/events')).flush([]);
    await settle();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Données de démonstration ci-dessous');
  });

  it('shows produced against planned once the runs land', async () => {
    http
      .expectOne((r) => r.url.endsWith('/events'))
      .flush([
        { id: '4', name: 'Soirée BBQ', date: '2026-08-20T19:00:00.000Z', status: 'ongoing' },
      ]);
    await settle();
    // L'effect qui déclenche les deux chargements ne tourne qu'à la détection
    // de changements — sans ce passage, aucune requête n'est encore partie.
    fixture.detectChanges();
    await settle();

    // Le menu et les lancements partent ensemble depuis le même effect.
    http.expectOne((r) => r.url.includes('/events/4/products')).flush([]);
    http
      .expectOne((r) => r.url.includes('/events/4/production-runs'))
      .flush([
        { productId: 1, productName: 'Hot-dog', plannedQty: 200, producedQty: 120, runs: [] },
      ]);
    await settle();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Hot-dog');
    expect(text).toContain('120 / 200');
  });

  /**
   * Un 403 sur la production ne doit pas vider la page : la lecture exige
   * `stock:read`, que le socle ne porte pas.
   */
  it('shows a restricted panel instead of emptying the page on 403', async () => {
    http
      .expectOne((r) => r.url.endsWith('/events'))
      .flush([
        { id: '4', name: 'Soirée BBQ', date: '2026-08-20T19:00:00.000Z', status: 'ongoing' },
      ]);
    await settle();
    fixture.detectChanges();
    await settle();

    http.expectOne((r) => r.url.includes('/events/4/products')).flush([]);
    http
      .expectOne((r) => r.url.includes('/events/4/production-runs'))
      .flush(
        { code: 'E_FORBIDDEN', message: 'Missing permission: stock:read' },
        { status: 403, statusText: 'Forbidden' },
      );
    await settle();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Accès restreint');
    // La page vit toujours.
    expect(text).toContain('Soirée BBQ');
  });
});
