import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@bae/ui';
import { Order, OrderStatus, PaymentMethod } from '#core/models/order.model';

export interface ApiOrderLine {
  readonly productId: number;
  readonly productName: string;
  readonly quantity: number;
  readonly unitPrice: number;
}

export interface ApiOrder {
  readonly id: number;
  readonly number: number;
  readonly eventId: number | null;
  readonly status: OrderStatus;
  readonly clientName: string;
  readonly lines: readonly ApiOrderLine[];
  readonly totalCents: number;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

export interface ApiSellableLine {
  readonly productId: number;
  readonly productName: string;
  readonly plannedQty: number;
  readonly producedQty: number;
  readonly soldQty: number;
  readonly remainingQty: number;
}

export interface CheckoutLine {
  readonly productId: number;
  readonly quantity: number;
}

export function toOrder(dto: ApiOrder): Order {
  return {
    id: dto.id,
    number: dto.number,
    eventId: String(dto.eventId ?? ''),
    status: dto.status,
    clientName: dto.clientName,
    lines: dto.lines.map((line) => ({
      productId: line.productId,
      productName: line.productName,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
    })),
    totalCents: dto.totalCents,
    createdAt: dto.createdAt ?? new Date().toISOString(),
    updatedAt: dto.updatedAt ?? dto.createdAt ?? new Date().toISOString(),
  };
}

/**
 * La remise consentie au comptoir. **En centimes**, comme tout montant.
 *
 * ⚠️ C'est le seul montant que la caisse envoie ; le reste du panier est
 * retarifé côté serveur. Le motif est obligatoire : `order_discounts.label`
 * l'est en base, et une remise sans raison ne se relit pas au bilan.
 */
export interface OrderDiscount {
  readonly amountCents: number;
  readonly label: string;
}

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  list(eventId: string): Observable<ApiOrder[]> {
    return this.http.get<ApiOrder[]>(`${this.baseUrl}/events/${eventId}/orders`);
  }

  sellable(eventId: string): Observable<ApiSellableLine[]> {
    return this.http.get<ApiSellableLine[]>(`${this.baseUrl}/events/${eventId}/sellable`);
  }

  checkout(
    eventId: string,
    lines: readonly CheckoutLine[],
    clientId?: number | null,
    paymentMethod: PaymentMethod = 'cash',
    sponsorshipCategoryId?: number | null,
    discount?: OrderDiscount | null,
  ): Observable<ApiOrder> {
    return this.http.post<ApiOrder>(`${this.baseUrl}/events/${eventId}/orders`, {
      lines,
      paymentMethod,
      ...(clientId ? { clientId } : {}),
      ...(sponsorshipCategoryId ? { sponsorshipCategoryId } : {}),
      ...(discount ? { discount } : {}),
    });
  }

  setStatus(orderId: number, status: OrderStatus): Observable<ApiOrder> {
    return this.http.patch<ApiOrder>(`${this.baseUrl}/orders/${orderId}/status`, { status });
  }

  cancel(orderId: number): Observable<ApiOrder> {
    return this.http.delete<ApiOrder>(`${this.baseUrl}/orders/${orderId}`);
  }
}
