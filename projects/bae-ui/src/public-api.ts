/**
 * Surface publique de `@bae/ui` — la frontière entre la bibliothèque partagée et
 * les deux applications qui la consomment.
 *
 * Ce qui n'est pas réexporté ici n'est pas censé être importé depuis une
 * application : la bibliothèque n'est pas construite (les sources sont
 * consommées telles quelles), donc rien n'empêche techniquement un import
 * profond — c'est ce fichier, et lui seul, qui dit ce qui est du contrat.
 *
 * Règle d'admission : un élément n'entre ici que s'il est **indépendant du
 * métier**. Un composant qui connaît un store, un modèle de domaine ou une page
 * reste dans son application.
 */

// Primitives d'interface
export * from './lib/components/ui/avatar/avatar';
export * from './lib/components/ui/badge/badge';
export * from './lib/components/ui/btn/btn';
export * from './lib/components/ui/card/card';
export * from './lib/components/ui/checkbox/checkbox';
export * from './lib/components/ui/field/field';
export * from './lib/components/ui/input/input';
export * from './lib/components/ui/kbd/kbd';
export * from './lib/components/ui/logo/logo';
export * from './lib/components/ui/otp-input/otp-input';
export * from './lib/components/ui/qr-code/qr-code';
export * from './lib/components/ui/skeleton/skeleton';
export * from './lib/components/ui/textarea/textarea';
export * from './lib/components/ui/toggle/toggle';

// Panneau de détail
export * from './lib/components/detail-sheet/detail-sheet';

// Tableau
export * from './lib/components/table/table';
export * from './lib/components/table/table.types';
export * from './lib/components/table/table-content/table-content';
export * from './lib/components/table/table-cells/table-cell.model';
export * from './lib/components/table/table-cells/table-cell-label/table-cell-label';
export * from './lib/components/table/table-cells/table-cell-number/table-cell-number';
export * from './lib/components/table/table-cells/table-cell-pill/table-cell-pill';
export * from './lib/components/table/table-cells/table-cell-quantity/table-cell-quantity';
export * from './lib/components/table/table-cells/table-cell-text/table-cell-text';

// Couches flottantes
export * from './lib/directives/floating/floating.directive';
export * from './lib/components/dropdown/dropdown.models';
export * from './lib/components/dropdown/dropdown.service';
export * from './lib/components/dropdown/dropdown-container/dropdown-container';
export * from './lib/components/tooltip/tooltip.models';
export * from './lib/components/tooltip/tooltip.service';
export * from './lib/components/tooltip/bae-tooltip.directive';
export * from './lib/components/tooltip/tooltip-container/tooltip-container';
export * from './lib/components/toast/toast.models';
export * from './lib/components/toast/toast.service';
export * from './lib/components/toast/toast-container/toast-container';

// HTTP — les six intercepteurs se posent dans cet ordre, cf. `app.config.ts`
export * from './lib/http/api-url.token';
export * from './lib/http/api-response.model';
export * from './lib/http/pagination';
export * from './lib/http/session-expired.token';
export * from './lib/http/interceptors/api-case-request/api-case-request-interceptor';
export * from './lib/http/interceptors/auth/auth-interceptor';
export * from './lib/http/interceptors/csrf/csrf-interceptor';
export * from './lib/http/interceptors/error/error-interceptor';
export * from './lib/http/interceptors/api-case-response/api-case-response-interceptor';
export * from './lib/http/interceptors/api-envelope/api-envelope-interceptor';

// Thème et utilitaires
export * from './lib/theme/theme-service';
export * from './lib/utils/api-date';
export * from './lib/utils/api-error';
export * from './lib/utils/case-converter';
export * from './lib/utils/external-navigation';
export * from './lib/utils/money';
export * from './lib/utils/pickup-slots';
export * from './lib/utils/subscription';
