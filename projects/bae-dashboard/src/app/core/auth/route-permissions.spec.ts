import { AppRoutes } from '#app/app-routes.const';
import { permissionFor } from './route-permissions';

describe('route-permissions', () => {
  it('garde la page analyse comme les autres écrans d’argent', () => {
    expect(permissionFor(AppRoutes.analyse)).toContain('transaction:read');
  });
});
