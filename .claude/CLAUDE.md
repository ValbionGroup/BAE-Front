You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

---

## Project Context

**BAE** — gestion d'événements et de stocks pour une association.
Frontend Angular 21 standalone, backend **AdonisJS 6 + Lucid** dans le dépôt voisin `../BAE-Back`,
servi sur `localhost:3333` (`environment.apiUrl` = `http://localhost:3333/v1`).

Stack : Angular 21, NgRx Signals, Tailwind CSS 4, Lucide Icons, date-fns 4, RxJS 7.

### Backend — repères essentiels

- `start/routes.ts` est un index mince ; les routes sont déclarées explicitement dans
  `start/routes/*.ts` par domaine (auth, members, catalog, stocks, events, coordination,
  billing, system). Pas de `router.resource().apiOnly()`.
- `database/schema.ts` est **auto-généré** par `node ace migration:run` — ne jamais l'éditer.
  Les modèles étendent ses classes `XxxSchema`.
- `.adonisjs/server/controllers.ts` (importé via `#generated/controllers`) est auto-généré
  par `node ace make:controller`.
- Toute réponse passe par `ctx.serialize()` → enveloppe `{ data }`. Cf. `BAE-Back/API.md`.
- `app/middleware/case_converter_middleware.ts` fait la conversion dans les deux sens :
  entrée `snake_case` → `camelCase`, sortie `camelCase` → `snake_case`. Les contrôleurs
  travaillent donc **en camelCase**.
- Piège Adonis : déclarer `router.put(path, …)` et `router.patch(path, …)` séparément sur la
  même action fait planter le boot (nom de route auto-dérivé en double). Utiliser
  `router.route(path, ['PUT', 'PATCH'], [ctrl, 'action'])`.
- Les colonnes `decimal` reviennent en **string** (driver SQL), pas en number — convertir
  explicitement avant tout calcul.

> Si une page front existe sans endpoint correspondant, c'est le back qui est incomplet :
> on ajoute l'endpoint ou on laisse la page en mock, on ne supprime pas le panneau.

---

## Architecture

```
src/app/
├── core/
│   ├── services/      auth, events, stocks, coordination, rsvp, tokens,
│   │                  orders, recipes, page-header, theme, websocket
│   ├── store/         auth/ (NgRx reducer/effects)
│   │                  events.store.ts, stocks.store.ts, coordination.store.ts,
│   │                  caisse.store.ts, analyse.store.ts, home-data/*
│   ├── guards/        auth-guard, guest-guard
│   ├── interceptors/  auth, api-case-request, api-case-response, error
│   ├── models/        event, user, auth-state, auth-tokens, rsvp, order,
│   │                  analyse, global, endpoint, error, ws-message
│   └── tokens/        api-url.token.ts
├── shared/
│   ├── components/ui/ btn, input, field, badge, avatar, card, checkbox,
│   │                  toggle, kbd, logo, skeleton
│   ├── components/table/   bfd-table (ColumnType enum)
│   ├── components/modal/   modal.service + shells + modales métier
│   ├── components/toast/   toast.service
│   ├── components/dropdown/
│   ├── components/tooltip/
│   └── utils/         case-converter.ts, base-function.ts
└── pages/
    ├── app-shell/     sidebar + topbar
    ├── authed/        presences, stocks, coordination, logistique, caisse,
    │                  tickets, adherents, equipe, etats, analyse, paiements,
    │                  notifications, precommandes-admin, home, soiree, recettes
    ├── guest/         login
    ├── public/        precommandes
    └── states/        not-found
```

### Path aliases

- `#core/*` → `src/app/core/*`
- `#shared/*` → `src/app/shared/*`
- `#pages/*` → `src/app/pages/*`
- `#app/*` → `src/app/*`

---

## HTTP Interceptors (order matters)

1. **apiCaseRequestInterceptor** — convertit les clés du body/params en `snake_case` avant envoi
2. **authInterceptor** — ajoute `Authorization: Bearer <token>` vers l'API
3. **errorInterceptor** — gestion globale des erreurs HTTP
4. **apiResponseCaseInterceptor** — convertit les clés de la réponse en `camelCase`
5. **apiEnvelopeInterceptor** — déballe l'enveloppe API : succès `{ data, meta }` → body = `data` ; erreur `{ error: { code, message } }` → `HttpErrorResponse.error` = `{ code, message }` (types dans `core/models/api-response.model.ts`)

> Les body reçus par le backend arrivent toujours en `snake_case`. En déstructurant `req.body`, utiliser les clés snake_case côté Express.
> Côté Express, toute donnée issue de la DB doit passer par `serialize` / `model.serialize()` avant d'être renvoyée dans `data` — ne jamais renvoyer le modèle brut.
> Les dates Luxon (`DateTime`) doivent être sérialisées avec `.toISO()` (string ISO 8601), jamais l'objet `DateTime` brut : le front les type en `string`, et le convertisseur de casse récurserait dans les internes Luxon (`loc`, `c`, `_zone`…).

---

## State Management

Deux systèmes coexistent :

- **NgRx Store classique** : auth uniquement (reducer, actions, effects, selectors dans `core/store/auth/`)
- **NgRx Signal Store** (`signalStore`) : tous les autres domaines — `withState`, `withMethods`, `patchState`, `providedIn: 'root'`

Pattern Signal Store :

```typescript
// state shape
{ loading: LoadingStatus; loadError: string | null; items: Item[] }
// LoadingStatus = 'init' | 'loading' | 'loaded' | 'refreshing' | 'error'
```

### Stores Signal existants

| Store               | State principal                            | Méthodes clés                                               |
| ------------------- | ------------------------------------------ | ----------------------------------------------------------- |
| `EventsStore`       | `events: Record<string, EventDetail>`      | `load()`, `loadEventRoster()`, `setMemberPresence()`        |
| `StocksStore`       | `products: StockProduct[]`                 | `load()`, `getBatches(id, showEmpty?)`, `discardBatch()`    |
| `CoordinationStore` | `events`, `assignments`, `eventJobs`       | `load()`, `createEvent()`, `updateEvent()`, `deleteEvent()` |
| `CaisseStore`       | `cart`, `sessionEventId`, `activeCategory` | `addToCart()`, `decrementItem()`, `startSession()`          |
| `AnalyseStore`      | `kpis`, `chart`, `soirees`, `prediction`   | computed-only                                               |

---

## Stocks — Domaine métier

### Types (`stocks.types.ts`)

```typescript
type DlcStatus = 'none' | 'ok' | 'soon' | 'expired';
type SortKey = 'name' | 'qty' | 'dlc' | 'category';
type SortDir = 'asc' | 'desc';

interface StockProduct {
  id;
  name;
  unit;
  brand;
  categoryId;
  categoryName;
  totalQty;
  batchCount;
  nearestDlc: string | null;
  nearestDlcStatus: DlcStatus;
  expiredBatchCount;
  soonBatchCount;
}
interface StockBatchRow {
  id;
  restockId;
  initialQty;
  remainingQty;
  dlcLabel: string | null;
  dlcStatus: DlcStatus;
  openedAt: string | null;
}
```

### API stocks (`StocksService`)

| Méthode                                        | Endpoint                                    | Notes                                          |
| ---------------------------------------------- | ------------------------------------------- | ---------------------------------------------- |
| `getAll()`                                     | `GET /stocks`                               | Agrégat par produit                            |
| `getBatches(id, showEmpty?)`                   | `GET /stocks/:id/batches?showEmpty=true`    | `showEmpty` défaut `false` → exclut lots vides |
| `discardBatch(goodsId, batchId, remainingQty)` | `POST /stocks/:id/batches/:batchId/discard` | body camelCase → snake_case par interceptor    |

### Page stocks (`pages/authed/stocks/stocks.ts`)

Signals locaux :

- `searchQuery`, `activeCategory`, `sortKey`, `sortDir` — filtres/tri
- `selectedId` — produit actif dans le panneau droite
- `selectedBatches`, `batchesLoading` — lots du panneau détail
- `showEmptyBatches` — toggle "Afficher les lots vides"
- `selectedIds: ReadonlySet<number>` — sélection multiple (multi-select)

Computed :

- `visibleProducts` — filtre catégorie + recherche + tri sur `store.products()`
- `kpis` — 4 KPIs (périmés, proche péremption, produits en stock, total lots)
- `categoryTabs` — `['Tous', ...categories dynamiques]`
- `allSelected`, `someSelected` — état de la sélection multiple

Rechargement des lots : un `effect()` réagit à `selectedId()` + `showEmptyBatches()` → appelle `store.getBatches()` automatiquement.

---

## Shared UI Components

Tous sont **standalone**, `ChangeDetectionStrategy.OnPush`, utilisent `input()` / `output()`.

| Sélecteur      | Inputs clés                                                     | Outputs           |
| -------------- | --------------------------------------------------------------- | ----------------- |
| `bfd-btn`      | `kind`, `size`, `icon`, `iconRight`, `full`, `disabled`, `type` | `clicked`         |
| `bfd-input`    | `icon`, `placeholder`, `size`                                   | `valueChange`     |
| `bfd-badge`    | `kind`, `dot`                                                   | —                 |
| `bfd-card`     | `padding`                                                       | —                 |
| `bfd-checkbox` | `checked`, `disabled`                                           | `change: boolean` |
| `bfd-toggle`   | `on`, `label`, `disabled`                                       | `change: boolean` |
| `bfd-skeleton` | —                                                               | —                 |
| `bfd-avatar`   | —                                                               | —                 |

### Checkbox & Toggle — mode contrôlé vs CVA

Les deux composants supportent deux modes :

- **Contrôlé** (`[checked]` / `[on]` + `(change)`) : `cvaValue` reste `null`, `internalChecked`/`internalOn` lit l'input signal.
- **CVA** (`ngModel` / `formControl`) : `writeValue()` active `inCvaMode = true` et met à jour le signal `cvaValue`.

> Ne pas mélanger les deux modes sur la même instance. Le signal `cvaValue` est `null` en mode contrôlé — c'est intentionnel.

---

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when uncertain

---

## Angular Best Practices

- Always use standalone components — do NOT set `standalone: true` (default in Angular 20+)
- Use signals for state management; `computed()` for derived state
- Implement lazy loading for feature routes
- Do NOT use `@HostBinding` / `@HostListener` — use `host: {}` in `@Component` instead
- Use `NgOptimizedImage` for all static images (not for inline base64)
- Do NOT use `ngClass` or `ngStyle` — use `[class]` and `[style]` bindings
- Prefer Reactive Forms over Template-driven
- Use `inject()` for DI, not constructor injection
- Set `changeDetection: ChangeDetectionStrategy.OnPush` on every component
- Use native control flow `@if`, `@for`, `@switch` — not `*ngIf`, `*ngFor`
- Do not assume globals like `new Date()` are available in templates

---

## Accessibility

- Must pass all AXE checks
- Must follow WCAG AA minimums (focus management, color contrast, ARIA attributes)

---

## Services

- `providedIn: 'root'` for singletons
- Single responsibility per service
- Use `inject()` for dependencies
