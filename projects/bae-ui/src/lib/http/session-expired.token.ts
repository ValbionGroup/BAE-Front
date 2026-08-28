import { InjectionToken } from '@angular/core';

export const SESSION_EXPIRED_HANDLER = new InjectionToken<() => void>('SESSION_EXPIRED_HANDLER');
