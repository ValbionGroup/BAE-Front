import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '#core/tokens/api-url.token';
import { ToastService } from '#shared/components/toast/toast.service';
import { messageOf } from '#shared/utils/api-error';

/**
 * Télécharge un document PDF généré côté back et l'ouvre dans un nouvel
 * onglet. Le service gère lui-même l'échec par un toast : les boutons
 * « Imprimer » n'ont pas d'état d'erreur local à eux, contrairement aux
 * modales de production.
 */
@Injectable({ providedIn: 'root' })
export class PrintService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly toast = inject(ToastService);

  download(path: string, _filename: string): void {
    this.http.get(`${this.baseUrl}${path}`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: (err: unknown) => {
        this.toast.show({
          type: 'error',
          title: 'Impression impossible',
          message: messageOf(err, "Le document PDF n'a pas pu être généré."),
        });
      },
    });
  }
}
