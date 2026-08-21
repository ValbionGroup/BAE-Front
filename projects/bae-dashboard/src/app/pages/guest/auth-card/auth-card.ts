import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideDynamicIcon, LucideIconInput } from '@lucide/angular';

/**
 * La carte centrée des écrans d'authentification annexes — mot de passe oublié,
 * réinitialisation, saisie du code 2FA.
 *
 * Locale au dashboard et non versée dans `bae-ui` : elle encode la mise en page de
 * cette application et sa marque, donc elle échoue la règle d'admission de la
 * bibliothèque (« indépendant du métier »). Trois consommateurs justifient
 * l'extraction, la bibliothèque non.
 *
 * La page de connexion garde sa mise en page à deux volets : c'est la porte
 * d'entrée, et ces écrans-ci sont des détours qui gagnent à être resserrés.
 */
@Component({
  selector: 'bfd-auth-card',
  imports: [LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-screen items-center justify-center bg-bg px-4 py-10 text-text font-sans">
      <div class="w-full max-w-[365px] rounded-lg border border-border-s bg-surface p-6">
        <div
          class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-soft text-blue"
        >
          <svg [lucideIcon]="icon()" [size]="20" aria-hidden="true"></svg>
        </div>

        <h1 class="mt-4 mb-0 text-[20px] font-semibold -tracking-[0.3px] text-text">
          {{ heading() }}
        </h1>
        @if (description(); as text) {
          <p class="mt-2 mb-0 text-[12.5px] leading-relaxed text-muted">{{ text }}</p>
        }

        <div class="mt-5">
          <ng-content />
        </div>
      </div>
    </div>
  `,
})
export class AuthCard {
  readonly icon = input.required<LucideIconInput>();
  /** `heading` et non `title` : `title` sur un hôte devient une infobulle native. */
  readonly heading = input.required<string>();
  readonly description = input<string | null>(null);
}
