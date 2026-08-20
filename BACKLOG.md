# BAE — exécution des tâches 45, 7, 9, 5 puis séquençage du bloc A

## ✅ Livré le 2026-08-20 — lots 45, 7, 9 et 5

Les quatre tâches sont faites. **Le travail back n'est pas commité** : il faut d'abord créer une
branche depuis `feat/paiement-lydia` (la création a été refusée par les permissions en séance).

| Lot    | Livré                                                                                                                                                                                                                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **45** | `pre_order_items.list_price_cents` + `pre_orders.discount_percent` (migration `1788000000000`), prix et pourcentage portés par l'`intent` du paiement, `buildView` corrigé, `applyDiscount` centralisé. Corrige aussi le total surfacturé à l'écran client (700 affiché pour 630 encaissé). |
| **7**  | `client_activity_service.activityOf()`, exposé par `ClientsController.show`. Tuiles Précommandes et Dépensé branchées, **tuile « Solde courant » retirée**.                                                                                                                                 |
| **9**  | Permission `payment:read`, route `GET /payments`, `PaymentsController.index` (vue staff), section « Paiements en ligne » sur la page `paiements`, note de pied de page périmée supprimée.                                                                                                   |
| **5**  | La modale existait mais **ne fonctionnait pas** : voir ci-dessous. Réparée et couverte.                                                                                                                                                                                                     |

## ✅ Bloc A1 — nettoyage sans risque

| #      | État                                                                                                                                                                                                                                            |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **2**  | `ExternalNavigation` remplace `window.location.href` dans les deux pages de login, avec un test par zone sur le paramètre `app=`.                                                                                                               |
| **3**  | `<bae-toast-container />` ajouté à `bae-public` : tout toast public était muet.                                                                                                                                                                 |
| **16** | `CartRow`, `SupplierTotal` et `ScannerUnknownModal` supprimés (vérifiés sans référence). L'appel `svc.getGoods()` et l'état `goods` retirés du `LogistiqueStore` — une requête par chargement que personne ne lisait ; quatre specs mis à jour. |
| **17** | **Rien à faire.** `LogistiqueAssignModal` **est utilisée** par `LogistiqueEvents` (`events.ts:33`), qui est routée. La note « restée factice » du handoff est périmée.                                                                          |
| **24** | **Déjà faite** par `2a8d492 fix(coordination): n'affirme plus une cause unique` (2026-08-06).                                                                                                                                                   |
| **30** | `.claude/CLAUDE.md` : arborescence des trois projets, alias réels, et sélecteurs `bfd-*` → `bae-*`.                                                                                                                                             |

Vérifié : typecheck vert, **807 tests, 0 échec** (639 dashboard, 82 public, 86 ui).

### Deux défauts trouvés en passant, et corrigés

1. **La modale de clôture de production était cassée depuis toujours.** Elle lisait
   `input.required()` dans son **constructeur** ; or les inputs sont appliqués après
   l'instanciation, donc la lecture levait (`NG0950`) et le `try/catch` la transformait en
   « Impossible de lire ce que la soirée a prélevé ». Aucune requête n'était jamais émise.
   Le chargement vit désormais dans un `effect()`, comme `recipe-edit-modal`.
   **Le seul test qui la couvrait était un `should create`** — d'où l'invisibilité du défaut.
2. **`public_catalog.spec.ts` verrouillait le bug de la tâche 45** sous le nom « calcule le total
   depuis le menu de la soirée ». Renommé d'après ce qu'il protège réellement (référence et état
   de paiement) ; l'assertion de total appartient désormais aux tests d'instantané.

### Reste à traiter, découvert en séance

| Sujet                                    | Détail                                                                                                                                                                                                                                                                            |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`mergeLines` absent des précommandes** | `intent.lines` n'est pas fusionné par produit, alors que `pre_order_items` a une PK `(pre_order_id, product_id)`. Deux lignes du même produit dans un même POST font **échouer l'insert au callback, après encaissement**. Correctif court, laissé hors périmètre faute d'accord. |
| **13 tests PDF en échec**                | `print_*`, `pdf_service`, `event_receivables/pdf` : `Error: The browser is already running for /tmp/claude-502/puppeteer_dev_chrome_profile-*`. Profils Chromium orphelins, échoue aussi **en isolation**, indépendant de ce lot.                                                 |
| **Formatage de `schema.ts`**             | `migration:run` le réécrit sans Prettier (241 lignes de bruit). Passer `prettier --write database/schema.ts` après chaque migration.                                                                                                                                              |

État de vérification : typecheck vert des deux côtés ; front **806 tests, 0 échec** (639 dashboard,
81 public, 86 ui) ; back **565 passés, 13 échecs** tous dans la famille PDF ci-dessus.

---

## Contexte de ce plan

L'inventaire en annexe (130 tâches) a été tiré des deux handoffs puis confronté au code.
Quatre tâches en étaient données « débloquées par des lots livrés depuis ». L'exploration
détaillée en a corrigé trois :

| #   | Annoncé    | Réalité vérifiée                                                                                                                                                                                                                                                                               |
| --- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5   | À faire    | **Déjà faite.** `shared/components/modal/production-return-modal/` (161 l. + template) existe, avec le radiogroup « En réserve / Au rebut », le plafonnement client sur `returnableQty` et un bouton d'impression ; ouverte par `closeNight()` (`live.ts:485`). Reste une **lacune de tests**. |
| 7   | Front seul | **Front + back.** Aucun endpoint n'agrège par client, et « Solde courant » n'a aucune définition en base (`grep credit\|solde\|balance\|wallet` : rien).                                                                                                                                       |
| 9   | Front seul | **Front + back.** `payments` porte la donnée, mais il n'existe **aucune route staff** ni permission `payment:read`. La page lit `/transactions`, pas `/payments`.                                                                                                                              |
| 45  | À faire    | **Exacte**, et elle corrige un second bug plus visible : `buildView` somme le prix public brut sans appliquer les remises, donc « mes précommandes » affiche au client **plus que ce qu'il a payé** (700 au lieu de 630). Aucun test ne couvre ce chemin.                                      |

### Décisions arrêtées

1. **45** — figer le **prix public par ligne** (`pre_order_items.list_price_cents`) et le
   **pourcentage total appliqué** (`pre_orders.discount_percent`), plutôt que de copier le
   couple `(list, unit)` d'`order_products` : la remise précommande est un pourcentage global
   avec un arrondi unique sur le sous-total, et la ventiler par ligne exigerait d'inventer une
   règle de répartition des centimes.
2. **7** — « Dépensé » = ventes au comptoir + précommandes payées. La tuile
   **« Solde courant » est retirée** : rien en base ne la fonde.
3. **9** — route staff en **lecture seule**, exposant les trois champs aujourd'hui écrits et
   jamais relus (`provider_reference`, `transaction_identifier`, `paid_at`).
4. **Branche** — le back s'empile sur `feat/paiement-lydia` (6ᵉ PR de la pile) ; la pile n'est
   pas mergée dans ce lot.

### Préalable d'environnement

`bae-postgres-dev` **n'est pas lancé**. Or `node ace migration:run` régénère
`database/schema.ts` **depuis la base connectée**, et le handoff avertit qu'il y aspire les
colonnes des autres branches. Donc : démarrer le conteneur, et régénérer depuis une base
conforme à `feat/paiement-lydia` (au besoin `migration:fresh` sur une base jetable), puis
vérifier le diff de `schema.ts` avant de le commiter.

---

## Lot 1 — Tâche 45 : instantané de prix des précommandes

Le chemin de création est en **deux temps** : `quotePreOrder()` calcule le prix à l'ouverture
du paiement, puis **le jette** ; `fulfilPreOrder()` écrit `pre_order_items` au callback Lydia,
depuis `intent.lines` qui ne porte que `productId` + `quantity`.

**Conséquence structurante :** le prix et le pourcentage doivent être **portés par l'`intent`**,
pas recalculés au callback — `fastPassOf(userId, now)` peut avoir expiré entre les deux, et les
pourcentages viennent de variables d'environnement qui changent entre deux déploiements.

1. **Migration** — transposer `database/migrations/1787600000000_add_price_snapshot_to_order_products_table.ts`,
   qui est le cas exactement analogue : `alterTable` avec `integer(...).notNullable().defaultTo(0)`,
   puis backfill en `this.defer(async (db) => db.rawQuery(...))`. Reprendre son piège documenté :
   les jointures passent par le `WHERE`, jamais par un `JOIN … ON`, car Postgres interdit de
   référencer l'alias de la table mise à jour. La transposition joint via `pre_orders.event_id`
   au lieu de `orders.event_id`.
   - `pre_order_items.list_price_cents` (integer, centimes — convention du dépôt, cf.
     `order_products.*_cents`, `sponsorship_prices.price_cents`)
   - `pre_orders.discount_percent` (integer)
2. **`app/models/pre_order.ts`** — ajouter `list_price_cents` à `pivotColumns`, sinon la colonne
   est **silencieusement absente** des lectures (`pre_order_items` est un pivot `manyToMany`, il
   n'existe pas de modèle `PreOrderItem`).
3. **`app/services/pre_order_quote_service.ts`** — faire retourner à `quotePreOrder()` les lignes
   tarifées et le pourcentage retenu, en plus du montant.
4. **`app/controllers/account_payments_controller.ts`** — verser ces deux informations dans
   l'`intent`.
5. **`app/services/payment_service.ts` (`fulfilPreOrder`)** — écrire les deux colonnes. Tolérer
   leur absence pour les paiements `pending` déjà en base, dont l'`intent` est à l'ancien format
   (repli sur le menu courant).
6. **`app/services/account_purchase_service.ts` (`buildView`)** — lire l'instantané au lieu de
   `menusOf()`, et appliquer `discount_percent` : `total = subtotal − round(subtotal × pct / 100)`,
   ce qui reproduit `quotePreOrder()` au centime et corrige le second bug.

**À signaler, même code path, défaut sévère :** `intent.lines` n'est pas fusionné par produit
(pas d'équivalent du `mergeLines()` des commandes), alors que `pre_order_items` a une PK
`(pre_order_id, product_id)`. Deux lignes du même produit dans un même POST font donc **échouer
l'insert au callback, après encaissement**. Un `mergeLines` dans `quotePreOrder` coûte quelques
lignes ; je le propose mais ne l'ajoute pas sans ton accord.

**Tests** — `tests/functional/order_price_snapshot.spec.ts` est le modèle transposable presque
tel quel (il double le prix de la soirée _après_ la vente et vérifie que le total ne bouge pas).
`buildView` n'a **aucun test** aujourd'hui : les deux à écrire sont « le prix d'une précommande
ne suit pas le menu quand il change » et « le total affiché égale le montant encaissé ». Poser
`preOrderCloseLeadHours` sur la soirée dans les fixtures, comme le fait déjà
`account_pre_order_payment.spec.ts`, pour ne pas dépendre de l'environnement de qui exécute.

---

## Lot 2 — Tâche 7 : tuiles adhérents

Dépend du lot 1 : le « dépensé en précommandes » devient exact une fois l'instantané posé.

- **Back** — fonction d'agrégat batch à côté de `subscriptionsByUser()`
  (`app/controllers/clients_controller.ts:39`), branchée sur **`show` seulement** : les tuiles
  vivent dans `ClientDetail`, donc `index` et `summary` ne changent pas. Reprendre le motif
  anti-N+1 de `subscriptionsByUser`, et celui de `event_summary_service.ts:51-64` pour la somme
  `unit_price_cents × quantity`.
  - précommandes : `COUNT(*) FROM pre_orders WHERE user_id = ? AND status <> 'cancelled'`
  - dépensé : ventes comptoir via `orders.client_id` (hors `cancelled`) **+** précommandes payées
  - ⚠️ unités : `order_products.*_cents` et `event_products.price` en **centimes** ;
    `transactions.amount` est un `decimal` en **euros** transitant en **string**.
- **Front** — `adherents.ts:233-242` : brancher `Précommandes` et `Dépensé`, **supprimer la tuile
  « Solde courant »**. Mettre à jour `adherents.spec.ts:170-178`, qui verrouille aujourd'hui le
  `'—'`, et corriger le commentaire de `adherents.ts:227-232` dont la seconde moitié est périmée.

---

## Lot 3 — Tâche 9 : liste staff des paiements

- **Back** — permission `payment:read` (catalogue RBAC + seeder), route
  `GET /payments` dans `start/routes/billing.ts` (groupe `auth()` + `audience('member')`),
  contrôleur `PaymentsController.index`. Exposer `orderRef`, `status`, `kind`, `amountCents`,
  `providerReference`, `transactionIdentifier`, `paidAt`, `expiresAt`, et le nom du payeur.
  `toPaymentView` (`payment_service.ts:33`) est la vue **client** et n'expose que cinq champs :
  ne pas la réutiliser, en écrire une vue staff distincte.
  Les statuts font autorité dans la migration `1787900000001_create_payments_table.ts`
  (`pending`, `paid`, `refused`, `cancelled`, `expired`) — il n'existe **aucun enum TS**.
- **Front** — la page lit `/transactions` et garde ses trois KPI ; ajouter la section des
  paiements en ligne. **Supprimer la note de pied de page** `paiements.html:99-112`, qui affirme
  que le rapprochement attend une refonte de `transactions` : `payments` porte déjà `status` et
  la référence fournisseur.
- ⚠️ La nouvelle permission n'existera pas en base tant que les seeders RBAC ne sont pas rejoués
  (tâches 58/59 de l'annexe) : sans ça la route renvoie **403 à tout le monde**.

---

## Lot 4 — Tâche 5 : combler les tests de la modale existante

Aucun code de production à écrire. La spec fait 54 lignes et ne couvre ni `submit()`, ni la
distinction réserve/rebut, ni le refus back. Trois tests, trois défauts distincts :

1. **Le rebut n'envoie rien.** Une régression ici recréditerait en stock ce qui a été jeté —
   silencieusement, et sans qu'aucun autre test ne tombe. Le back n'écrit **rien** pour une ligne
   omise ; c'est toute la sémantique.
2. **Le garde `tooMuch`** empêche d'envoyer plus que `returnableQty` : sans lui l'utilisateur
   reçoit un 400 `E_RETURN_EXCEEDS_PICKED` là où l'écran pouvait le dire avant.
3. **Sur refus back, la modale reste ouverte et conserve les saisies.** C'est le comportement
   qu'un `close()` trop hâtif casserait, en faisant perdre le travail de saisie.

Suivre le patron du dépôt : garder la promesse (`const submitted = modal.submit()`), assertionner
`req.request.body` **avant** `flush`, puis `await submitted` ; `http.expectNone(url)` pour le cas
« tout au rebut » ; et le helper `settle = () => new Promise(r => setTimeout(r, 0))` déjà utilisé
dans `live.spec.ts:12`, parce qu'en zoneless `whenStable()` ne suit pas les promesses nues.

---

## Vérification

- Back : `node ace test` (⚠️ tourne sur la **base de dev**, faute de `.env.test` — tâche 63 de
  l'annexe) ; vérifier le diff de `database/schema.ts` après régénération.
- Front : `pnpm test` (ou `./node_modules/.bin/ng test bae-dashboard`) — `pnpm` refuse de démarrer
  hors TTY tant que `node_modules` est désynchronisé du lockfile, faire `pnpm install` d'abord.
- Typecheck : `./node_modules/.bin/tsc --build tsconfig.json` (vert au départ de ce lot).
- Bout en bout, tâche 45 : ouvrir une précommande, encaisser via le faux client Lydia
  (`LYDIA_DRIVER=fake`), **modifier le prix au menu**, puis relire « mes précommandes » — le
  total doit être inchangé et égal au montant encaissé.
- Tâches 7 et 9 : à l'écran, avec un compte portant les permissions requises **après** avoir
  rejoué les seeders RBAC.

---

## Ensuite — le bloc A, séquencé

29 items, dont 5 (faite), 7 et 9 (ci-dessus). Reste 26, à prendre dans cet ordre :

| Lot                                           | Tâches                                                                                                                                                                                                                                                                | Pourquoi dans cet ordre                                                                                                                                                                                                      |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A1 — Nettoyage sans risque**                | 2 (`ExternalNavigation` dans les 2 logins), 3 (`bae-toast-container` dans `bae-public`), 16 (code mort), 17 (`LogistiqueAssignModal` : retirer ou brancher), 24 (`describeMatching`), 30 (`CLAUDE.md` périmé)                                                         | Aucune dépendance, aucun arbitrage, et ça réduit le bruit avant tout le reste. La 3 est un piège actif : tout toast public est muet aujourd'hui.                                                                             |
| **A2 — a11y, harnais d'abord**                | 18 (axe-core), puis 4 (`bfd-btn` : `id`, `aria-*`, `focus-visible`), 15 (focus perdu pendant l'écriture), 23 (thème : les trois choix)                                                                                                                                | Installer le harnais **avant** les correctifs, sinon on corrige à l'aveugle alors que les règles du projet exigent qu'AXE passe. La 4 supprime les contournements en `<button>` natif de `home.html` et `my-presences.html`. |
| **A3 — Branchements sur endpoints existants** | 6 (présences à 3 états), 11 (2ᵉ bouton « Fiche logistique »), 10 (canaux hors `in_app`), 8 (borne de retrait → scan partagé), 12 (pagination des logs), 28 (`adherents` sur `clients`), 29 (masquer le mot de passe en SSO pur), 27 (gestes désactivés des adhérents) | Le back est déjà là dans tous les cas. 27 en dernier du lot : c'est le seul dont il faut vérifier les endpoints un par un.                                                                                                   |
| **A4 — Correctness**                          | 13 (course refresh/écriture dans `toggleVoucherUsed` et `createVoucher`), 14 (texte dédié au 403)                                                                                                                                                                     | Fenêtre étroite mais un id en double casse `@for … track`.                                                                                                                                                                   |
| **A5 — Chantiers structurants**               | 19 (fusionner les deux modélisations de soirée), 20 (composant de scan mutualisé), 26 (écarts au design system)                                                                                                                                                       | À faire après A1-A4 : ils touchent large, et 19 réduit le coût de tout ajout ultérieur (« un ajout se paie en six déclarations »). 20 évite d'écrire quatre fois le même code caméra.                                        |
| **A6 — Vérifications humaines, en continu**   | 21 (les 7 écrans publics, `soiree/bilan`, Équipe, bons d'achat avec **deux** comptes), 22 (bout-en-bout du logout SSO)                                                                                                                                                | Non bloquantes, à intercaler. La 21 avec deux comptes compte double : c'est le comportement d'un compte **sans** la permission qu'il faut voir.                                                                              |
| **Différée**                                  | 25 (`modal/` vers `bae-ui`)                                                                                                                                                                                                                                           | Différée volontairement : à faire le jour où `bae-public` aura une modale.                                                                                                                                                   |

⚠️ **Non inclus dans le bloc A** mais préalable à 20 : la 97 (`@zxing/browser`) est un arbitrage
de dépendance — Firefox et Safari desktop n'ont pas `BarcodeDetector`. À trancher avant de
mutualiser le composant de scan, pas après.

---

---

# Annexe — inventaire complet des 130 tâches

Les deux handoffs (3102 + 2060 lignes) sont des journaux cumulatifs : un lot ultérieur ferme
des points ouverts d'un lot antérieur **sans les rayer sur place**. Ils s'arrêtent au §39
(2026-08-18), alors que deux lots ont atterri depuis — **responsive mobile** (v0.7.0) et
**paiement Lydia** (v0.8.0). Le but de ce document est de dire, pour chaque tâche encore
ouverte, si elle est **faisable directement** ou **ce qui la bloque**.

Chaque ligne porte sa source (`H1 §x` = HANDOFF.md, `H2 §x` = HANDOFF2.md). Les items du
bloc J sont **déjà faits** : vérifiés dans le code, contre ce que le handoff affirme.

---

## Corrections d'état, vérifiées dans le code

| Fait vérifié                                                                                                                                                                                                  | Conséquence                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Back : **5 PR ouvertes, 0 mergée**. `main` back n'a qu'`orders` (#26). Pile **linéaire** : `main → #27(19) → #28(28) → #33(38) → #35(56) → #37(74)`, 0 commit de retard.                                      | Merger **#37 seule** fait atterrir les cinq. Tâche 1.                                         |
| `POST /pre-orders` **existe** (`start/routes/public.ts:25`, `AccountPayments.preOrder`, garde `audience('client')`).                                                                                          | Le « maillon bloquant » de tout le §36/§38/§39 **est levé**.                                  |
| Lot Lydia : table **`payments`** (`status`, `providerReference`, `expiresAt`, `orderRef`, `intent`, `provider`, `transactionId`), webhook, confirmation idempotente, expiration.                              | §10 largement livré. La « refonte de `transactions` » (§10.2) est **contournée, pas faite**.  |
| `TicketSchema` + `TicketMessageSchema` + 5 routes existent.                                                                                                                                                   | Contradiction H2 §33.1 (« arbitrage ouvert ») vs §33.2 (« construit ») → **construit**.       |
| `GET /events/:id/production-returns` **existe** (`ProductionRuns.returnState`).                                                                                                                               | H2 §32 « le seul blocage réel » → **levé**. Débloque la modale de clôture.                    |
| PrimeNG : absent de `package.json` **et** plus référencé.                                                                                                                                                     | H1 §0 septies « `main` ne compile pas depuis un clone neuf » → **périmé**. Typecheck vert.    |
| `DB_PORT=5432` partout (`.env.example`, `docker-compose*.yml`).                                                                                                                                               | H1 §8 (« 3306 est correct, ne le corrigez pas en 5432 ») est **faux et activement trompeur**. |
| Aucun stockage de fichiers (`@adonisjs/drive`/`flydrive`/`aws-sdk` absents).                                                                                                                                  | H2 §23.1 confirmé bloqué.                                                                     |
| `config/mail.ts` : « Aucun SMTP n'est encore fourni […] Aucun code à changer. »                                                                                                                               | Demande externe pure.                                                                         |
| `goods` : pas de colonne de méthode de stockage (a `barcode`). `events` : pas de colonne `type`. `pre_order_items` : pas de colonne de prix. Pas de contrainte unique `(user_id, event_id)` sur `pre_orders`. | Tâches 44, 58, 45, 46.                                                                        |
| Workspace = monorepo `projects/{bae-dashboard,bae-public,bae-ui}`, `src/` n'existe plus.                                                                                                                      | `.claude/CLAUDE.md` (qui documente `src/app/…`) est **périmé**. Tâche 30.                     |

---

## Bloc 0 — Répare une casse existante

| #   | Tâche                                                                                                          | Portée | Faisable ?                                                                                                                                                                                                                                                                             |
| --- | -------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Merger la pile de PR back (#27 adhérents, #28 SSO, #33 order-serve, #35 public-prereqs, #37 Lydia) dans `main` | BACK   | **Oui, directement** — pile linéaire, fast-forward. Seule décision : merger #37 d'un coup (74 commits, 5 domaines) ou les cinq en séquence. Tant que ce n'est pas fait, `adhérents`, la zone publique et Lydia sont en 404 contre le back déployé. `H1 §0 quaterdecies, H2 §33.2 pt 2` |

---

## Bloc A — Faisable directement, front

| #   | Tâche                                                                                                                                                                               | Faisable ?                                                                                                                                    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 2   | Remplacer `window.location.href` en dur par `ExternalNavigation` dans les deux pages de login (`bae-dashboard/…/login.ts:123`, `bae-public/…/login.ts:55`) + tests                  | Oui. L'utilitaire existe déjà dans `bae-ui`. `H2 §39.6`                                                                                       |
| 3   | Ajouter `<bae-toast-container />` à `bae-public/src/app/app.html` (ne rend que `router-outlet` + `dropdown-container`)                                                              | Oui. Sans lui, tout toast public est muet silencieusement. `H2 §39.4/§39.6`                                                                   |
| 4   | `bfd-btn` : propager `id` et les `aria-*` jusqu'au `<button>` interne, reconduire `focus-visible:ring-2`                                                                            | Oui. Supprime les contournements en `<button>` natif de `home.html`/`my-presences.html`. `H1 §8, H2 §14`                                      |
| 5   | Modale de clôture de production « ce qui reste : réserve ou rebut »                                                                                                                 | **Oui — débloqué** : `GET production-returns` existe. `H2 §32 pt 4`                                                                           |
| 6   | Présences : afficher les **trois** états (le « pas encore répondu » se distingue visuellement)                                                                                      | Oui, le helper back `presenceStates` est livré. `H2 §19` (P4)                                                                                 |
| 7   | Tuiles Précommandes / Dépensé / Solde de la page adhérents, à `—`                                                                                                                   | **Oui — débloqué** : `orders.client_id` existe depuis le lot `orders`. `H1 §0 undecies`                                                       |
| 8   | Borne de retrait de `precommandes-admin` → composant de scan partagé                                                                                                                | Oui, `POST /qr/verify` existe et sert déjà la caisse. `H1 §0 septdecies`                                                                      |
| 9   | Rapprochement de la page `paiements`                                                                                                                                                | **Oui — débloqué** : `payments.status` + `providerReference` fournissent ce qu'attendait la « refonte de `transactions` ». `H1 §0 septdecies` |
| 10  | `notifications` : afficher les canaux autres que `in_app`                                                                                                                           | Oui. `H1 §0 septdecies`                                                                                                                       |
| 11  | Second bouton « Fiche logistique » (pied de carte de soirée) cliquable et sans effet → le brancher                                                                                  | Oui, les 7 PDF sont livrés. `H2 §31`                                                                                                          |
| 12  | Pagination des logs : `TeamService.getLogs()` doit envoyer `page`/`limit` ; gérer `metadata` chez les consommateurs (fil d'activité + « dernière activité » calculés sur 50 lignes) | Oui. `H1 §0 bis, §8`                                                                                                                          |
| 13  | Fermer la course refresh/écriture dans `toggleVoucherUsed` et `createVoucher` (compteur de génération sur `fetch()`)                                                                | Oui. Fenêtre étroite mais un id en double casse `@for … track`. `H1 §0 quinquies`                                                             |
| 14  | Texte dédié au 403 au lieu du message brut de l'API (« Missing permission: voucher:write ») ; faire primer « Accès restreint » sur `messageOf`                                      | Oui. `H1 §0 quinquies, §0 septies`                                                                                                            |
| 15  | Le bouton de bascule perd le focus clavier pendant l'écriture (`[disabled]`)                                                                                                        | Oui, a11y. `H1 §0 quinquies`                                                                                                                  |
| 16  | Code mort : `CartRow`, `SupplierTotal`, l'appel inutile `svc.getGoods()` dans `LogistiqueStore.fetch()`, `ScannerUnknownModal`                                                      | Oui. `H1 §0 sexies, §0 septies`                                                                                                               |
| 17  | `LogistiqueAssignModal` restée factice : la retirer **ou** la brancher, pas la laisser                                                                                              | Oui. `H1 §0 septies`                                                                                                                          |
| 18  | Installer un harnais **axe-core**                                                                                                                                                   | Oui — les règles du projet exigent qu'AXE passe, il n'est vérifié qu'à la lecture du markup. `H1 §8`                                          |
| 19  | Fusionner les deux modélisations concurrentes de la soirée (`ApiEvent`/`CoordinationEvent` vs `EventApiDto`/`EventData`)                                                            | Oui, chantier propre : « un ajout se paie en six déclarations ». `H2 §39.2/§39.6`                                                             |
| 20  | Mutualiser un **composant de scan réutilisable** (caisse Lydia, `stocks/scanner`, QR du BAE), avec deux boutons distincts                                                           | Oui. Sinon « quatre fois le même code caméra ». `H1 §10.5/§11` (P0 CDC)                                                                       |
| 21  | Vérifications à l'œil jamais faites : les 7 écrans publics, `soiree/bilan`, page Équipe, bons d'achat avec **deux** comptes (`Pole Log` + `Membre`)                                 | Oui. `H2 §36.8, H1 §0 decies/§0 quinquies`                                                                                                    |
| 22  | Vérifier le bout-en-bout du logout SSO à la main (le protocole n'est joué en test nulle part)                                                                                       | Oui. `H2 §39.1`                                                                                                                               |
| 23  | Vérifier que l'écran de préférences expose les **trois** choix de thème (`toggle()` ne revient jamais à `system`, qui est le défaut demandé)                                        | Oui. `H2 §22.5`                                                                                                                               |
| 24  | Reformuler `describeMatching()` (ses messages supposent que les membres non affectés sont courants, ce que la règle des ex æquo rend rare)                                          | Oui. `H1 §6`                                                                                                                                  |
| 25  | Sortir `shared/components/modal/` dans `bae-ui` (`modal-container` importe `RolesModal` en dur)                                                                                     | Oui mais **différé volontairement** : à faire le jour où `bae-public` aura une modale. `H2 §34.2`                                             |
| 26  | Relever les écarts `primitives.jsx`/`theme.jsx` ↔ implémentation Angular, et lire les maquettes des écrans non encore codés avant de les coder                                      | Oui, sous réserve d'accès au MCP `claude_design`. `H2 §14`                                                                                    |
| 27  | Adhérents : brancher les gestes désactivés (enregistrer une cotisation, modifier une fiche, renouveler, export CSV, import, « Contacter », tri)                                     | **Partiellement** — à vérifier endpoint par endpoint après la tâche 1. `H1 §0 undecies`                                                       |
| 28  | Brancher `adherents` sur `clients` et non `members` (colonne « promotion »)                                                                                                         | Oui. `H1 §4.4`                                                                                                                                |
| 29  | Masquer le panneau de changement de mot de passe pour un compte SSO pur (`password = null`)                                                                                         | Oui. `H1 §2.3`                                                                                                                                |
| 30  | Mettre à jour `.claude/CLAUDE.md` : il documente `src/app/…` et les alias `#core/*` → `src/app/core/*`, alors que le workspace est `projects/{bae-dashboard,bae-public,bae-ui}`     | Oui.                                                                                                                                          |

---

## Bloc B — Faisable directement, back

| #   | Tâche                                                                                                                                                                                                 | Faisable ?                                                                                                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 31  | Protéger `RolesController.destroy` / `DELETE /roles/:id` par les deux règles de hiérarchie et le garde anti-verrouillage                                                                              | Oui. Signalé **trois fois** sans être fait ; non atteignable depuis l'UI, donc silencieux. `H1 §0 bis/ter/quater`                                |
| 32  | Garder `/vouchers` (GET/POST/PUT/PATCH/DELETE) par permission — un bon d'achat est un objet **au porteur**                                                                                            | Oui. C'est la **seule exigence de sécurité explicite du CDC** (« verrouiller l'accès à la LOG »). `H2 §23.2` (P0)                                |
| 33  | Garder `DELETE /events/:id` et `DELETE /jobs/:id` par une permission (aujourd'hui `auth()` seul : un membre quelconque détruit une soirée et tout le travail d'affectation)                           | Oui. `H1 §8`                                                                                                                                     |
| 34  | Généraliser les gardes de permission au reste de l'API                                                                                                                                                | Oui, chantier large. **Préalable à la tâche 48** : masquer un menu dont la route n'est pas gardée est cosmétique. `H1 §0 quinquies, H2 §22.2`    |
| 35  | Purger les `logs` d'avant le 2026-08-06 (jetons d'accès en clair dans `meta.response`, lisibles avec `log:read`)                                                                                      | Oui. **Avant toute mise en production.** `H1 §8`                                                                                                 |
| 36  | Ajouter `/auth/keycloak/callback` à `log_redaction_service.ts` **et** l'exclure du `request_logger_middleware` (le `?code=` finirait en clair dans `logs.url`)                                        | Oui. `H1 §9.9`                                                                                                                                   |
| 37  | Rappel de péremption des stocks (`verb: 'stock.expiring'`)                                                                                                                                            | Oui — « presque gratuit » depuis le lot mailer. Le mail ne partira pas sans SMTP (tâche 100), le code est écrivable. `H1 §0 quindecies` (P1)     |
| 38  | Ajouter des `recordEvent()` sur les gestes qui le méritent (3 émetteurs aujourd'hui)                                                                                                                  | Oui. `H1 §0 octodecies`                                                                                                                          |
| 39  | Endpoint permettant au **bureau** de fixer la présence d'un autre membre — doit contourner son propre verrou, donc gardé par permission                                                               | Oui. `H1 §7.3`                                                                                                                                   |
| 40  | Table d'**événements de scan** (qui, quoi, quand, quelle soirée), distincte de `received_quantity`                                                                                                    | Oui. Base de l'historique client et de la fidélité. `H1 §11`                                                                                     |
| 41  | Faire consommer `product_category_service` par `ProductsController` (copie privée `primaryCategoryName`)                                                                                              | Oui — non migré parce que le fichier était pris par un autre chantier. `H1 §0 septies`                                                           |
| 42  | Centraliser côté back le calcul d'expiration d'une cotisation (`subscribed_at + duration`), aujourd'hui recalculé dans chaque écran                                                                   | Oui. Deux consommateurs. `H1 §4.1`                                                                                                               |
| 43  | Élaguer le seeder de permissions (`fetchOrCreateMany` n'insère jamais) **et** nettoyer les 8 permissions rescapées d'un ancien nommage (l'enregistrement échoue en 422)                               | Oui, le SQL de nettoyage est fourni dans le handoff. `H1 §0 octodecies`                                                                          |
| 44  | Colonne de **méthode de stockage** sur `goods` (frigo / congélateur / sec / cave) + le champ dans l'écran                                                                                             | Oui, une migration d'une colonne. C'est aussi la colonne « Emplacement » de la maquette stocks. `H2 §18.2` (P1)                                  |
| 45  | Instantané de prix sur `pre_order_items`                                                                                                                                                              | **Oui — débloqué** : `POST /pre-orders` existe. `H2 §38.10/§39.6`                                                                                |
| 46  | Contrainte d'unicité `(user_id, event_id)` sur `pre_orders` — sans elle un même compte consomme tout le plafond                                                                                       | Oui. `H2 §38.10`                                                                                                                                 |
| 47  | Vérifier que le contrôle atomique du plafond (`remaining > 0` sous verrou) a bien été écrit avec `POST /pre-orders`, et que le webhook est bien exclu du convertisseur de casse, du CSRF et du logger | Oui, vérification. `H2 §38.10, H1 §10.4`                                                                                                         |
| 48  | Sidebar par rôle généralisée : table de correspondance entrée de menu → permission                                                                                                                    | Oui, **mais jamais seule** — à faire avec la tâche 34. `H2 §22.2` (P1)                                                                           |
| 49  | Brancher `validateAssignments()` (le panneau de coordination n'appelle aucun endpoint)                                                                                                                | Oui, back + front. `H1 §8`                                                                                                                       |
| 50  | Authentifier la connexion temps réel côté serveur (`initialize(user.id)` fait confiance au client) avant d'y faire passer des notifications personnelles                                              | Oui. Canal réel = SSE `@adonisjs/transmit`. `H2 §21, H1 §9.10`                                                                                   |
| 51  | Factoriser `ip_address`/`user_agent` hors de `AccessTokenController.store` et le réutiliser dans le callback SSO (sinon les sessions SSO sont vides dans la page Sécurité)                            | Oui. `H1 §2.3/§9.5`                                                                                                                              |
| 52  | Retirer `@adonisjs/ally` ou documenter pourquoi il reste (`config/ally.ts` vide ; c'est `openid-client` qui porte le flux, ally n'a pas PKCE)                                                         | Oui. `H1 §9`                                                                                                                                     |
| 53  | Bouton **Remise** en caisse (listant les règles) + remise libre permissionnée écrivant dans `order_discounts` avec `applied_by_user_id`                                                               | Oui — la lecture est branchée et testée, « il ne manquera que l'écriture ». Le motif obligatoire ou non dépend de la tâche 85. `H2 §37.8/§37.13` |
| 54  | Domaine **Messages** (messagerie entre personnes : auteur, destinataires, fil, non-lus) — table **distincte** des notifications                                                                       | Oui, gros chantier. Ne pas fondre en une table avec une colonne `kind`. `H2 §21` (P2)                                                            |
| 55  | Table `invitations` (email, rôle proposé, jeton, expiration, statut) + routes de création/révocation + envoi d'e-mail                                                                                 | Oui ; l'e-mail restera muet sans SMTP (tâche 100). Bloquant pour l'onglet Invitations. `H1 §3.2`                                                 |
| 56  | Réparer `MembersController.store` (`new Member()` part en base sans id alors que `selfAssignPrimaryKey = true`)                                                                                       | Oui pour le bug lui-même ; « créer un membre = créer un compte » dépend de la tâche 63 (2FA/mot de passe vs SSO seul). `H1 §2.1`                 |
| 57  | Bruit de virgule flottante dans les nombres de l'API (`183.03000000000065`) et N+1 (~2N aller-retours) dans `shopping_list_service`                                                                   | Oui, tous deux mesurés acceptables aux tailles actuelles. Priorité basse. `H1 §0 septies`                                                        |

---

## Bloc C — Faisable directement, infra / seeders / tests

| #   | Tâche                                                                                                                                                                                                                                                  | Faisable ?                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| 58  | Faire lancer `node ace migration:run` **et** `db:seed` par le déploiement — rien dans la CI ne les lance, et `voucher:*` / `role:*` n'existent qu'en TypeScript                                                                                        | Oui. Sans ça, `/v1/vouchers` renvoie **403 à tout le monde, administrateurs compris**. `H1 §0 bis/§0 quinquies` |
| 59  | Semer les permissions dans la base de dev locale (`log:read`, `event:matching`, `event:settle`, `assignment:write` absentes → `middleware.can` refuse tout le monde, affectation auto inutilisable)                                                    | Oui. Marqué « **à traiter en premier** » dans le handoff. `H1 §0 bis`                                           |
| 60  | Rendre les seeders idempotents (`member`, `event`, `restock`, `stock_batch`, `stock_movement`, `transaction` doublent à chaque `db:seed` nu ; `attach()` viole la PK composite)                                                                        | Oui. `H1 §0 septies`                                                                                            |
| 61  | Corriger `good_supplier_seeder` (15 fournisseurs pour 10 produits, prix aléatoires) — **préalable** à l'écran multi-enseignes, sinon on dessine contre des données absurdes                                                                            | Oui. `H2 §17, H1 §2.2`                                                                                          |
| 62  | Corriger `product_furniture_seeder` (attache `furnitures[0]/[1]` par index : 5 nappes par hot-dog, 3 750 par soirée — et la liste de courses affichera ce chiffre)                                                                                     | Oui. `H1 §0 septies`                                                                                            |
| 63  | Base de test dédiée / `.env.test` — `node ace test` tourne sur la **base de dev**, donc un changement de branche produit des échecs qui n'en sont pas                                                                                                  | Oui. `H1 §0 undecies`                                                                                           |
| 64  | Régénérer `database/schema.ts` depuis une base jetable (il aspire les colonnes des autres branches)                                                                                                                                                    | Oui, règle de méthode. `H1 §0 undecies`                                                                         |
| 65  | Reseed de la base de dev (libellés de lots absurdes déjà en base, données de vérification : production run id 50, soirée 4)                                                                                                                            | Oui, `migration:fresh` + reseed. `H1 §0 octies/§0 decies`                                                       |
| 66  | Corriger le test `computes remaining quantity from OUT movements` (`assertBodyContains` positionnel sur un nom tiré par `faker` : vert **par chance, pas par construction**)                                                                           | Oui. `H1 §0 octies`                                                                                             |
| 67  | Éprouver le verrou `SELECT … FOR UPDATE` (aucun test ne le démontre : sous `withGlobalTransaction()` deux connexions concurrentes ne sont pas exprimables)                                                                                             | Oui mais demande de sortir du harnais de test. `H1 §0 octies`                                                   |
| 68  | Écrire les tests manquants : 6 du §9.11 (SSO, sans tester le flux OAuth lui-même), 4 du §11.6 (QR expiré, double scan, fast pass expiré, jeton forgé), 5 du §10.7 (rejeu de webhook, montant manipulé, expiration — à recouper avec ceux du lot Lydia) | Oui. `H1 §9.11/§10.7/§11.6`                                                                                     |
| 69  | `pnpm install` : `node_modules` désynchronisé du lockfile → `pnpm run typecheck`/`test` échouent hors TTY (contourné par `./node_modules/.bin/tsc`)                                                                                                    | Oui. Vérifié cette session.                                                                                     |
| 70  | Corriger les deux notes fausses du handoff : le port Postgres est **5432** (H1 §8 dit l'inverse et interdit de le corriger) et PrimeNG est bien retiré (H1 §0 septies décrit un `main` qui ne compile pas)                                             | Oui. Vérifié cette session.                                                                                     |

---

## Bloc D — Bloqué par une décision produit ou métier (à poser au bureau)

| #   | Question à trancher                                                                                                                                                                                                                                                                                 | Ce qu'elle bloque                                                                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 71  | **Versionner `products`, ou assumer la réécriture de l'historique ?** `products` porte à la fois la _recette_ et l'article vendu (`order_products`, `event_products`, `pre_order_items`) : modifier une recette change ce qu'on croit avoir vendu le mois dernier                                   | **À trancher avant d'ouvrir l'édition des recettes** (tâche 79), et l'historique par type de soirée en est la première victime. `H2 §16/§27`                                       |
| 72  | **Qu'est-ce qu'un « type de soirée » ?** Aucune colonne. BBQ/crêpes/gala ? récurrence ? taille attendue ? Table `event_types` ou libellé contraint — la question est métier                                                                                                                         | L'historique (P1) et la **prédiction du nombre de commandes** (P2), qui n'a sinon aucune base de comparaison. `H2 §27`                                                             |
| 73  | **Quel prix fournisseur fait référence** (le moins cher, le dernier acheté, la moyenne) ? Le choix doit être **unique et côté back**                                                                                                                                                                | Coût de recette, liste de courses et bilan de soirée doivent donner le même nombre. `H2 §16/§28 Q9`                                                                                |
| 74  | **Les fonctionnalités sont-elles des modules activables/désactivables ?** Un module désactivable = un garde sur chaque route et chaque entrée de menu, plus un écran d'admin                                                                                                                        | À trancher **tôt** : rétrofiter sur douze domaines coûte beaucoup plus que de le poser. `parametres/modules` existe en factice, c'est la trace de l'intention. `H2 §22.3`          |
| 75  | **« Application mobile » : PWA ou natif ?** Section vide du CDC                                                                                                                                                                                                                                     | Le lot responsive mobile (v0.7.0) répond peut-être déjà au besoin réel. À faire préciser avant d'ouvrir un troisième projet. `H2 §22.4`                                            |
| 76  | **Le « pôle web » : rôle RBAC ou permission `ticket:manage` ?** Il n'existe pas dans le catalogue                                                                                                                                                                                                   | Destinataire des notifications de tickets (P1). La permission est la meilleure option : évite un rôle pour une liste de diffusion. `H2 §26`                                        |
| 77  | **L'échelle de priorité du CDC : 5 est-il le plus urgent ?** La lecture actuelle est déduite, pas donnée                                                                                                                                                                                            | Tout l'ordre de marche. Une échelle inversée le retourne entièrement. `H2 §13.1`                                                                                                   |
| 78  | **Les cinq sections vides du CDC** (Infrastructure, Paramétrages, Fonctionnalités optionnelles, Application mobile, et les cinq « obligatoires > X ») : document inachevé, ou hors périmètre ?                                                                                                      | « Ce n'est pas la même chose. » `H2 §28 Q2`                                                                                                                                        |
| 79  | Recettes : brancher création/édition (table, routes et écran existent, il manque le chemin d'écriture) — « le lot le moins cher du CDC »                                                                                                                                                            | Faisable **dès que 71 est tranchée**. Vérifier d'abord si une route d'écriture des ingrédients existe (`PUT /products/:id` accepte-t-il le tableau imbriqué ?). `H2 §16` (P4)      |
| 80  | Modale des postes : criticité, effectif minimum, spécialisation, tranche horaire, pré-requis, référent, glisser-déposer, modèles — **aucun** n'existe en base                                                                                                                                       | Attend une **décision de modèle de données**, pas un travail d'intégration. `H1 §0 quinquies`                                                                                      |
| 81  | Bonus/malus coordo : table `point_adjustments` (membre, delta, motif, auteur, date), sommée avec les deltas d'affectation                                                                                                                                                                           | P0 au CDC. Un bonus écrit dans `members.points` détruirait la dérivation au premier `points:recompute`. « La décision de forme est à prendre en même temps que le §6. » `H2 §20.2` |
| 82  | Le **plafond** de prise en charge (par personne ou par enveloppe) n'a jamais été tranché ni implémenté                                                                                                                                                                                              | `H2 §37.9`                                                                                                                                                                         |
| 83  | Bilan : deux colonnes propres « remises consenties » et « pris en charge » ?                                                                                                                                                                                                                        | Le socle existe (`gross = total + discount + sponsored`). `H2 §37.10 Q12`                                                                                                          |
| 84  | **« Facture » au sens légal ?** Numérotation séquentielle, TVA, mentions obligatoires — rien ne porte une séquence de numéros aujourd'hui. Et suit-on le payé/impayé de ces factures ?                                                                                                              | La facture BDE. `H2 §37.14 Q-E/Q-F`                                                                                                                                                |
| 85  | Un staff paie-t-il vraiment, ou consomme-t-il et on compte après ? Cas 100 % offert ? Produit offert à un partenaire : −100 % ou notion « offert » distincte (vente à 0 € vs charge — **pas le même chiffre**) ? Remises indépendantes de la personne (happy hour, déstockage) ? Geste commercial ? | Détermine s'il faut « un tout autre écran », et si l'on construit la remise libre. `H2 §37.10 Q5/Q9/Q10/Q11`                                                                       |
| 86  | Le TTL du QR tournant (60 s) : à décider **explicitement** plutôt que par défaut — il faut du réseau côté client, « le mode de panne le plus probable de tout le dispositif » dans une salle bondée                                                                                                 | `H1 §11`                                                                                                                                                                           |
| 87  | Fidélité : enregistrer les événements et **dériver** le solde, jamais un `clients.loyalty_points` incrémenté (`members.points` est un cumul muté en place, et il est aujourd'hui faux)                                                                                                              | « L'historique d'abord, les points peut-être plus tard. » `H1 §11`                                                                                                                 |
| 88  | Liste de courses cochable : créer une table, ou assumer un état de session ?                                                                                                                                                                                                                        | Le §17 répond qu'elle se **génère**, elle ne se saisit pas. `H1 §2.2`                                                                                                              |
| 89  | Contenu des pages **CGV / Confidentialité** (le footer public affiche FAQ · Contact à la place, parce que « des liens morts sont pires qu'absents »)                                                                                                                                                | Contenu juridique, pas du code. `H2 §36.5`                                                                                                                                         |
| 90  | Durcir en base l'invariant « client ⇒ SSO » (index partiel `keycloak_sub NOT NULL`) ou l'assumer dans le callback                                                                                                                                                                                   | `H1 §4.4`                                                                                                                                                                          |
| 91  | `GET /account/profile` casse pour un client sans ligne `members` : rendre le profil tolérant (`member: null`) ou donner au public un endpoint distinct (« la seconde est plus propre »)                                                                                                             | ⚠️ H2 §34.5 affirme que le §4.4 se trompait et que ça ne casse pas — **à vérifier dans le code**. `H1 §4.4`                                                                        |

---

## Bloc E — Bloqué par un arbitrage interne (entre nous, pas le client)

| #   | Arbitrage                                                                                                                                                                                  | Note                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 92  | Cumul des remises : multiplicatif (−14,5 %) ou additif (−15 %) ? Sur 20 €, 10 centimes d'écart — « assez pour qu'un adhérent le remarque, pas assez pour qu'on s'en aperçoive en recette » | Recommandation du handoff : multiplicatif. `H2 §37.7 Q13`                                                                                       |
| 93  | Arrondi : au centime ou aux 10 centimes, par ligne ou sur le total ? Au centime, le comptoir rend la monnaie en pièces de 1 centime                                                        | Recommandation : 10 centimes, sur le total. `H2 §37.7 Q14`                                                                                      |
| 94  | Avertir (sans bloquer) quand une règle vend sous le coût de revient                                                                                                                        | `sponsorship_prices` ne porte qu'un `CHECK >= 0`. `H2 §37.7`                                                                                    |
| 95  | `preOrderDiscountPercent` reste une variable d'environnement globale — la passer par soirée ?                                                                                              | `preOrderCloseLeadHours` l'a été au §39.2. `H2 §38.10`                                                                                          |
| 96  | Budget de bundle : `angular.json` fixe 500 ko, l'initial est à ~788 ko dont l'essentiel est du vendor — relever le seuil ou attaquer les dépendances                                       | `H1 §8`                                                                                                                                         |
| 97  | Scanner : passer à `@zxing/browser` (Firefox et Safari desktop n'ont pas `BarcodeDetector`) — « un choix de dépendance, pas un correctif »                                                 | `H1 §0 sexies`                                                                                                                                  |
| 98  | 2FA (P0 au CDC) : Keycloak sait faire le TOTP nativement, et le SSO est livré                                                                                                              | Recommandation du handoff : **sortir le 2FA du périmètre**, et ne le rouvrir que si des comptes locaux subsistent. À statuer. `H2 §13, H1 §3.3` |
| 99  | Mot de passe : `PUT /v1/account/password` ne concerne que les comptes en ayant un — la colonne devient nullable après le SSO                                                               | Dépend de 98. `H1 §3.3`                                                                                                                         |

---

## Bloc F — Bloqué par une demande externe (délai humain, pas du dev)

| #   | Demande                                                                                                                                                                                                   | Note                                                                                                                                                                                                                                                             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 100 | **Obtenir le SMTP.** `config/mail.ts` : « Aucun SMTP n'est encore fourni […] Le jour où les identifiants arrivent : `MAIL_MAILER=smtp` dans `.env`, plus les trois variables. **Aucun code à changer.** » | Aucun mail ne part aujourd'hui. Bloque les rappels de présence (P2/P1), les deux mails de tickets (P1/P2), le rappel de péremption, l'e-mail d'invitation. ⚠️ `MAIL_MAILER=log` avale les messages **sans rien signaler** : piège en production. `H2 §15/§28 Q6` |
| 101 | Demander à **EirbWare** les post-logout redirect URIs de production (`dashboard.bae.eirb.fr`, `order.bae.eirb.fr`)                                                                                        | En dev, `scripts/setup-dev-keycloak.sh` suffit. `H2 §39.6`                                                                                                                                                                                                       |
| 102 | Vérifier que l'IdP (`*.vpn.eirb.fr`) est joignable **depuis le navigateur de l'utilisateur hors réseau école** — un étudiant qui précommande en 4G doit atteindre la page de login                        | « À vérifier **avant de promettre une date**. » C'est le vrai risque du SSO. `H1 §9.2`                                                                                                                                                                           |
| 103 | HTTPS accessible depuis un téléphone du réseau local : la caméra exige un contexte sécurisé, donc le scan de code-barres reste **intestable** sur mobile sans ça                                          | `H2 §36.6`                                                                                                                                                                                                                                                       |

---

## Bloc G — Bloqué par une brique absente

| #   | Tâche                                                                                                                                       | Ce qui manque                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 104 | **Justificatifs de paiement** (P1) : rattacher une preuve à `restocks`, et le bouton « Preuve d'achat » de Logistique aujourd'hui désactivé | **Aucun stockage de fichiers** : ni `@adonisjs/drive`, ni bucket, ni colonne de chemin (vérifié). Trois décisions préalables : **où** (disque local perdu au redéploiement, ou S3/MinIO) ; **qui peut lire** (un justificatif porte le nom du payeur et le détail de ses achats — derrière `auth()` seul, c'est ouvert à tout membre) ; **combien** (sans limite de taille ni de type, c'est un vecteur d'envoi de n'importe quoi). À trancher **en même temps** que l'archivage des PDF. `H2 §23.1` |
| 105 | Précommandes « en avant-première » (ouverture anticipée), remplacée par « −5 % supplémentaires »                                            | Aucune colonne ne la porterait. Non planifié. `H2 §36.5`                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 106 | Rien ne consomme `expected_attendees`                                                                                                       | Champ d'information, volontaire. `H2 §38.10`                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

---

## Bloc H — Déjà fait, contrairement à ce qu'affirme le handoff (ne pas rejouer)

| #   | Item                                                                                                                             | Vérification                                                                                                                                                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 107 | `POST /pre-orders`, présenté comme « le maillon bloquant » de tout le dossier (§36.8, §38.10, §39.6, dernière phrase du fichier) | **Existe** : `start/routes/public.ts:25`, garde `audience('client')`.                                                                                         |
| 108 | Paiement Lydia — « rien n'encaisse, c'est un libellé enregistré », « tout le §10 reste ouvert »                                  | **Livré** (v0.8.0) : client HTTP + client simulé, table `payments`, webhook, confirmation idempotente, expiration, cotisation et précommande payées en ligne. |
| 109 | `GET /events/:id/production-returns` — « le seul blocage réel, et il est côté back »                                             | **Existe** (`ProductionRuns.returnState`).                                                                                                                    |
| 110 | Domaine tickets (contradiction H2 §33.1 vs §33.2)                                                                                | **Construit** : `TicketSchema`, `TicketMessageSchema`, 5 routes. Restent les deux mails (bloqués par 100).                                                    |
| 111 | Refonte de `transactions` (§10.2 : `status`, `provider_reference` unique)                                                        | **Contournée** : le lot Lydia a créé `payments` qui porte tout ça. À décider si `transactions` reste tel quel en registre comptable.                          |
| 112 | `bae-qr-code` en SVG « attend qu'on l'y branche »                                                                                | **Branché** : `bae-public/commande` importe `QrCode` de `@bae/ui`, plus aucun `toDataURL` hors commentaire de test.                                           |
| 113 | Logout global SSO « non implémenté » (répété 3 fois)                                                                             | **Livré** au §39.1. Restent les URIs de production (tâche 101).                                                                                               |
| 114 | Front public inexistant, « aucun projet Angular n'appelle `app=public` »                                                         | **Livré** : `projects/bae-public`, 7 écrans.                                                                                                                  |
| 115 | `main` ne compile pas depuis un clone neuf (3 dépendances PrimeNG jamais déclarées)                                              | **Périmé** : PrimeNG absent de `package.json` et plus référencé. Typecheck vert (vérifié).                                                                    |
| 116 | `page cloture` de caisse « reste entièrement maquette »                                                                          | **Supprimée** au §39.3 (−535 lignes) : la caisse s'ouvre seule.                                                                                               |
| 117 | Formulaire de contact inerte                                                                                                     | **Branché** au §39.4 sur `POST /v1/tickets`.                                                                                                                  |
| 118 | `sidebar.ts` modifié et non commité                                                                                              | L'arbre est propre (`git status` vide).                                                                                                                       |
| 119 | `openedAt` « écriture à vérifier »                                                                                               | Vérifié le 2026-08-11 : rien à corriger. Le tableau §29 le donne encore 🟡 — incohérence interne.                                                             |
| 120 | Bouton « Inventaire » sans endpoint                                                                                              | `GET /stock-batches/inventory/pdf` livré au §0 duodecies. À confirmer côté front.                                                                             |

---

## Bloc I — Explicitement à ne pas construire

| #   | Item                                                                                                                                                       | Raison                                                                                                                                                                                                                                                         |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 121 | Le moteur de règles `price_rules` (modèles A/B/C du §37.4, schéma du §37.5)                                                                                | « **Ne pas construire le moteur de règles** […] une table de règles avec `audience`, `priority` et `stackable` pour trois cas dont aucun ne varie serait de l'abstraction sans emploi. » Remplacé par la grille `sponsorship_categories`/`sponsorship_prices`. |
| 122 | L'entité « organisation partenaire » et `sponsor_id` ; `event_staff_tariffs` / `event_products.staff_price_cents` ; `order_discounts.rule_id`/`sponsor_id` | Abandonnés au profit de `events.payer_name`.                                                                                                                                                                                                                   |
| 123 | « Lieu d'alternance » et tout le domaine **Trésorerie**                                                                                                    | Abandonnés par le CDC. Aucune colonne de localisation sur `members`, et le moteur d'affectation ne doit pas gagner de critère géographique.                                                                                                                    |
| 124 | Colonne « localisation » de la page Sécurité                                                                                                               | Aucune source : pas de géo-IP, volontairement.                                                                                                                                                                                                                 |
| 125 | Page `etats`                                                                                                                                               | Galerie d'états d'interface, à laisser telle quelle.                                                                                                                                                                                                           |
| 126 | Reprendre EirbPay ; rétro-ingénierie de l'app Lydia Pro                                                                                                    | « Le plus mauvais des plans. »                                                                                                                                                                                                                                 |
| 127 | Décrémenter le stock d'ingrédients à chaque encaissement                                                                                                   | « Un couplage lourd sur le chemin le plus chaud de l'application, un soir de soirée. » Recommandation : non en direct — déjà appliquée par le lot production.                                                                                                  |
| 128 | Décrémenter `furnitures` (non-alimentaire) au prélèvement                                                                                                  | Compteur plat, sans lots ni mouvements : le décrémenter serait destructif et irréversible. **À dire à l'écran** en revanche (produire 200 hot-dogs décrémente saucisses et pains, pas les barquettes).                                                         |
| 129 | Migrer le schéma de `member_responses` pour porter trois états                                                                                             | « Recommandation : ne pas migrer le schéma. » Mais ⚠️ `defaultTo(false)` est un **piège actif** : toute écriture qui crée la ligne sans passer `is_available` inscrit une abstention explicite — à relire à cette aune (tâche 39).                             |
| 130 | Tester l'API de Lydia, ou le flux OAuth lui-même                                                                                                           | Les simuler.                                                                                                                                                                                                                                                   |

---

## Vérification

Ce document est un inventaire, pas un lot de code : rien n'est à exécuter pour le valider.
Les faits du tableau « Corrections d'état » ont été vérifiés cette session par lecture de
`start/routes/*.ts`, `database/schema.ts`, `config/mail.ts`, `package.json`,
`projects/bae-public/src/app/app.html`, `git log`/`git merge-base` sur les deux dépôts, et
un `tsc --build` vert côté front.

Avant d'attaquer une tâche : relire la ligne source citée, **puis le code**. La règle que le
handoff énonce lui-même vaut dans les deux sens — une section « ✅ RÉALISÉ » ne se croit pas
sur parole, et une section « ❌ bloqué » non plus (blocs H et I).
