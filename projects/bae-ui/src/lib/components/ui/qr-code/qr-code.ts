import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { toString as qrToString } from 'qrcode';

/**
 * ⚠️ Rendu en **SVG**, jamais en PNG. Les jetons de l'application produisent des
 * QR de version élevée : rastérisés autour de 200 px, leurs modules tombent sous
 * trois pixels et se brouillent sur un écran à forte densité.
 */
@Component({
  selector: 'bae-qr-code',
  template: `
    @if (dataUrl(); as url) {
      <img [src]="url" [width]="size()" [height]="size()" [alt]="alt()" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block' },
})
export class QrCode {
  readonly value = input.required<string>();
  readonly size = input<number>(220);
  readonly alt = input<string>('Code QR');

  readonly failed = output<unknown>();

  protected readonly dataUrl = signal<string | null>(null);

  constructor() {
    effect(() => {
      const value = this.value();
      void qrToString(value, { type: 'svg', margin: 1 })
        .then((svg) =>
          this.dataUrl.set(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`),
        )
        .catch((error: unknown) => {
          this.dataUrl.set(null);
          this.failed.emit(error);
        });
    });
  }
}
