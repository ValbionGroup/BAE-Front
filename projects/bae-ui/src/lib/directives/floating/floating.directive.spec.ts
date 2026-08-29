import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { FloatingDirective } from './floating.directive';

@Component({
  imports: [FloatingDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button #trigger>Trigger</button>
    <div [baeFloating]="trigger">Floating</div>
  `,
})
class HostComponent {}

@Component({
  imports: [FloatingDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button #trigger>Trigger</button>
    <div [baeFloating]="trigger" [baeArrow]="arrow" baePlacement="top">
      Floating
      <span #arrow class="arrow"></span>
    </div>
  `,
})
class ArrowHostComponent {}

/**
 * ⚠️ `whenStable()` ne suffit pas ici : Floating UI positionne dans un `.then()`
 * qui vit hors de la file d'Angular, et `computePosition` fait lui-même du
 * travail asynchrone. Attendre le rendu du composant ne dit donc rien de la
 * position — d'où cette attente sur l'effet observable plutôt que sur le cycle.
 */
async function waitFor(predicate: () => boolean, timeoutMs = 1000): Promise<void> {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) throw new Error('positionnement jamais appliqué');
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

describe(FloatingDirective.name, () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create the host with the directive', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  /**
   * La flèche se plante sur le côté **opposé** au placement : un tooltip posé
   * au-dessus de son ancre porte sa flèche en bas. Sans cela elle sortirait du
   * côté vide, loin de ce qu'elle est censée désigner.
   */
  it('ancre la flèche sur le côté opposé au placement', async () => {
    const arrowFixture = TestBed.createComponent(ArrowHostComponent);
    arrowFixture.detectChanges();
    await arrowFixture.whenStable();

    const arrow = arrowFixture.nativeElement.querySelector('.arrow') as HTMLElement;
    await waitFor(() => arrow.style.cssText !== '');

    expect(arrow.style.bottom).not.toBe('');
    expect(arrow.style.top).toBe('');
  });

  it('positionne le flottant même sans flèche', async () => {
    const floating = fixture.nativeElement.querySelector('div') as HTMLElement;
    await waitFor(() => floating.style.transform !== '');

    expect(floating.style.position).toBe('fixed');
    expect(floating.style.transform).toContain('translate');
  });
});
