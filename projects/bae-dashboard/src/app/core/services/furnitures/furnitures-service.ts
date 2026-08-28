import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@bae/ui';

/**
 * Une fourniture — le **non alimentaire** du catalogue : gobelets, serviettes,
 * nappes.
 *
 * ⚠️ Ce n'est pas une denrée mal rangée, c'est une autre table. Une fourniture
 * n'a ni lot, ni DLC, ni catégorie, ni tarif par enseigne : son stock tient
 * dans une seule colonne `quantity`, et son prix lui appartient.
 */
export interface ApiFurniture {
  readonly id: number;
  readonly name: string;
  readonly quantity: number;
  /** ⚠️ **Centimes**, comme tout montant de l'API. */
  readonly price: number;
}

/** Le corps de `POST /furnitures` et de `PATCH /furnitures/:id`. */
export interface FurnitureInput {
  readonly name: string;
  readonly quantity: number;
  /** ⚠️ **Centimes** : `parseEuros` fait la conversion à la saisie. */
  readonly price: number;
}

@Injectable({ providedIn: 'root' })
export class FurnituresService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getAll(): Observable<ApiFurniture[]> {
    return this.http.get<ApiFurniture[]>(`${this.baseUrl}/furnitures`);
  }

  create(input: FurnitureInput): Observable<ApiFurniture> {
    return this.http.post<ApiFurniture>(`${this.baseUrl}/furnitures`, input);
  }

  update(id: number, input: FurnitureInput): Observable<ApiFurniture> {
    return this.http.patch<ApiFurniture>(`${this.baseUrl}/furnitures/${id}`, input);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/furnitures/${id}`);
  }
}
