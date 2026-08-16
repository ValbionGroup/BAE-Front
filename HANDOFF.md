# BAE — état des lieux et travail restant

Rédigé le 2026-08-06. Sert à reprendre le travail sans réexplorer les deux dépôts.
**Ce fichier est versionné depuis le 2026-08-10.** Il l'était volontairement resté hors de git tant
qu'il servait de notes de reprise personnelles ; il porte désormais assez d'état vérifié du dossier
(pièges de schéma, décisions non relisibles dans le code, points ouverts) pour valoir d'être partagé
et de suivre les branches. À maintenir avec le code, donc — plus à supprimer après reprise.

Dépôts : `~/Documents/Projets/BAE/BAE-Front` (Angular 21) et `../BAE-Back` (**AdonisJS 7 + Lucid**,
port 3333). Branche `feat/fix-frontend` des deux côtés, rien n'est poussé.

~~⚠️ `.claude/CLAUDE.md` (front) annonce « AdonisJS 6 »~~ — **corrigé**, vérifié le 2026-08-11 : le
fichier dit désormais « AdonisJS 7 », en phase avec `@adonisjs/core` en `^7.3.4`.

État (2026-08-06) : back **139 tests**, front **125 fichiers / 435 tests**, typecheck vert partout.
Après les lots rôles × permissions et écritures Équipe (§0 bis, §0 ter) : back **157 tests**, front
**126 fichiers / 445 tests**, typecheck vert.

> Mis à jour le 2026-08-08 : le lot **rôles × permissions** (§3.1, et la matrice du §2.1) est
> livré et poussé sur `feat/roles-permissions` dans les deux dépôts. Voir le §0 bis.
>
> Mis à jour le 2026-08-08 (suite) : le lot **écritures Équipe** (modifier/supprimer un membre,
> §2.1) est livré sur `feat/member-crud` dans les deux dépôts, non poussé. Voir le §0 ter — il
> corrige aussi une note du §0 bis devenue fausse (le rôle `President`).
>
> Mis à jour le 2026-08-11 : clôture des points ouverts laissés par le §0 nonies et par
> `HANDOFF2.md` §18.2/§20.1/§22.5 — tests de `production-returns` enfin exécutés, verrou d'office
> sur une affectation manuelle, thème préservé à la déconnexion, première vérification à l'écran
> outillée (Puppeteer) depuis six lots. Voir le §0 decies.

---

## 0. Déjà réalisé — ne pas refaire

Branche `feat/periodes-points-presence` **dans les deux dépôts**, non poussée. Back : `7a05b4b → b5738f5`
(19 commits). Front : `9eb6865 → 7627779` (9 commits). Tests : back 58 → **125**, front 304 → **419**.

| §      | Sujet                                                    | État        | Où                                                                                    |
| ------ | -------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------- |
| **§5** | Périodes de soirée (`before`/`during`/`after`)           | ✅ **fait** | `matching_service.ts`, `EventsController.runMatching`                                 |
| §5.2   | Une affectation par période, un poste max par période    | ✅          | trois passes de `stableMatch`, verrous **par période**                                |
| §5.3   | Préférences implicitement complètes (ex æquo en dernier) | ✅          | `buildEffectivePreferences()`, départage par id croissant                             |
| §5.4   | Page de coordination groupée par moment                  | ✅          | `coordination.ts` : `posteGroups`, couverture par période, verrou **par affectation** |
| **§6** | Système de points refondu                                | ✅ **fait** | voir la formule ci-dessous                                                            |
| §6.1   | Sens inversé → crédit de priorité                        | ✅          | `delta = CHARGE(période) − coûtRang(rang)`                                            |
| §6.2   | Delta annulé à la désaffectation                         | ✅          | `AssignmentsController.destroy` rembourse si consolidé                                |
| §6.3   | Points irrécupérables après verrouillage                 | ✅          | `points:recompute` + `event:unsettle`                                                 |
| §6.4   | `members.points` devient dérivé                          | ✅          | `settled_at` par ligne, `POST /v1/events/:id/settle`                                  |
| §6.5   | Score affiché sur « mes présences »                      | ✅          | crédit réel par soirée, delta négatif visible                                         |
| **§7** | Présence verrouillée par l'affectation                   | ✅ **fait** | 409 `E_PRESENCE_LOCKED_BY_ASSIGNMENT`                                                 |
| §7.1   | Verrou côté back                                         | ✅          | refuse **uniquement** le passage à « absent », soirée entière                         |
| §7.2   | Les deux écrans                                          | ✅          | `home` et `my-presences` : « Absent·e » désactivé, jamais masqué                      |

## 0 bis. Rôles × permissions — ✅ livré le 2026-08-08

Branche `feat/roles-permissions`, **poussée dans les deux dépôts**. Back : 9 commits, **139 tests**.
Front : 11 commits, **125 fichiers / 435 tests**, typecheck vert.

| §        | Sujet                                                | État              | Où                                                                  |
| -------- | ---------------------------------------------------- | ----------------- | ------------------------------------------------------------------- |
| **§3.1** | Matrice rôles × permissions, lecture **et** écriture | ✅ **fait**       | `PUT /v1/roles/:id/permissions`                                     |
| §3.1     | Relation exposée en lecture                          | ✅                | `RolesController.index` fait `preload('permissions')`               |
| §3.1     | Matrice éditable case par case                       | ✅                | `bfd-checkbox` contrôlée, sauvegarde immédiate, verrou par rôle     |
| **§8**   | Routes d'administration gardées                      | ✅ **fait**       | 13 routes sous `middleware.can()`                                   |
| —        | Catalogue étendu                                     | ✅                | `member:read` (socle), `member:write`, `role:read`, `role:write`    |
| —        | Écritures HTTP sur `/v1/permissions`                 | ✅ **supprimées** | le catalogue TS est la source unique                                |
| —        | Permissions exposées au front                        | ✅                | `GET /v1/account/profile` → `permissions: string[]` **à la racine** |
| —        | Garde de route + entrée de menu                      | ✅                | `permissionGuard('role:read')`, sidebar masquée sans la permission  |

### Les deux pièges qui ont coûté le plus, et leur règle

- **L'invariant anti-verrouillage.** `PUT /roles/:id/permissions` est gardé par `role:write` : la route
  protégée par une permission est celle qui peut la retirer. Le back refuse donc (**409
  `E_RBAC_LOCKOUT`**) tout sync après lequel plus aucun **membre vivant** ne porte `role:read` **ou**
  `role:write`. Vérifié _après_ le sync, dans la transaction, sous **`pg_advisory_xact_lock`** — sans
  ce verrou, deux syncs concurrents sur deux rôles différents ne voient pas leurs suppressions
  mutuelles (READ COMMITTED) et passent tous les deux. Conséquence pour l'utilisateur : déplacer
  `role:write` d'un rôle à un autre n'est possible qu'en **accordant avant de retirer**.
- **`ApiException`, jamais `Exception` nue.** `app/exceptions/handler.ts` ne traite spécialement que
  la première. Une exception nue conserve le statut mais son corps devient
  `E_INTERNAL_SERVER_ERROR` / « Internal server error » hors mode debug. Un test qui n'assert que
  `assertStatus()` ne voit rien — asserter **`code` et `message`** dès qu'ils font partie du contrat.

### Ce qui reste ouvert de ce domaine

- **Le déploiement doit lancer `node ace db:seed`.** Les quatre permissions n'existent qu'en
  TypeScript tant qu'il n'a pas tourné : sans lui, personne ne porte `role:read` ni `role:write`, et
  la matrice est justement l'outil qui ne peut pas s'en sortir. **Rien dans la CI ne le lance.**
- `db:seed` fait un `sync()` depuis le catalogue : il **écrase toute édition faite à la matrice**.
  C'est cohérent (le catalogue est la source de vérité), mais ce n'est plus le remède au
  verrouillage — voir `node ace member:role` au §0 ter, qui ne touche qu'à une ligne au lieu de
  resynchroniser toute la matrice.
- `DELETE /roles/:id` peut encore vider l'ensemble des porteurs sans contrôle : il n'est protégé par
  aucune des deux règles de hiérarchie ni par le garde anti-verrouillage. `DELETE /members/:id`, lui,
  est désormais gardé par les deux (§0 ter) — la puce ne vise donc plus que `/roles/:id`. Il n'est pas
  atteignable depuis l'interface actuelle ; l'invariant reste donc étanche pour ce qui est cliquable,
  pas absolument.
- `TeamService.getLogs()` n'envoie ni `page` ni `limit` alors que `GET /logs` pagine (50 par défaut,
  200 max) : le fil d'activité et la colonne « dernière activité » de la page Équipe sont calculés
  sur une fenêtre de 50 lignes. Les commentaires le disent désormais, le comportement reste à
  corriger.

### La formule des points, telle qu'implémentée

```
delta(période, rang) = CHARGE[période] − coûtRang(rang)
CHARGE = { before: 12, during: 8, after: 12 }
coûtRang(r) = max(0, 12 − 2 × (r − 1))    ·    coûtRang(null) = 0
```

Le score est un **crédit de priorité** : plus il est élevé, plus on est servi tôt. Obtenir un bon rang le
**dépense** (delta négatif, c'est normal) ; tenir un poste en **rapporte**, davantage aux moments ingrats.
Le rang utilisé est le **rang global exprimé** (`member_job_preferences.rank`), `null` si non classé —
jamais la position dans la liste restreinte à la période.

### Ce que ce lot a livré en plus, hors §5/§6/§7

- `jobs.type` exposé sur l'API (`GET/POST/PUT /v1/jobs`) ; seeder couvrant les trois périodes.
- `POST /v1/events/:id/settle` (idempotent) et commandes `node ace points:recompute` / `event:unsettle`,
  toutes deux avec `--dry-run`.
- Une **affectation manuelle est scorée comme l'automatique** (`AssignmentsController.store`), et applique
  désormais les règles structurelles : poste offert par la soirée, éligibilité, un seul poste par période.
- Permissions `event:matching`, `event:settle`, `assignment:write` sur les routes correspondantes.
- Front : `core/models/job-period.model.ts` (source unique des périodes), `core/store/member-assignments.store.ts`,
  `shared/utils/points-delta.ts` (formateur unique du crédit) et `shared/utils/presence-lock.ts`.

### ⚠️ Point ouvert, à traiter en premier

**Les permissions ne sont pas seedées dans la base de dev.** La table `permissions` ne contient que les 18
permissions `presence:*`, `product:*`, `restock:*`, `stock:*`, `supplier:*` : `log:read`, `event:matching`,
`event:settle` et `assignment:write` en sont **absentes**, donc `middleware.can(...)` refuse tout le monde
et l'affectation automatique est inutilisable. Deux causes distinctes :

1. Le seeder de permissions n'a jamais été rejoué depuis l'ajout de ces entrées.
2. ~~`database/seeders/role_permission_seeder.ts` mappe un rôle `President` qui n'existe pas — les
   rôles réels sont `Assembly`, `Finance`, `HR`, `Logistics`, `Service`.~~ — **note fausse, corrigée
   le 2026-08-08**, vérifiée dans le code à l'occasion du lot écritures Équipe (§0 ter).
   `database/rbac_catalog.ts` est aujourd'hui la source unique des rôles et des permissions : `ROLES`
   y inclut `President` explicitement (aux côtés d'`Administrateur`, `Tresorier`, `Coordinateur`,
   `Secretaire`, `Pole Log`, `Pole BBQ`, `Membre` — pas `Assembly`/`Finance`/`HR`/`Logistics`/`Service`,
   qui n'ont jamais existé dans ce dépôt). `role_permission_seeder.ts` ne porte plus de
   `rolePermissionMap` écrit à la main ; il boucle sur `ROLE_PERMISSIONS`, exporté par le catalogue,
   donc aucune clé ne peut plus diverger d'un rôle réel. Le test demandé par cette note existe déjà,
   sous une forme plus générale : `tests/functional/rbac_seeding.spec.ts` reseede deux fois et vérifie,
   pour **chaque** rôle du catalogue — `President` compris —, qu'il porte exactement les permissions
   attendues. La seule cause qui reste ouverte est donc la première : `db:seed` n'a jamais tourné dans
   cet environnement de dev.

**Décision prise** : les permissions de coordination reviennent au bureau — rôles **`HR`, `Finance` et
`Assembly`**. Le compte de l'utilisateur (membre 1) a aujourd'hui le rôle `Service` : il faudra soit lui
donner un rôle du bureau, soit revoir ce découpage. Vérifier aussi que les seeders sont **rejouables**
(`attach()` sur une paire existante viole la PK composite).

> ⚠️ Cette « Décision prise » n'a pas été réauditée pour ce paragraphe : elle date d'avant la
> consolidation de `rbac_catalog.ts` et nomme les mêmes rôles `HR`/`Finance`/`Assembly`/`Service` que
> la note corrigée ci-dessus, qui n'ont jamais existé dans le catalogue réel (`President`,
> `Administrateur`, `Tresorier`, `Coordinateur`, `Secretaire`, `Pole Log`, `Pole BBQ`, `Membre`). Le
> mapping réel du catalogue donne `event:matching`/`event:settle`/`assignment:write` au rôle
> `Coordinateur`, ce qui ressemble à une réalisation de cette décision sous un autre nom — mais ce
> lot n'a pas vérifié ce point spécifique, donc ne le tenez pas pour acquis sans relire le code.

---

## 0 ter. Écritures Équipe — ✅ livré le 2026-08-08

Branche `feat/member-crud` **dans les deux dépôts**, non poussée. Back : 9 commits
(`27bd51f..60f0e59`), **157 tests**. Front : 6 commits (`98c4ca3..ecde8f8`), **126 fichiers / 445
tests**, typecheck vert.

| §    | Sujet                                     | État            | Où                                                       |
| ---- | ----------------------------------------- | --------------- | -------------------------------------------------------- |
| §2.1 | Modifier un membre (prénom, nom, rôle)    | ✅ **fait**     | `PATCH\|PUT /v1/members/:id`, `MemberEditModal`          |
| §2.1 | Supprimer un membre                       | ✅ **fait**     | `DELETE /v1/members/:id` → 204, supprime le **compte**   |
| —    | 404 explicite sur membre/rôle introuvable | ✅ **fait**     | `ApiException`, dans `show`, `update` **et** `destroy`   |
| —    | Commande de rattrapage RBAC               | ✅ **fait**     | `node ace member:role <memberId> <roleName> [--dry-run]` |
| §2.1 | Inviter un membre                         | toujours bloqué | §3.2 — aucune table `invitations`                        |

### La hiérarchie n'existe pas dans le schéma — elle se dérive des permissions

`roles` ne porte que `id` et `name` : aucune colonne de rang, aucune notion d'« admin ». Écrire
`if (role.name === 'Administrateur')` fabriquerait une hiérarchie que rien ne tient à jour — renommer
un rôle la casserait en silence. La règle retenue compare des **ensembles de permissions** :
« au-dessus de moi » veut dire « porte des permissions que je n'ai pas ». Elle ne peut pas diverger du
réel puisqu'elle **est** le réel — rien à synchroniser, rien à migrer.

- **Règle 1 — cible.** Agir sur un membre (modifier, supprimer) exige que les permissions de la
  **cible** soient incluses dans celles de l'acteur. Un Coordinateur porteur de `member:write` ne peut
  ni renommer ni supprimer un Administrateur, qui porte `role:write` et d'autres permissions que lui.
- **Règle 2 — attribution.** Accorder un rôle exige que les permissions de **ce rôle** soient incluses
  dans celles de l'acteur. C'est elle qui ferme le trou réel : sans elle, ce même Coordinateur se
  promeut en mettant `roleId = Administrateur` sur **sa propre ligne**, sans jamais agir sur qui que ce
  soit d'autre — la règle 1 seule ne le voit pas venir, puisqu'il n'agit là que sur lui-même.
- **Inclusion large, pas stricte.** Deux porteurs du même ensemble se gèrent mutuellement — deux
  Administrateurs peuvent se révoquer l'un l'autre. L'inclusion stricte rendrait le sommet intouchable
  depuis l'interface dès qu'il compte plus d'un occupant, pas seulement quand il n'en a qu'un. C'est un
  problème d'organisation assumé, pas un trou de sécurité.

Les deux règles sont vérifiées côté back (`app/services/rbac_service.ts` : `assertCanActOn`,
`assertCanGrant`) et **miroitées** côté front sur la page Équipe (menu d'actions désactivé plutôt que
masqué, `<select>` de `MemberEditModal` n'offrant que les rôles attribuables, dernier porteur d'une
permission protégée non éditable). Le back reste la seule source qui refuse pour de vrai — les miroirs
front n'évitent qu'un clic voué à un 403, ils ne remplacent aucune vérification serveur.

### `DELETE /members/:id` supprime le compte, pas seulement la ligne `members`

Cohérent tant que `clients` (§4.4) n'existe pas : un `users` sans `members` n'a aujourd'hui aucun
usage légitime, et `ProfileController.show` déréférence `user.member` sans tester sa nullité — la
personne recevrait un 500 au démarrage du dashboard plutôt qu'un refus propre. Tout cascade déjà
depuis `users` (vérifié contre les migrations, rien à démolir à la main) : `auth_access_tokens` (la
session meurt avec le compte), `member_job_preferences`, `member_responses`,
`member_event_assigned_jobs`, `job_eligible_members`. `orders.member_id` / `restocks.member_id` et
`logs.user_id` passent en `SET NULL` — la caisse et le journal d'audit survivent sans leur auteur.

Trois refus possibles, dans cet ordre : soi-même (409 `E_MEMBER_SELF_DELETE` — le geste détruirait sa
propre session en cours de requête), règle 1 (403 `E_RBAC_ABOVE_ACTOR`), verrouillage (409
`E_RBAC_LOCKOUT`, même invariant qu'au §0 bis).

### Le remède au verrouillage RBAC a changé

`node ace member:role <memberId> <roleName> [--dry-run]` remplace `db:seed` comme chemin de secours
(§0 bis). Elle passe outre les deux règles **et** le garde anti-verrouillage — la console est
l'autorité — et ne touche qu'à **une ligne**. `db:seed` reste ce qu'elle a toujours été : un `sync()`
depuis le catalogue qui **écrase toute édition faite à la matrice**, cohérent en soi mais inutilisable
comme rattrapage ponctuel puisqu'il détruit précisément ce qu'on venait corriger à la main.

### Ce qui reste ouvert de ce lot

- **Aucune vérification à l'écran n'a été faite sur la page Équipe.** Aucun agent de ce lot n'avait
  d'outil de navigateur — les tests unitaires (Vitest, 445 au total) sont le seul filet. À reprendre
  au premier passage manuel sur la page, avant de la considérer réellement livrée.
- `RolesController.destroy` porte toujours un `new Error` générique (même défaut que
  `MembersController` avant ce lot) et n'est protégé par aucune des deux règles ni par le garde
  anti-verrouillage : supprimer un rôle peut donc vider un ensemble de permissions sans contrôle. Non
  atteignable depuis l'interface actuelle. Hors périmètre assumé de ce lot (voir §1 du spec de
  conception `docs/superpowers/specs/2026-08-08-equipe-ecritures-design.md`).
- `MembersController.store` reste cassé — voir §2.1. Créer un membre, c'est créer un compte, ce qui
  attend §3.2 et §3.3.

---

## 0 quater. Écritures Logistique — bons d'achat — ✅ livré le 2026-08-09

Branche `feat/logistique-bons-achat` **dans les deux dépôts**, non poussée. Back : 2 commits,
**165 tests**. Front : 4 commits, **128 fichiers / 470 tests**, typecheck vert.
Plan : `docs/superpowers/plans/2026-08-09-logistique-bons-achat.md`.

| §    | Sujet                                            | État            | Où                                             |
| ---- | ------------------------------------------------ | --------------- | ---------------------------------------------- |
| §2.2 | Créer un bon d'achat                             | ✅ **fait**     | `POST /v1/vouchers`, `VoucherCreateModal`      |
| §2.2 | Consommer un bon, et **annuler** la consommation | ✅ **fait**     | `PATCH /v1/vouchers/:id`                       |
| —    | `GET /v1/suppliers` allégé                       | ✅ **fait**     | ne précharge plus `goods` ni `restocks`        |
| —    | Endpoints bons d'achat couverts par des tests    | ✅ **fait**     | `tests/functional/vouchers.spec.ts`            |
| §2.2 | Modifier / supprimer un bon                      | non branché     | routes back présentes, écran non câblé         |
| §2.2 | Liste de courses persistée                       | toujours ouvert | voir §17 de `HANDOFF2.md` — elle se **génère** |

### Trois décisions qui ne se relisent pas dans le code

- **`PATCH`, pas `PUT`, pour la consommation.** Le contrôleur n'écrit que les colonnes dont la clé
  est _présente_ dans le corps. Annuler une consommation exige donc `{ usedAt: null }` — clé
  présente et nulle. Une clé absente signifie « ne touche pas à cette colonne », pas « efface-la ».
- **Création non optimiste, bascule optimiste.** Créer n'a pas d'id avant la réponse et insère dans
  une liste **triée par expiration croissante** (`insertByExpiry`) : un ajout en fin de liste
  mettrait un bon expirant dans trois jours derrière ceux qui expirent dans six mois. Consommer, à
  l'inverse, bascule tout de suite et ne restaure **que la ligne fautive** en cas de refus — un
  instantané global annulerait une écriture concurrente aboutie entre-temps.
- **Deux erreurs distinctes, délibérément.** `createError` (modale) et `voucherError` +
  `voucherErrorId` (carte) : un refus de création ne doit pas s'afficher sur une carte, et une
  carte en erreur doit dire _laquelle_.

### Ce qui reste ouvert de ce lot

- ⚠️ **Aucune vérification à l'écran n'a été faite** — même manque qu'au §0 ter, et pour la même
  raison : aucun outil de navigateur. La checklist est au Task 7 / Step 4 du plan. Les 470 tests
  Vitest sont le seul filet.
- ~~⚠️ Les routes `/vouchers` ne sont gardées que par `auth()`~~ — ✅ **fait le 2026-08-09**, voir
  §0 quinquies.
- `good_supplier_seeder` fabrique toujours 15 fournisseurs pour 10 produits avec des prix
  aléatoires : le sélecteur d'enseigne de la modale hérite donc de 15 entrées absurdes en dev.
- Le §0 ter listait `RolesController.destroy` comme ouvert (`new Error` nue, aucun garde) : les
  commits back `83e67f1` / `a54ff41` / `3c38fc6` l'ont **partiellement** refermé — `destroy` lève
  désormais une `ApiException`, prend `pg_advisory_xact_lock` et repasse par `assertNoLockout`
  (vérifié dans `app/controllers/roles_controller.ts:87-104`). Ce qui **reste** ouvert : il n'est
  toujours protégé par **aucune des deux règles de hiérarchie** du §0 ter. La puce du §0 bis est
  donc à corriger, pas à supprimer.
  ⚠️ Le plan de ce lot cite ces trois correctifs sous les hashes `f86a435` / `4e41026` / `8bbaefd` :
  ce sont les copies d'avant rebase, orphelines et susceptibles d'être ramassées par `git gc`.

---

## 0 quinquies. Bons d'achat gardés par permission — ✅ livré le 2026-08-09

Back : `feat/logistics`, 2 commits (`07f118d`, `ceabd61`), **171 tests**. Front :
`feat/logistique-bons-achat`, 2 commits (`7764111`, `d18551d` — plus `d69f4f2`), **128 fichiers /
476 tests**, typecheck vert. Spec et plan :
`docs/superpowers/specs/2026-08-09-vouchers-permissions-design.md`.

| Sujet                                                                         | État | Où                                |
| ----------------------------------------------------------------------------- | ---- | --------------------------------- |
| `voucher:read` / `voucher:write` au catalogue RBAC                            | ✅   | `database/rbac_catalog.ts`        |
| Les 4 routes `/v1/vouchers` gardées                                           | ✅   | `start/routes/billing.ts`         |
| Porteurs : `Tresorier`, `Pole Log` (+ `President`, `Administrateur` d'office) | ✅   | `SPECIFIC`                        |
| Un 403 sur les bons ne vide plus la page Logistique                           | ✅   | `settle()` dans `LogistiqueStore` |
| Panneau « Accès restreint », bouton d'ajout masqué, KPI à `—`                 | ✅   | `logistique.html`                 |

### Trois décisions qui ne se relisent pas dans le code

- **La lecture est gardée aussi strictement que l'écriture.** Un bon d'achat est un objet **au
  porteur** : sa valeur est dans sa lecture. Garder seulement les écritures n'aurait rien protégé.
- **La page Logistique, elle, reste ouverte à tout membre.** Seul le panneau des bons se restreint —
  le comparatif d'enseignes n'a rien de confidentiel. C'est ce choix qui a imposé d'isoler la branche
  « bons » du `forkJoin` : celui-ci propage la première erreur et désabonne ses frères, donc un 403
  effaçait auparavant toute la page.
- **`settle()` porte désormais le statut HTTP** (`{ ok: false, status }`), parce qu'un refus (403,
  une règle) et une panne (500, un incident) ne se disent pas de la même façon. Une coupure réseau
  vaut `status: 0` et tombe donc côté incident, jamais côté refus.

### ⚠️ Le déploiement doit rejouer les seeders RBAC

Les deux permissions n'existent qu'en TypeScript tant que `node ace db:seed` n'a pas tourné. Sans
lui, `/v1/vouchers` renvoie **403 à tout le monde, administrateurs compris** — panne totale de la
fonctionnalité, pas trou de sécurité (l'échec est _fermé_, ce qui est le bon sens). Les deux seeders
sont idempotents (`fetchOrCreateMany` + `sync`), donc rejouables sans risque. **Rien dans la CI ne
les lance** — c'est le même point ouvert qu'au §0 bis, désormais avec une conséquence visible.

⚠️ `db:seed` resynchronise toute la matrice depuis le catalogue : il **écrase les éditions faites à
la main** dans la page Équipe. Le rattrapage ponctuel reste `node ace member:role`.

### Alignement sur la maquette — fait dans la foulée

La maquette Claude Design est **lisible directement avec l'outil `DesignSync`** (projet
« BAE - ERP », id `019e1c0a-86ed-72eb-949d-25f2fc0a2e7d`) : `get_project` → `list_files` →
`get_file`. Le §14 de `HANDOFF2.md` donne un prompt MCP ; l'outil suffit, aucun `/design-login`
n'a été nécessaire.

- **`screen-logistique.jsx`** ne porte aucun bouton à côté du titre de section : les actions sont
  dans la topbar. La page les y pousse désormais via `PageHeaderService.setActions()`, comme
  Équipe. Deux écarts assumés : « Preuve d'achat » reste désactivé (aucun stockage de fichiers,
  §23.1) et « Exporter PDF » cède la place primaire à « Nouveau bon », seule des deux à exister.
- La maquette intitule la section **« BONS D'ACHAT · ACCÈS VERROUILLÉ »** avec un cadenas. Ce
  libellé décrivait une intention de conception ; depuis que `/vouchers` est gardé, il décrit
  l'état réel du compte qui regarde — il est donc rendu, mais seulement quand `vouchersForbidden()`.
- **`screen-modals.jsx` / `ScreenModalEditPostes`** a servi à reprendre la modale des postes
  (`roles-modal`), seule modale du dépôt à porter sa propre coquille au lieu de `bfd-modal-shell`.

⚠️ **La maquette est en avance sur le schéma.** La modale des postes y montre criticité, effectif
minimum, spécialisation, tranche horaire, pré-requis, référent, glisser-déposer et modèles —
**aucun** n'existe en base (`event_jobs` porte `count`, `jobs` porte `type`). Ce qui a été repris
est ce que des données réelles alimentent ; le reste attend une décision de modèle, pas un travail
d'intégration. Même prudence pour les libellés : « Enregistrer & relancer l'algo » a été écarté
parce que `saveRoleEdits` écrit les postes et recharge, sans relancer quoi que ce soit.

### Ce qui reste ouvert de ce lot

- ⚠️ **Aucune vérification à l'écran**, une fois de plus faute d'outil de navigateur — et ici elle
  compte double, car c'est le comportement d'un compte **sans** la permission qu'il faut voir. La
  marche à suivre est au §6 du spec ; il faut deux comptes, un `Pole Log` et un `Membre`.
- **Course refresh / bascule.** `toggleVoucherUsed` capture la ligne avant l'appel et la restaure en
  cas d'échec sans vérifier que la liste est de la même génération. Si un `refresh()` aboutit pendant
  qu'un PATCH est en vol et que ce PATCH échoue, la carte revient à sa valeur d'avant le refresh
  jusqu'au prochain rechargement. Même fenêtre pour `createVoucher`, où un POST chevauchant un
  refresh qui a déjà ramené la ligne insérerait un id en double (que `@for … track` refuse). Fenêtre
  étroite ; un compteur de génération sur `fetch()` la ferme.
- **Le message brut de l'API s'affiche en français.** `messageOf` préfère le message serveur, donc un
  refus rend « Missing permission: voucher:write » à l'écran. Inatteignable avec les rôles livrés
  (aucun ne porte `voucher:read` sans `voucher:write`), mais un texte dédié au 403 vaudrait mieux.
- **Le bouton de bascule perd le focus clavier** pendant l'écriture : `[disabled]` le retire de
  l'ordre de tabulation, et le focus part sur `<body>` sans revenir. `aria-busy` ne compense pas.
- Reste ouvert du §0 quater : `good_supplier_seeder` et ses 15 enseignes aléatoires ; l'édition et la
  suppression d'un bon, non branchées côté front.
- Le reste de l'API demeure ouvert à tout membre authentifié : `/vouchers` est le deuxième domaine
  gardé après members/roles. La généralisation est au §22.2 de `HANDOFF2.md`.

---

## 0 sexies. Stocks : boutons, défilement, création de produit, scanner — 2026-08-09

- **Les trois boutons de la topbar Stocks existaient mais disparaissaient.** Le rafraîchissement du
  sous-titre vivait dans un `effect` distinct de celui qui pousse le gabarit, et
  `PageHeaderService.set()` remet les actions à `null` : la topbar se vidait au premier chargement,
  sans erreur nulle part. **Règle générale : `set()` et `setActions()` dans le même `effect`, dans
  cet ordre** — c'est déjà ce que fait Équipe, et c'est la seule façon correcte.
- **Le défilement d'un seul bloc** venait de l'hôte : `<bfd-stocks>` n'a pas de hauteur, donc le
  `h-full` du gabarit ne résolvait rien et c'est le conteneur de l'app-shell qui défilait.
  `host: { class: 'block h-full' }` + une piste de grille en `minmax(0,1fr)` + `min-h-0` sur les
  enfants rendent au tableau et au panneau leur défilement propre. **Toute page à deux panneaux
  indépendants a besoin des trois.**
- **`/logistique/:id` (la liste de courses) n'était atteignable qu'en tapant l'URL** : aucune carte
  de soirée n'y menait. Corrigé.
- **`goods.barcode` existe désormais** (nullable, unique) et `GET /goods?barcode=` le résout. Le
  scanner n'est plus une maquette : il lit, empile une session, et crée un lot par ligne via
  `POST /stock-batches` — premier appel du front à cet endpoint.

### Deux pièges de `goods` que l'absence de test cachait

- **`brand` est `NOT NULL`.** Créer un produit sans marque partait en 500 depuis toujours. Le
  contrôleur applique `?? ''` ; le front n'envoie jamais `null`.
- **`unit` est un enum contraint** (`goods_unit_check` : `pcs`, `kg`, `liter`). Ce n'est pas du
  texte libre — toute autre valeur est refusée par la base, pas par une validation applicative.

### Ce qui reste ouvert

- ⚠️ **La migration doit tourner partout** (`node ace migration:run`) : sans elle,
  `GET /goods?barcode=` échoue sur une colonne absente.
- ⚠️ **`BarcodeDetector` n'est natif que sur Chrome et Edge.** Firefox et Safari desktop tombent sur
  la saisie manuelle, que l'écran annonce explicitement. Passer à `@zxing/browser` est un choix de
  dépendance, pas un correctif — à trancher si le besoin se confirme.
- La caméra exige **HTTPS ou localhost** : `getUserMedia` est refusé ailleurs.
- Le lot créé ne porte ni `label` (le numéro lisible du §18.1 de `HANDOFF2.md`) ni `restockId` : le
  scanner entre du stock, il ne trace pas encore un réassort.
- « Inventaire » (export) reste désactivé, aucun endpoint. `ScannerUnknownModal` n'est plus utilisée
  — la création passe par `GoodCreateModal`, qui reçoit le code scanné.
- La colonne « Emplacement » de la maquette n'a toujours aucune colonne derrière (§18.2).

---

## 0 septies. Chaîne alimentaire — menu de soirée et liste de courses — 2026-08-10, **partiel**

Back : branche `feat/chaine-alimentaire`, créée depuis `feat/logistics`, **9 commits**
(`64ba2da..af53424`). Front : **branche `main`** (choix explicite de l'utilisateur), 2 commits
(`e6b3b6a`, `c0bce2b`).
Spec : `docs/superpowers/specs/2026-08-10-chaine-alimentaire-design.md` · Plan :
`docs/superpowers/plans/2026-08-10-chaine-alimentaire.md` · Journal d'exécution :
`.superpowers/sdd/2026-08-10-chaine-alimentaire/progress.md`.

⚠️ **Lot interrompu par une limite de session, pas terminé.** Voir « Ce qui reste » plus bas.

| §     | Sujet                                      | État               | Où                                                                      |
| ----- | ------------------------------------------ | ------------------ | ----------------------------------------------------------------------- |
| §17   | `event_products` écrivable                 | ✅ **fait**        | `EventProductsController`, 4 routes sous `/events/:id/products`         |
| §17   | Liste de courses générée                   | ✅ **fait (back)** | `shopping_list_service.ts`, `GET /events/:id/shopping-list`             |
| §22.2 | Permissions `menu:read` / `menu:write`     | ✅ **fait**        | `menu:read` dans `BASE`, `menu:write` pour `Coordinateur` et `Pole Log` |
| §2.2  | Seeders exploitables                       | ✅ **fait**        | 3 enseignes, 10 denrées, 5 recettes nommées, prix déterministes         |
| —     | Front : store du menu + migration caisse   | ✅ **fait**        | `EventsStore`, `MenuItem`, `caisse.store.ts`                            |
| §17   | Front : vue par soirée sur données réelles | ✅ **fait**        | `logistique/events/`, pas-à-pas débouncé                                |
| §17   | Front : liste de courses générée           | ✅ **fait**        | `/logistique/:id`, deux sections, 403 comme état                        |
| —     | Vérification à l'écran                     | ❌ **non faite**   | Task 9 du plan                                                          |
| —     | PrimeNG importé jamais déclaré             | ✅ **retiré**      | voir plus bas                                                           |

### Quatre choses à savoir avant de reprendre, qui ne se relisent pas dans le code

- **`node ace db:seed` est la MAUVAISE commande, et le handoff le disait à tort.** Elle
  auto-découvre _tous_ les fichiers de `database/seeders/` par ordre alphabétique — et
  `main_seeder.ts` est l'un d'eux, qui ré-invoque lui-même la plupart des autres. Chaque seeder
  orchestré tourne donc **deux fois** (mesuré : 30 soirées au lieu de 10, 40 mouvements de stock au
  lieu de 20). La commande correcte est :
  `node ace db:seed --files="./database/seeders/main_seeder.ts"`.
  ⚠️ Cela vaut aussi pour le **déploiement**, où les §0 bis et §0 quinquies prescrivent `db:seed`
  pour installer les permissions RBAC.
- **`db:seed` ne fonctionnait pas du tout jusqu'à ce lot.** `TransactionFactory` produisait
  `type: 'credit' | 'debit' | 'refund'` contre une contrainte `CHECK (type IN ('cash','lydia'))`.
  `main_seeder` appelle `TransactionSeeder` à son **étape 1**, donc il mourait là et ses étapes 2 à 5
  n'ont **jamais** tourné. C'est l'explication rétrospective de la base de dev encombrée que le §2.2
  attribuait au seul `good_supplier_seeder` : seul le repli alphabétique fonctionnait, avec
  `event_product_seeder` avant `event_seeder`, `restock_seeder` avant `supplier_seeder`, etc.
  Corrigé (`ed665a8`).
- **La catégorie d'une recette est dérivée, jamais stockée.** `products` n'a pas de colonne de
  catégorie ; celle de l'ingrédient de plus bas `rank` en fait office. La caisse en dépend pour ses
  onglets. La dérivation vit maintenant dans `app/services/product_category_service.ts` —
  ⚠️ **`ProductsController` en porte encore une copie privée** (`primaryCategoryName`) et devrait
  consommer le service : non migré parce que le fichier était en cours de modification par un autre
  chantier.
- **`MenuItem` n'était pas une amorce morte.** Le spec l'affirmait sur la seule base que `menuStatus`
  n'apparaissait qu'une fois dans le dépôt. En réalité `caisse.store.ts` lit `sessionEvent()?.menu`,
  construit ses onglets sur `item.category` et clé ses lignes de panier sur `item.recipeId`. La
  caisse a donc été migrée dans le même lot (`CartLine.recipeId: string` → `productId: number`), et
  son menu cesse d'être structurellement vide.

### L'économie multi-enseigne se calcule sur les denrées seules

`optimumTotal` est le coût du **panier complet** (denrées + non-alimentaire) parce que c'est le KPI
« coût estimé » de la maquette. Mais `savings` se calcule contre un optimum **denrées seules**, parce
que les totaux par enseigne ne comptent que les denrées — `furnitures` n'a aucune relation
fournisseur. Mélanger les deux donnait une économie **négative** dès qu'une soirée comportait du
non-alimentaire (mesuré : 70 − 84 = −14 € là où le vrai gain était +10 €). Aucun test ne couvrait la
combinaison non-alimentaire + enseignes qui pricent, d'où 8 tests verts sur un calcul faux.

### Le drapeau de couverture n'est pas informatif, il est porteur

Une enseigne qui ne référence que 3 denrées sur 12 affiche le total le plus bas **parce qu'elle en
compte moins**. `SupplierTotal.fullCoverage` existe pour ça, son dénominateur ne compte que les
lignes de denrées, et il conditionne le calcul de `savings`.

### Ce qui reste

- **Deux compteurs de génération, pas un.** Le plan prescrivait un compteur partagé entre
  `loadShoppingList()` et `fetch()` de `LogistiqueStore`. C'est faux : les deux démarrent dans le
  même `ngOnInit`, donc un compteur commun fait **toujours** jeter la réponse de `fetch()` comme
  périmée. D'où `shoppingListGeneration` et `fetchGeneration` séparés.
- **Code mort à nettoyer** : `CartRow` et `SupplierTotal` dans `logistique.types.ts` ne servent plus
  depuis que le comparatif catalogue a disparu, et `LogistiqueStore.fetch()` appelle encore
  `svc.getGoods()` alors que la page ne le consomme pas — une requête HTTP inutile par chargement.
- **`LogistiqueAssignModal` est restée factice** alors que la gestion des recettes est désormais
  réelle et en ligne dans la carte de soirée. À retirer ou à brancher, pas à laisser.
- ⚠️ **Aucune vérification à l'écran**, quatrième lot d'affilée. Le préalable, lui, est **levé** :
  voir « Comment se connecter » ci-dessous.
- **Seeders encore non idempotents**, signalés non corrigés : `member_seeder`, `event_seeder`,
  `restock_seeder` (les lignes `restocks`), `stock_batch_seeder`, `stock_movement_seeder`,
  `transaction_seeder`. Ils doublent à chaque `db:seed` nu.
- **`product_furniture_seeder` attache `furnitures[0]` et `[1]` par index**, à quantité 2 et 5, à
  _chaque_ recette — soit 5 nappes jetables par hot-dog, 3 750 pour une soirée. Arbitré comme sans
  importance (les seeders sont dev-only et la production ne les lancera pas), mais la liste de
  courses affichera ce chiffre.
- **`reloadLine` relance tout `loadEventWithMenu`** pour extraire une seule ligne ; **N+1** sur le
  chargement des lots dans `shopping_list_service` (~2N aller-retours) ; `supplierTotals` est trié
  par total croissant **sans** privilégier la couverture complète, si bien que `supplierTotals[0]`
  peut être l'enseigne la moins couvrante. Tous mesurés acceptables aux tailles actuelles.
- **La disparition du comparatif catalogue** sur `/logistique/:id` est un choix assumé (§4.3 du
  spec), pas une régression : la liste se **génère**, elle ne se saisit pas.

### Vérification réelle effectuée — API et permissions, pas les écrans

Pas de navigateur disponible dans la session (ni `chromium-cli`, ni Playwright, ni Chromium en
cache ; l'installer représentait ~150 Mo sur la machine de l'utilisateur pendant qu'il y travaillait).
La moitié comportementale a donc été vérifiée **contre le serveur réel**, avec les vrais comptes et
le vrai flux de connexion — c'est-à-dire précisément ce que le spec désignait comme prioritaire,
« le comportement d'un compte _sans_ la permission ».

Avec **`log@bae.test`** (`Pole Log`), sur la soirée 4 :

- `GET /events/4/products` → **200**, et `category` **peuplée** (`Boissons`, `Sec`, `Frais`) : la
  dérivation par ingrédient de plus bas rang fonctionne de bout en bout.
- `PATCH .../products/5 {quantity: 275}` → **200**, quantité écrite et `price` **inchangé à 250** :
  la sémantique « clé absente = ne touche pas à cette colonne » tient.
- `GET /events/4/shopping-list` → **200**, 11 lignes, optimum 7 894,89 €, économie **+183,03 €**,
  `unpriced_count` 0, les trois enseignes à couverture complète (Auchan la moins chère à 6 040,92 €).
  Le `besoin` de la bière y valait **275** — donc la liste refléait immédiatement le `PATCH` : le
  calcul est vivant, pas mis en cache.

Avec **`membre@bae.test`** (socle seul) :

| Requête                 | Statut                                   | Ce que ça démontre                                                               |
| ----------------------- | ---------------------------------------- | -------------------------------------------------------------------------------- |
| `GET .../products`      | **200**                                  | `menu:read` est bien au socle : l'assemblage reste lisible                       |
| `GET .../shopping-list` | **403** `Missing permission: stock:read` | la garde à deux permissions est un **ET**, et `stock:read` est la vraie barrière |
| `PATCH .../products/5`  | **403**                                  | `menu:write` est bien réservé                                                    |

**Ce qui reste non vérifié : le rendu des deux écrans.** Le pas-à-pas débouncé, les deux sections
denrées / non-alimentaire, le panneau « Accès restreint » et les KPIs à `—` n'ont été éprouvés que
par les 534 tests Vitest.

Deux observations à porter au débit du lot :

- **Le message de refus arrive brut en anglais.** `Missing permission: stock:read` est ce que l'API
  renvoie, et le §0 quinquies l'avait signalé comme point ouvert sans qu'il soit alors atteignable.
  Il l'est maintenant : un `Membre` sur `/logistique/:id` le recevra. Le panneau « Accès restreint »
  doit donc primer sur `messageOf`, et non l'afficher.
- **Bruit de virgule flottante dans les nombres de l'API** : `183.03000000000065`,
  `9.930000000000001`. Sans conséquence à l'écran (`formatPrice` fait `toFixed(2)`), mais tout
  consommateur qui comparerait ces valeurs à l'égalité se ferait piéger.

### Comment se connecter après un reset — `dev_account_seeder`

`member_seeder` passe par `UserFactory`, qui tire `faker.internet.email()` et
`faker.internet.password()`, **consignés nulle part** : aucun compte semé n'a jamais été utilisable,
et après un `migration:fresh` l'application devenait littéralement inaccessible. Quatre comptes
connectables existent désormais, mot de passe commun **`bae-dev-password`** :

| Email             | Rôle             | Pourquoi celui-là                                            |
| ----------------- | ---------------- | ------------------------------------------------------------ |
| `admin@bae.test`  | `Administrateur` | passe-partout                                                |
| `log@bae.test`    | `Pole Log`       | porte `menu:write` **et** `stock:read` : voit et écrit tout  |
| `coordo@bae.test` | `Coordinateur`   | écrit le menu, lit la liste de courses                       |
| `membre@bae.test` | `Membre`         | socle seul : lit le menu, **refusé** sur la liste de courses |

⚠️ **Le seeder porte deux gardes, et c'est la seconde qui protège.** `static environment` n'est lu
que par le runner d'Adonis quand il _découvre_ les fichiers ; `main_seeder` fait
`new Seeder(client).run()`, un appel manuel qui la court-circuite entièrement. Comme le déploiement
lance `db:seed` pour installer les permissions RBAC, la seule déclaration aurait créé quatre comptes
à identifiants connus **en production**. D'où le `if (app.inProduction) return` dans `run()`.

Son test ne vérifie pas la présence des lignes : il passe par `User.verifyCredentials`, le chemin
réel qu'emprunte `AccessTokenController.store`, et couvre donc le hachage du mot de passe. Un seeder
qui crée des comptes que la connexion refuse échouerait sinon uniquement à l'écran.

### ⚠️ Trois dépendances référencées et jamais déclarées — `main` ne compile pas depuis un clone neuf

Trouvé pendant ce lot, **antérieur à lui**, et sans doute la cause de la série de commits
`ci: fix pnpm` / `ci: fix ci` :

| Référence, dans du code commité                      | Dans `package.json` | Dans `pnpm-lock.yaml` |
| ---------------------------------------------------- | ------------------- | --------------------- |
| `src/app/app.config.ts:10` → `primeng/config`        | ❌                  | ❌                    |
| `src/app/app.config.ts:11` → `@primeuix/themes/aura` | ❌                  | ❌                    |
| `src/styles.css:4` → `primeicons/primeicons.css`     | ❌                  | ❌                    |

Un `pnpm install` depuis un clone propre ne peut donc pas les fournir, et `pnpm run typecheck`
comme `pnpm run build` échouent. Sur le poste courant ça passe parce que `node_modules` contient
des restes ; la CI, elle, part d'un cache vide.

**Deux lectures, à trancher :** soit PrimeNG est voulu et les trois paquets doivent être déclarés
(avec leurs versions), soit c'est un ajout abandonné — le projet a ses propres composants `bfd-*`
et Tailwind 4, et PrimeNG n'apparaît nulle part ailleurs que dans ces trois lignes. Dans le second
cas ce sont les trois lignes qu'il faut retirer, pas les dépendances qu'il faut ajouter.

⚠️ Conséquence sur les chiffres de test de ce lot : le `519/519` de la vue par soirée a été obtenu
avec des paquets **fictifs** posés localement dans `node_modules` pour débloquer la vérification.
Sans conséquence pour les specs concernées, qui n'utilisent pas PrimeNG, mais le nombre ne vaut que
sous cette réserve.

Note d'outillage : le dépôt est en **pnpm** (`packageManager: pnpm@10.33.3`) et `npm test` échoue
avec `EBADDEVENGINES`. Les commandes sont `pnpm test` et `pnpm run typecheck`.

### Pièges de méthode que ce lot a coûtés

Sept défauts ont été trouvés pendant l'exécution, **tous les sept dans le plan**, aucun dans
l'implémentation. Ce qui les réunit : des vérifications faites à moitié. `menuStatus` grepé et
conclusion tirée sur `MenuItem`. `supplier_seeder` listé sans chercher qui d'autre crée des
`suppliers`. Une formule de variation de prix écrite sans dérouler son algèbre (elle multipliait les
trois enseignes par le même facteur, donc ne pouvait pas changer la moins chère). Une contrainte
`NOT NULL` citée sans être relue.

Deux d'entre eux produisaient du code faux **avec une suite de tests verte**, parce que les tests
venaient de la même main que l'erreur. Ce sont les deux que seule la relecture a vus.

---

## 0 octies. Production, FEFO et retour en stock — ✅ livré le 2026-08-11

Branche `feat/production-fefo` **dans les deux dépôts**, non poussée. Back : 8 commits
(`802615e..705a423`), **257 tests**, `tsc --noEmit` propre. Front : 1 commit (`7f80e88`),
**130 fichiers / 537 tests**, typecheck vert.
Spec : `docs/superpowers/specs/2026-08-11-production-fefo-design.md` · Plan :
`docs/superpowers/plans/2026-08-11-production-fefo.md` (tous deux **hors git**, `docs/superpowers/`
est dans le `.gitignore`).

Ce lot ferme la **dernière étape de la chaîne alimentaire** (§30.2 de `HANDOFF2.md`) et répond à
deux exigences à **priorité 5** : « prendre en priorité les aliments proches de péremption » et
« affecter un numéro de lot pour le stockage ».

| §     | Sujet                                     | État            | Où                                             |
| ----- | ----------------------------------------- | --------------- | ---------------------------------------------- |
| §18.1 | Numéro de lot visible                     | ✅ **fait**     | `label` exposé, panneau Stocks                 |
| §18.1 | Plan de prélèvement FEFO                  | ✅ **fait**     | `app/services/production_service.ts`           |
| §18.1 | Endpoint de prélèvement                   | ✅ **fait**     | `POST /events/:id/production-runs`             |
| —     | Trace de production                       | ✅ **fait**     | table `production_runs`                        |
| —     | Retour en stock en fin de soirée          | ✅ **fait**     | `POST /events/:id/production-returns`          |
| —     | Le restant compte les mouvements d'entrée | ✅ **corrigé**  | `stock_service.ts`                             |
| —     | Les deux écrans de production             | ❌ **hors lot** | §32 de `HANDOFF2.md` — attendent `soiree/live` |

### Le back est livré **sans consommateur front**, et c'est délibéré

Les deux gestes (lancer une production, déclarer les restes) vivront sur `soiree/live`, décision
prise avec l'utilisateur. Cette page est aujourd'hui **entièrement factice** et ne sait même pas
quelle soirée elle affiche — la rendre réelle est un lot à part entière, décrit au **§32 de
`HANDOFF2.md`**. Y brancher un flux réel en passant aurait reproduit le piège du §1 (« boutons qui
n'appellent rien de réel »).

Seule la moitié « numéro de lot » a son écran, sur la page Stocks, qui ne dépend pas de `soiree/live`.

### Trois choses qui ne se relisent pas dans le code

- **`'in'` était un type mort, et le ressusciter était le vrai travail.**
  `stock_movements.movement_type` est un enum `['in','out']` depuis la migration d'origine ; **aucun
  code applicatif n'écrivait de `'in'`**, et les deux dérivations du restant le **filtraient
  activement**. Une remise en réserve aurait été parfaitement enregistrée et parfaitement sans effet
  (mesuré : 60 au lieu de 75). La formule est passée à `max(0, quantity − Σout + Σin)`.
  ⚠️ `openedAt` continue de ne regarder que les `'out'` : un retour ne désouvre pas un paquet.
- **Le rebut n'écrit rien, et le gaspillage n'est pas perdu pour autant.** La sortie a eu lieu au
  lancement ; jeter, c'est ne pas recréditer. Les deux boutons de la future modale se distinguent
  donc par leur **effet sur le stock**, pas par une trace. Mais `Σout − Σin` dit ce qui n'est pas
  revenu, et `production_runs.quantity − Σ order_products` donnera le vrai chiffre **le jour où
  `orders` aura un contrôleur** (§3.4). Seul reste indistinguable le rebut qui n'est pas un écart :
  un paquet tombé, une denrée jetée avant l'assemblage.
- **Les lots périmés sont exclus du plan FEFO.** Le FEFO sert à ne pas gâcher, pas à faire manger du
  périmé ; un lot périmé sort par `discard`, qui existait déjà. La maquette disait la même chose
  sans qu'on l'ait lue ainsi : elle met « prendre en 1er » sur le lot **proche**, et « Mettre au
  rebut » sur le périmé.

### Deux factories fabriquaient des données fausses, invisibles aux tests

Même faute de classe, trouvée à deux moments différents :

- **`stock_movement_factory` tirait `movementType` au hasard** entre `'in'` et `'out'`. Inoffensif
  tant que la formule ignorait les entrées — et gonflant le stock de dev dès la ligne corrigée.
- **`stock_batch_factory` remplissait `label` avec `faker.commerce.productName()`.** Le panneau
  Stocks affichait donc « Handmade Bamboo Ball » et « Luxurious Ceramic Towels » comme numéros à
  lire sur l'étagère. **Trouvé en éprouvant l'API contre le serveur réel, pas par les tests** — qui
  posent leurs propres libellés et ne pouvaient pas le voir. La forme reprend désormais celle de
  `StockBatchesController.nextLabel()` : `L<yy>-<n>`.

⚠️ **Les lots déjà en base gardent leurs libellés absurdes.** La correction ne vaut que pour les
données semées après elle ; un `migration:fresh` + reseed les remet d'aplomb.

### Vérification réelle effectuée — l'API, contre le serveur, avec les vrais comptes

Cinquième lot d'affilée où « aucune vérification à l'écran » figurait aux points ouverts. Celui-ci
porte une contre-mesure : tout le cycle a été éprouvé contre `node ace serve` réel.

Avec **`log@bae.test`** (`Pole Log`) :

| Requête                                                          | Résultat observé                                                                  |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `POST /events/1/production-runs` `{productId:1, qty:10, dryRun}` | **200**, plan par denrée avec `label`, `expiration_date`, `take_qty`              |
| `POST /events/1/production-runs` sans `dryRun`                   | **409 `E_STOCK_INSUFFICIENT`** — « Pain hot-dog x12 (manque 10), Oignons frits… » |
| relecture après le 409                                           | `produced_qty` **toujours 0** : le refus est atomique, rien n'a été pris          |
| `POST /events/4/production-runs` `{productId:5, qty:3}`          | **200**, lot 10 passé de **44 → 41**                                              |
| `POST /events/4/production-returns` `{goodId:10, qty:2}`         | **200**, lot 10 passé de **41 → 43**, `opened_at` **conservé**                    |
| même retour, `qty:5`                                             | **400 `E_RETURN_EXCEEDS_PICKED`** — « plus que ce que la soirée a prélevé (1) »   |
| `GET /events/4/production-runs`                                  | « Bière pression 25cl → prévu 275 / produit 3 / 1 lancement »                     |

Avec **`membre@bae.test`** (socle seul) : les trois routes → **403**. `stock:read` et `stock:update`
sont donc bien les barrières, et aucune permission nouvelle n'a été créée.

⚠️ **Ce qui reste non vérifié : le rendu de la page Stocks à l'œil.** Aucun outil de navigateur dans
la session, comme aux lots précédents. Le filet n'est pas nul pour autant : le test Vitest ajouté
assert sur le **DOM réellement rendu** (`fixture.nativeElement.textContent`) et vérifie que `#L26-1`
et `#L26-2` s'affichent, que le badge « prendre en 1er » apparaît **une seule fois**, et qu'il n'est
pas sur le lot périmé.

⚠️ La vérification a laissé en base de dev **un lancement de production (id 50) et ses mouvements**
sur la soirée 4. Données de développement, sans conséquence, mais elles existent.

### Deux pièges de test rencontrés, à connaître avant d'en écrire d'autres

- **`fixture.whenStable()` n'attend pas une promesse nue, en mode zoneless.** La page Stocks charge
  ses lots par `lastValueFrom(...).then(...)` ; sans Zone.js, Angular n'en a **aucune connaissance**
  et rend la main avant que la chaîne n'aboutisse — le test voyait « Chargement des lots… ». Il faut
  céder explicitement la main à la file de microtâches
  (`await new Promise((r) => setTimeout(r, 0))`).
- **La base de test n'est pas vide, et `withGlobalTransaction` n'y change rien.** Compter une table
  entière (`StockMovement.query().count()`) compte les lignes semées. Toute assertion « rien n'a été
  écrit » doit être **scopée** aux données du test. Corollaire trouvé au passage : le test voisin
  `computes remaining quantity from OUT movements` fait un `assertBodyContains` **positionnel** sur
  un tableau trié par nom, avec un nom tiré par `faker` — il est vert par chance, pas par
  construction.

### Ce qui reste ouvert

- **Les deux écrans de production** — §32 de `HANDOFF2.md`, avec le lot « rendre `soiree/live`
  réelle » en préalable.
- **Le verrou `FOR UPDATE` est raisonné, pas éprouvé.** Les tests tournent sous
  `testUtils.db().withGlobalTransaction()`, qui enferme chaque test dans une transaction unique :
  deux connexions concurrentes n'y sont pas exprimables sans sortir du harnais. Le code prend bien
  `SELECT … FOR UPDATE` ordonné par `id`, aucun test ne le démontre.
- **Le non-alimentaire n'est jamais prélevé.** `furnitures` porte un compteur plat, sans lots ni
  grand livre de mouvements : le décrémenter serait destructif et irréversible. Produire 200
  hot-dogs décrémente les saucisses et les pains, **pas** les barquettes — à dire à l'écran le jour
  où l'écran existera.
- **`pnpm run typecheck` échoue côté back** sur un contrôle de synchronisation du lockfile,
  antérieur à ce lot. `npx --no-install tsc --noEmit` passe proprement.

---

## 0 nonies. Écrans de production, clôture de soirée, et la caisse enfin ouvrable — 2026-08-11

Suite immédiate du §0 octies, même branche `feat/production-fefo`.
Back : 1 commit (`4600644`). Front : 2 commits (`252fac4`, `b15f9a0`), **546 tests**, typecheck vert.

| Sujet                                                         | État             | Où                                              |
| ------------------------------------------------------------- | ---------------- | ----------------------------------------------- |
| `GET /events/:id/production-returns`                          | ⚠️ **non testé** | `loadReturnState()` — voir l'encadré ci-dessous |
| `soiree/live` sait quelle soirée elle pilote                  | ✅ **fait**      | `EventsStore.activeEvent`                       |
| Panneau de production (prévu / produit, lancement en 2 temps) | ✅ **fait**      | `ProductionRunModal`                            |
| Clôture : réserve ou rebut, par denrée                        | ✅ **fait**      | `ProductionReturnModal`                         |
| Les panneaux factices sont **annoncés** comme tels            | ✅ **fait**      | bandeau + boutons désactivés avec `title`       |
| La caisse s'ouvre sur la soirée en cours                      | ✅ **fait**      | `CaisseStore.todayEvent`                        |

### ⚠️ Le back de ce lot n'a pas pu être testé — la base de dev s'est arrêtée

`bae-postgres-dev` s'est arrêté (code 0) pendant la session, et le port 5432 est tenu par
`gbe-postgres-1`, le postgres d'un autre projet, qui n'a **pas de rôle `bae_back`**. Toute la suite
back échoue donc sur `password authentication failed for user "bae_back"`.

Conséquence exacte, à ne pas arrondir : les **trois tests** de `GET /events/:id/production-returns`
sont écrits et **n'ont jamais tourné**. Seul `npx --no-install tsc --noEmit` est passé, proprement.
Les 257 tests du §0 octies, eux, étaient verts avant l'arrêt. **Relancer `node ace test` dès que le
conteneur est relancé** — ce qui suppose de libérer le port 5432.

### La caisse était inatteignable depuis toujours, et ce n'était pas un oubli de câblage

`EventsService.currentActiveEvent` était un **`computed(() => { return null })` inconditionnel**.
`CaisseStore.todayEvent` en dérivait entièrement : l'écran affichait donc en permanence « Aucune
soirée n'est programmée pour aujourd'hui. La caisse ne peut pas être ouverte », **quel que soit
l'état réel des soirées**, et `startSession()` sortait immédiatement.

Le même mensonge touchait `OrdersService.orders`, filtré sur cette valeur nulle : la liste était
toujours vide, et `pendingCount` / `inProgressCount` toujours à zéro.

**La dérivation vit désormais dans `EventsStore.activeEvent`, à un seul endroit** — la plus proche
des soirées non clôturées. La vue live et la caisse doivent désigner **la même** soirée : deux
calculs séparés finiraient par diverger, et on encaisserait sur une soirée pendant qu'on produirait
pour une autre. Le stub a été **supprimé**, pas contourné : un calcul qui rend toujours `null` est un
piège pour le prochain appelant.

⚠️ Second manque trouvé au passage : **`startSession()` n'a jamais chargé le menu.** La grille
d'articles lit `sessionEvent()?.menu` et rien d'autre ne le remplissait — la caisse se serait ouverte
vide, sans erreur nulle part. `startSession` appelle désormais `loadEventMenu`.

### ⚠️ Deux pièges de signaux, qui ont coûté deux passes et un worker de test

Ils valent pour **tout** effect de ce dépôt qui déclenche un chargement.

1. **Un effect ne doit pas dépendre de l'objet dont son propre chargement fait un `patchState`.**
   Dépendre de `activeEvent()` alors qu'on appelle `loadEventMenu()` — qui `patchState` le
   dictionnaire dont `activeEvent` dérive — crée une rétroaction. Dépendre de
   l'**identifiant** (`activeEventId`, une chaîne) suffit à casser le cycle : la valeur reste égale
   quand le dictionnaire est remplacé.
2. **Ça ne suffit pas.** Un effect suit aussi le **préambule synchrone des fonctions `async` qu'il
   appelle** : `loadEventMenu()` commence par `const current = store.events()[eventId]`, exécuté
   avant le premier `await`, donc **dans** le contexte réactif — le dictionnaire redevient une
   dépendance par la porte de derrière. Il faut `untracked()` autour des appels.

Sans les deux, la boucle épuise le tas : **4 Go et worker Vitest tué**, mesuré. Le symptôme n'est pas
un test rouge mais un `FATAL ERROR: Ineffective mark-compacts near heap limit`, ce qui n'oriente
vers rien.

### Un piège de test, propre au mode zoneless

`fixture.whenStable()` **n'attend pas une promesse nue**. Les pages chargent par
`lastValueFrom(...).then(...)` ; sans Zone.js, Angular n'en a aucune connaissance et rend la main
avant que la chaîne n'aboutisse. Il faut céder la main à la file de microtâches
(`await new Promise((r) => setTimeout(r, 0))`) — et, quand c'est un `effect` qui déclenche la
requête, appeler `fixture.detectChanges()` **avant** de l'attendre : un effect ne tourne qu'à la
détection de changements.

### La règle « quelle soirée » — corrigée le 2026-08-11 après signalement

Première version : « la plus proche parmi les non clôturées ». **Faux**, et la caisse proposait alors
d'encaisser sur une soirée de **2027**. Deux défauts sur la même ligne :

- **La sémantique.** Le dépôt disait déjà la bonne règle et je ne l'ai pas lue : le champ s'appelle
  `CaisseStore.todayEvent`, et le texte de son état vide dit « Aucune soirée n'est programmée **pour
  aujourd'hui** ». Élargir à « la prochaine à venir » contredisait le nom et la copie.
- **Le tri.** `new Date(dto.date)` sur une date absente donne `Invalid Date`, dont `getTime()` vaut
  `NaN`. Un comparateur qui rend `NaN` laisse le tri **ne rien réordonner** : l'ordre d'arrivée de
  l'API l'emporte, et une soirée lointaine sort en tête sans être la plus proche. C'est ce qui rendait
  le choix « ni le plus proche, ni celui du jour ».

**Règle en vigueur**, dans `EventsStore.activeEvent` et nulle part ailleurs :

1. une soirée explicitement **`ongoing`** — le bureau l'a ouverte, elle prime ;
2. sinon, une soirée non clôturée **datée d'aujourd'hui** ;
3. sinon **rien**, et les écrans le disent.

Les dates invalides passent en dernier, explicitement. Préparer une soirée future est le rôle de la
**Logistique**, pas d'un écran de service — relâcher cette règle rouvrirait exactement le bug.

### La maquette inventée de `soiree/live` a été supprimée

Signalé le 2026-08-11 : la page affichait toujours ses données factices. Elles ne sont plus
annoncées, elles sont **parties** — plus de 400 lignes : file de tickets à trois colonnes avec noms
de clients, KPIs d'encaissement, cadence, flux de transactions, alertes, stock critique. Aucune ne
consommait d'endpoint.

**515 → 213 lignes de TS, 480 → 145 de gabarit.** Un test garde désormais leur absence : des chiffres
faux sur un écran de service sont pires qu'un écran vide, parce qu'on les croit.

Ce qui reste est branché : la soirée réelle, l'horloge, l'heure de début lue sur la soirée (et non
plus la constante `'19:30'`), la production et sa clôture. Un encart dit ce que la page ne fait pas
encore.

#### Comment récupérer la file de tickets le jour où `orders` existera

**Rien n'est perdu.** Le commit de suppression est `c5bb77a` ; son parent porte les 514 lignes du
gabarit et le composant complet :

```bash
git show c5bb77a^:src/app/pages/authed/soiree/live/live.html
git show c5bb77a^:src/app/pages/authed/soiree/live/live.ts
```

⚠️ **Récupérer le gabarit, réécrire les types.** Ce qui vaut d'être repris est la **mise en page** :
les trois colonnes, les minuteurs colorés, les cartes de commande. Le modèle, lui, a été dessiné à
l'envers — `Ticket` porte un `client: string`, un temps écoulé calculé depuis un nombre de secondes
en dur et un statut à trois valeurs inventé pour la maquette. Rien de tout ça ne vient
d'`order_products`.

Reprendre ces interfaces telles quelles ferait plier l'API sur une forme née d'une maquette, ce qui
est exactement le piège que le §0 septies raconte à propos de `MenuItem` (il portait `servings` et
`prepNotes` que rien n'alimentait). La **source d'interface** est
`screen-soiree-live.jsx` dans Claude Design, pas le code supprimé.

### Ce qui reste ouvert

- ~~**Les trois tests du nouvel endpoint n'ont pas tourné**~~ — **fait le 2026-08-11**, voir §0
  decies : `bae-postgres-dev` relancé, `node ace test` intégralement vert (260 tests).
- **La file de commandes, les KPIs d'encaissement et le stock critique** attendent `orders`, sans
  contrôleur (§3.4). Le §32 de `HANDOFF2.md` décrit le lot.
- **La caisse n'encaisse toujours pas.** Elle s'ouvre, affiche le menu réel et remplit un panier —
  mais `orders` n'a aucun contrôleur côté back (§3.4), donc rien n'est enregistré.
- **`soiree/bilan` n'a pas été touchée** et reste entièrement factice.
- ~~Aucune vérification à l'œil de ces écrans~~ — **faite le 2026-08-11** pour Équipe, Logistique
  (bons + liste de courses), Stocks/lots, soirée/live et caisse ; voir §0 decies. `soiree/bilan`
  n'était pas dans ce périmètre et reste à vérifier.

---

## 0 decies. Clôture des points ouverts du §0 nonies et de HANDOFF2 §18/20/22 — 2026-08-11

Suite immédiate du §0 nonies, même branche `feat/production-fefo` des deux côtés.
Back : 2 commits (fix `assignments_controller.ts` + tests). Front : 3 commits (thème,
`puppeteer-core` en devDependency, ce fichier). Back **262 tests**, front **551 tests** (130
fichiers), typecheck vert des deux côtés.

| Sujet                                                             | État                | Où                                                                  |
| ----------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------- |
| Les 3 tests de `production-returns` (jamais exécutés)             | ✅ **fait**         | `bae-postgres-dev` relancé, 260 tests verts avant ce lot            |
| Affectation manuelle verrouillée d'office                         | ✅ **fait**         | `assignments_controller.ts:102`, `locked ?? true`                   |
| Chemin d'écriture de `openedAt`                                   | ✅ **vérifié**      | rien à corriger — voir `HANDOFF2.md` §18.2                          |
| Thème : écran de préférences à 3 choix                            | ✅ **déjà fait**    | §22.5 de `HANDOFF2.md` était fondé sur une lecture obsolète du code |
| `logout$` effaçait `bae_theme`                                    | ✅ **corrigé**      | `auth.effect.ts`, préserve la clé avant `localStorage.clear()`      |
| `.claude/CLAUDE.md` annonçait « AdonisJS 6 »                      | ✅ **déjà corrigé** | plus la peine d'y revenir                                           |
| Vérification à l'écran (Équipe, Logistique, Stocks, live, caisse) | ✅ **faite**        | `puppeteer-core` + Chrome local, voir plus bas                      |

### Le back a de nouveau perdu sa base de dev pendant la session

Même symptôme qu'au §0 nonies : `bae-postgres-dev` s'est arrêté (code 0) tout seul, cette fois
entre le premier lancement de `node ace test` et le second. Ce n'est donc pas un incident isolé du
lot précédent — le conteneur semble s'arrêter spontanément après quelques minutes d'inactivité, à
surveiller si ça recommence. `docker start bae-postgres-dev` suffit à repartir ; aucune donnée
perdue (volume persistant).

### Le dépôt back a changé de branche tout seul en cours de session

Découvert via `git reflog` : `BAE-Back` est passé de `feat/production-fefo` à `feat/member-crud`
sans commande explicite de ce lot — le `reflog` pointe vers un `checkout` externe (l'IDE de
l'utilisateur, IntelliJ/PhpStorm, avait aussi fait une série de `reword` sur l'historique juste
avant). Conséquence concrète : un premier `node ace test` a tourné sur `feat/member-crud` (161
tests, la mauvaise branche) sans que rien ne le signale — le nombre de tests est la seule alarme.
**Toujours vérifier `git branch --show-current` avant un geste qui dépend de la branche**, surtout
si une commande git a été lancée depuis la dernière vérification et qu'un IDE tourne en parallèle.
Remis sur `feat/production-fefo` sans perte : le seul fichier modifié était un artefact de codegen
auto-généré (`.adonisjs/**`, jamais à éditer à la main de toute façon).

### Vérification à l'écran — première fois outillée depuis six lots

`puppeteer-core` (paquet léger, sans Chromium embarqué) pointé vers le Chrome déjà installé sur la
machine évite le téléchargement de ~150-300 Mo que les lots précédents avaient justement refusé de
payer. Script ad hoc, non commité, contre les deux serveurs de dev réels et les quatre comptes de
`dev_account_seeder`. 13/14 vérifications passent du premier coup ; la 14ᵉ n'était pas un bug :

- **Le libellé de lot périmé traîne encore en base.** Un lot de « Bière blonde 25cl x24 » affiche
  toujours `#Practical Plastic Fish` au lieu de `#L26-x` — exactement la réserve notée au §0
  octies (« les lots déjà en base gardent leurs libellés absurdes, seul un reseed les corrige »).
  Pas un nouveau bug, la confirmation à l'écran d'un point déjà écrit.
- **Piège de route retombé dedans une fois** : `/logistique` n'affiche plus le panneau bons
  d'achat / liste de courses depuis le §0 septies — c'est devenu la liste des soirées
  (`LogistiqueEvents`), et le panneau vit désormais sur `/logistique/:id`. Le premier passage du
  script testait `/logistique` et concluait à tort que le panneau « bons d'achat » était absent
  pour `membre@bae.test` (donc pas gardé) ; en réalité c'est la mauvaise page. Corrigé en pointant
  vers `/logistique/4`, où les deux gardes (`vouchers-forbidden`, `shopping-list-forbidden`) se
  comportent comme documenté au §0 quinquies et au §0 septies.
- **`soiree/live` et `caisse` vérifiées en conditions réelles** : aucune soirée n'était `ongoing`
  ni datée d'aujourd'hui dans les données semées (toutes en 2027), donc l'événement 4 a été mis en
  `ongoing` via l'API le temps du test puis **remis à `scheduled`** ensuite — aucune donnée de
  démonstration laissée modifiée. `soiree/live` affiche la vraie soirée, les 5 recettes du menu
  avec leurs objectifs, et l'encart « ce qui n'est pas encore ici » ; `caisse` propose « Lancer la
  session pour <soirée du jour> » plutôt que le faux « aucune soirée » d'avant §0 nonies.
- **Équipe** vérifiée avec `admin@bae.test` (14 membres, rôles réels, aucun `?`) et
  `membre@bae.test` (redirigé vers l'accueil, faute de `role:read` — comportement attendu).

### Ce qui reste ouvert

- **Les libellés de lots absurdes antérieurs à la correction persistent** — seul un
  `migration:fresh` + reseed les corrige, pas fait ici pour ne pas perdre l'état de dev courant
  (production run id 50 du §0 octies, entre autres).
  `soiree/bilan` n'a toujours pas été vérifiée à l'écran (hors périmètre de ce lot).
- Le reste des points ouverts du §0 nonies (`orders` sans contrôleur, file de commandes, KPIs
  d'encaissement) est inchangé — voir §3.4.

---

## 0 undecies. Adhérents et cotisations — 2026-08-16

Branche `feat/adherents` **dans les deux dépôts**, non poussée. Back **307 tests**, front
**584 tests** (134 fichiers), typecheck et lint verts des deux côtés. Ferme le §4.1 et une partie
du §4.4. ⚠️ **Ne pas rejouer** : `feat/orders` n'était pas mergée au moment de ce lot.

| Sujet                                                            | État                | Où                                                                 |
| ---------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------- |
| Identité remontée de `members` vers `users`                      | ✅ **fait**         | migration `1787000000000`, nullables                                |
| Table `clients` (téléphone, promotion, inscription, note)        | ✅ **fait**         | migration `1787000000001`, PK partagée avec `users` comme `members` |
| `subscriptions.transaction_id`                                   | ✅ **fait**         | migration `1787000000002`, montant historique fidèle                |
| `ClientsController` + `SubscriptionsController`                  | ✅ **fait**         | gardés par `client:*` et `subscription:*`                           |
| Page `adherents` branchée, garde de route et entrée de menu      | ✅ **fait**         | `permissionGuard('client:read')`                                    |
| Seeder de 8 adhérents couvrant les quatre états                  | ✅ **fait**         | `client_seeder.ts`                                                  |

### Les trois règles qui ont façonné ce lot

1. **Un compte client naît d'une connexion EirbConnect sur l'interface publique, et de rien
   d'autre.** Il n'existe donc **aucune** route de création côté dashboard — `POST /clients` a été
   écrit puis retiré. Le geste du bureau, c'est `POST /subscriptions`.
2. **Client ≠ adhérent.** Le compte permet déjà de se présenter à la caisse ; la personne peut
   ensuite cotiser, précommander, les deux, ou rien. D'où le troisième état `none` sur la fiche,
   et le compteur `withoutSubscription` (et non « externes », qui décrivait une provenance).
3. **`users.cas_id` est la preuve de provenance CAS** disponible aujourd'hui — c'est le claim `uid`
   (§9.2). Le seeder le renseigne pour simuler ce que fera le callback.

### Points ouverts laissés par ce lot

- **Le claim de promotion reste une question ouverte à EirbWare** (§9.2, point 4) : la colonne est
  saisie à la main en attendant, et **changera de nature** si le claim existe.
- Non branchés côté front, boutons désactivés avec un `title` explicite : enregistrer une
  cotisation, modifier une fiche, renouveler, export CSV, import, « Contacter », tri.
- Les tuiles Précommandes / Dépensé / Solde affichent `—` : `transactions` n'a aucun lien vers une
  personne, le chiffre est **incalculable** avant le lot caisse (`orders.client_id`).
- ⚠️ **Le merge avec `feat/orders` demandera plus que les conflits de listes** sur
  `rbac_catalog.ts` et `start/routes/billing.ts` : `buyer_service.ts` lit `member.firstName`, qui a
  changé de table.

### Deux pièges de vérification découverts ici

- **`database/schema.ts` est généré depuis la base connectée**, pas depuis les migrations de la
  branche : sur la base de dev partagée, il aspire les colonnes des autres branches (vu avec
  `OrderSchema.clientId`, venu de `feat/orders`). Régénérer depuis une base jetable construite avec
  les seules migrations de la branche.
- **`node ace test` tourne sur la base de dev** (pas de `.env.test`), donc un changement de branche
  produit des échecs qui n'en sont pas. Utiliser une base dédiée.
- ⚠️ **Le port Postgres est 5432**, contrairement à ce qui traînait dans les notes de reprise.

---

## 1. Ce qu'il faut savoir avant de toucher au code

Ces pièges ont tous coûté du temps une première fois.

| Piège                                                         | Conséquence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `router.put()` et `router.patch()` séparés sur la même action | Plantage au boot : nom de route auto-dérivé en double. Utiliser `router.route(path, ['PUT','PATCH'], …)`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `database/schema.ts` et `.adonisjs/**`                        | **Auto-générés** (`node ace migration:run`, `make:controller`). Ne jamais éditer à la main                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Colonnes `decimal`                                            | Renvoyées en **string** par le driver. Convertir avant tout calcul, sinon `NaN` silencieux                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `$extras.pivot_*`                                             | Lucid ne les sérialise pas. Un `preload` ne suffit pas à exposer une valeur de pivot                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `Array.isArray(paginator)`                                    | **Vrai** pour `ModelPaginator`. Le déballer via `.all()` avant de le rendre                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `DateTime.isDateTime()`                                       | Ne teste qu'un marqueur qui survit au JSON. Un DateTime relu d'une colonne JSON n'a pas `toISO`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `ng build`                                                    | Ne typecheck **pas** les `.spec.ts`. Un build vert ne vaut pas un typecheck vert — lancer `npm test`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `MemberFactory`                                               | Crée son propre `User` et écrase `member.id`. Passer un id via `merge()` est silencieusement ignoré                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `GET /members`                                                | `role` est un **objet** (`{id, name}`), pas une string                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Stores signal                                                 | Plus de `withHooks({onInit})` : la page appelle `load()` depuis son `ngOnInit`, et `load()` commence par `if (loading() === 'loaded' \|\| 'loading') return`. Prévoir un `refresh()` non gardé pour l'après-mutation                                                                                                                                                                                                                                                                                                                                                                                        |
| **Page front qui doit défiler**                               | **A mordu deux fois** (Stocks, puis Logistique). Un composant Angular est un élément **inline sans dimension propre** : sans `host: { class: 'block h-full' }`, le `h-full` du gabarit ne résout rien, la page s'étire à la hauteur de son contenu, son `overflow-y-auto` ne se déclenche **jamais**, et c'est le conteneur de l'app-shell (`min-h-0 flex-1 overflow-auto`) qui défile — en écrasant le contenu pour le faire tenir. Il faut les **trois** : `host` sur le composant, `min-h-0` sur les enfants de flex colonne, et `overflow-y-auto` sur le seul bloc censé défiler. Aucun test ne le voit |
| **Boutons qui n'appellent rien de réel**                      | Une maquette convertie laisse des modales factices derrière des boutons d'apparence normale (`LogistiqueAssignModal` ouvrait une coquille vide depuis le bouton principal « Gérer recettes »). En branchant un écran, vérifier **chaque** `(clicked)` du gabarit, pas seulement ceux du chemin qu'on implémente                                                                                                                                                                                                                                                                                             |

Conventions : réponses enveloppées `{ data }` via `ctx.serialize()` (cf. `BAE-Back/API.md`) ;
`case_converter_middleware` convertit dans les deux sens, les contrôleurs travaillent en camelCase ;
front standalone + `OnPush` + `inject()` + `@if`/`@for` + `[class]`.

---

## 2. Retirer le « lecture seule »

Trois pages ont été câblées volontairement en lecture seule. Les boutons existent déjà et sont
inertes — il s'agit de les brancher, pas de refaire l'interface.

### 2.1 Équipe — `pages/authed/equipe/`

Store `core/store/team.store.ts`, service `core/services/team/team-service.ts`.

| À faire                                    | Backend                                                                                                                                                                                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Créer un membre                            | **Toujours bloqué.** `MembersController.store` reste cassé (`new Member()` part en base sans id, alors que `selfAssignPrimaryKey = true` l'exige) ; créer un membre, c'est créer un compte, donc attend §3.2 (invitations) et §3.3 (mot de passe) |
| ~~Modifier un membre (prénom, nom, rôle)~~ | ✅ **fait** — `PATCH\|PUT /v1/members/:id` sous les règles de hiérarchie dérivée, voir §0 ter                                                                                                                                                     |
| ~~Supprimer un membre~~                    | ✅ **fait** — `DELETE /v1/members/:id` → 204, supprime le **compte utilisateur**, voir §0 ter                                                                                                                                                     |
| ~~Éditer la matrice rôles × permissions~~  | ✅ **fait** — `PUT /v1/roles/:id/permissions`, voir §0 bis                                                                                                                                                                                        |
| Inviter un membre                          | **Rien côté back.** Voir §3.2                                                                                                                                                                                                                     |

⚠️ La page est désormais gardée par `permissionGuard('role:read')` et l'entrée de menu disparaît
sans cette permission : pour la voir, le compte doit porter un rôle qui l'accorde.

### 2.2 Logistique — `pages/authed/logistique/`

Lecture seule sur `/v1/goods` et `/v1/vouchers`.

- Cocher / décocher une ligne de courses n'est que local : aucune table de « liste de courses »
  n'existe. Soit on en crée une, soit on assume que c'est un état de session. **Toujours ouvert** —
  et le §17 de `HANDOFF2.md` répond que la liste ne se saisit pas, elle se **génère**.
- ~~Créer / consommer un bon d'achat~~ — ✅ **fait le 2026-08-09** (§0 quater). `POST /v1/vouchers`
  et `PATCH /v1/vouchers/:id` (`used_at` marque la consommation, `null` l'annule) sont branchés.
  Les quatre routes sont désormais gardées par `voucher:read` / `voucher:write` (§0 quinquies).
  **Restent non branchés** : modifier un bon existant (valeur, date, enseigne) et le supprimer, bien
  que `PUT|PATCH` et `DELETE` acceptent déjà ces gestes côté back.
- ⚠️ Le seeder `good_supplier_seeder` génère 15 fournisseurs pour 10 produits avec des prix
  aléatoires : le tableau honnête fait donc 15 colonnes très creuses, loin de la maquette à 3
  enseignes. C'est le **seeder** qu'il faut revoir, pas la page.

### 2.3 Sécurité — `pages/authed/parametres/securite/`

Sessions réelles, révocation fonctionnelle. Manquent : mot de passe et 2FA (voir §3.3), et la
colonne « localisation » n'a aucune source (pas de géo-IP, volontairement).

Deux conséquences du SSO (§9) sur cette page précisément : les sessions ouvertes par Keycloak
n'auront ni appareil ni IP tant que le renseignement de `ip_address` / `user_agent` n'est pas
factorisé hors de `AccessTokenController.store` (§9.5) — la page affiche justement ces deux
colonnes ; et le panneau de changement de mot de passe doit se masquer pour un compte SSO pur,
dont la colonne `password` sera `null`.

---

## 3. Endpoints à créer

### 3.1 Matrice rôles × permissions — ✅ RÉALISÉ

> **Cette section est faite** — voir le §0 bis. Conservée comme trace du raisonnement, pas comme
> travail restant. Ne la réimplémentez pas.
>
> Écarts entre ce qui était prévu ici et ce qui a été livré :
>
> - L'avertissement sur les colonnes de pivot **ne s'appliquait pas** : la matrice n'a besoin
>   d'aucune colonne de pivot, seulement des lignes liées, que `serialize()` sort déjà.
> - Le corps du `PUT` porte des **noms** et non des ids : `Permission.primaryKey = 'permission'`
>   avec `selfAssignPrimaryKey`, donc la chaîne _est_ la clé et `sync()` les prend directement.
>   Il n'existe aucune résolution nom → id.
> - Il a fallu, en plus, l'invariant anti-verrouillage et son verrou consultatif (§0 bis).

Les tables `roles`, `permissions`, `roles_permissions` et les deux `@manyToMany` existent, mais
**aucun endpoint n'exposait la relation** : `RolesController.index` était un `Role.query()` nu,
`PermissionsController.index` un `Permission.all()`. La page affichait donc `?` dans chaque case,
avec un bandeau explicite.

Une brique d'autorisation sert de modèle : `middleware.can('log:read')`
(`app/middleware/permission_middleware.ts`) résout `user → member → role → roles_permissions`.
**Les 13 routes de `start/routes/members.ts` sont désormais gardées** (§0 bis) ; le reste de l'API
demeure ouvert à n'importe quel membre authentifié.

### 3.2 Invitations — bloquant pour l'onglet Invitations

Aucune table. Il faut `invitations` (email, rôle proposé, jeton, expiration, statut), les routes
de création/révocation, et l'envoi d'e-mail. L'onglet reste en données de démonstration en
attendant, avec une mention visible.

### 3.3 Mot de passe et 2FA — bloquant pour Sécurité

**Le SSO n'est pas encore branché** (le chantier complet est décrit au §9 : Keycloak en mode BFF),
donc le mot de passe est aujourd'hui le seul facteur : c'est prioritaire. Et le SSO n'est plus un
simple confort pour le dashboard — c'est le **seul mode d'accès prévu pour la zone publique**
(§4.4), donc un préalable à toute page publique.

- Changement de mot de passe : `PUT /v1/account/password` avec `{ currentPassword, password,
passwordConfirmation }`. Vérifier l'ancien via `User.verifyCredentials`, puis proposer la
  révocation des autres sessions (`AccessTokenController.destroyAll` existe déjà).
  ⚠️ Ne concerne que les comptes ayant un mot de passe : après le §9.4 la colonne devient
  nullable, et le panneau doit disparaître pour un compte SSO pur.
- 2FA TOTP : colonnes `totp_secret` et `totp_enabled_at` sur `users`, endpoints d'activation
  (renvoi du secret + QR), de vérification et de désactivation, plus des codes de secours. Le
  contrôle doit ensuite entrer dans `AccessTokenController.store`.
  **À arbitrer avant d'écrire quoi que ce soit :** Keycloak sait faire le TOTP nativement
  (`Authentication → Required actions → Configure OTP`). Si le dashboard passe majoritairement au
  SSO, ce développement disparaît — il ne resterait à couvrir que les comptes locaux. Décider
  l'ordre : implémenter le §9 d'abord peut supprimer purement et simplement ce point.
- ⚠️ `users.cas_id` est nullable depuis le correctif d'inscription : un compte créé par
  inscription directe n'a pas d'identité CAS. La colonne reste **la correspondance avec l'annuaire
  de l'école** et n'est pas remplacée par le SSO Keycloak — les deux clés cohabitent, avec des
  rôles distincts (§9.4).

### 3.4 Domaines sans aucune route

Tables et migrations présentes, aucun contrôleur :

| Domaine              | Tables                                            | Pages front concernées                        |
| -------------------- | ------------------------------------------------- | --------------------------------------------- |
| Commandes / caisse   | `orders`, `order_products`                        | `caisse`, `caisse/cloture`, `soiree/live`     |
| Précommandes         | `pre_orders`, `pre_order_items`                   | `precommandes` (public), `precommandes-admin` |
| Cotisations          | `subscriptions` (+ `fast_passes`, **déjà routé**) | `adherents`, page publique de paiement        |
| Produits d'événement | `event_products` (`quantity`, `price`)            | `soiree/bilan`, `analyse`                     |

`GET /v1/transactions` existe **en lecture seule** : la caisse a besoin du chemin d'écriture.

---

## 4. Pages encore en données factices

Toutes sont déjà en `loadComponent`, il ne manque que les données.

| Page                                  | Ce qu'il faut                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `caisse` + `cloture`                  | Commandes + transactions en écriture. `OrdersService` tourne sur `buildSeedOrders()`                   |
| `soiree/live`                         | Idem, plus le websocket (`core/services/websocket/`)                                                   |
| `soiree/bilan`                        | `event_products`                                                                                       |
| `precommandes` + `precommandes-admin` | `pre_orders`                                                                                           |
| `adherents`                           | `fast_passes` (**déjà routé**) + `subscriptions`. Voir §4.1                                            |
| `tickets`                             | Support / helpdesk — **aucune table**. Voir §4.2                                                       |
| `paiements`                           | `transactions` en lecture + rapprochement                                                              |
| `notifications`                       | Aucune table                                                                                           |
| `parametres/integrations`, `modules`  | Aucune table                                                                                           |
| `stocks/scanner`                      | Le composant de scan partagé (§10.1, §11.4) ; reste la décision produit sur ce qu'on fait du code lu   |
| `etats`                               | **À laisser tel quel** : galerie d'états d'interface (404, hors-ligne, vide…), pas une page de données |

`home` : les tuiles « encaissements » et « affectation » sont branchées ; le **fil d'activité est
volontairement vide** — c'est un fil d'événements métier, pas le journal HTTP (§8).

### 4.1 Adhérents et cotisations — ce n'est pas « tickets »

Un **fast pass est la cotisation** d'un adhérent BAE, pas un billet. Le schéma le dit :
`fast_passes` porte `label`, `price`, `duration` (en jours) et `description` — c'est une formule
d'adhésion ; `subscriptions` (`user_id`, `fast_pass_id`, `subscribed_at`) est la souscription d'un
membre à cette formule. La page `adherents` est bien la page de ce domaine (« 342 inscrits · 287 à
jour · 41 expirations < 30 j », avec ses types `Adherent` et `Cotisation`).

À faire :

- `SubscriptionsController` — aucune route aujourd'hui, alors que `fast-passes` est déjà exposé.
- L'expiration est **calculée**, pas stockée : `subscribed_at + duration` jours. Les compteurs
  « à jour » / « expirés » de la page en dépendent, donc à centraliser côté back plutôt que de le
  recalculer dans chaque écran.
- La clé primaire de `subscriptions` est `(user_id, fast_pass_id, subscribed_at)` : un
  renouvellement crée donc une nouvelle ligne, ce qui donne l'historique des cotisations
  gratuitement. Ne pas la modifier en place.

### 4.2 Tickets — page de support, sans rapport avec les fast passes

`pages/authed/tickets/` est un **helpdesk** (fil « Support › Tickets », onglets Nouveau / En cours
/ Clos / Mes tickets, avec `Ticket` et `HistoryEntry`). Aucune table ne l'appuie : il faudrait
`tickets` (auteur, sujet, statut, priorité) et `ticket_messages`. À arbitrer — c'est le domaine le
plus éloigné du métier BAE, et sans doute le plus facile à remplacer par un outil externe.

### 4.3 Paiement public de la cotisation — projet Angular distinct

Il manque une page publique de paiement de cotisation, sur le modèle des précommandes publiques.

**Décision d'architecture retenue : les pages publiques partent dans un projet Angular séparé**,
pour séparer les domaines — une page payante ouverte sur Internet n'a pas à embarquer le bundle
d'administration, ses gardes, ni ses stores.

Conséquences pour la reprise :

- `pages/public/precommandes/` et la route `AppRoutes.precommandes` (`public/precommandes`) sont
  aujourd'hui **dans ce projet** : ce sont elles qu'il faudra extraire en premier, comme patron.
- Le back est déjà prêt à servir les deux : il expose une API HTTP, pas des vues. Prévoir en
  revanche des routes **non authentifiées** dédiées (consultation des formules, création d'un
  paiement), distinctes du groupe `middleware.auth()`, et le CORS pour la seconde origine
  (`config/cors.ts`).
- Les origines de production sont arrêtées : API sur `api.bae.eirb.fr`, dashboard sur
  `dashboard.bae.eirb.fr`, front public sur `order.bae.eirb.fr`. Les trois partagent `eirb.fr`,
  ce qui est **la condition qui rend l'authentification par cookie possible** (§9.8) : ce n'est
  donc pas un simple choix de nommage, et déménager le front public hors de ce domaine casserait
  la session.
- Le paiement lui-même n'existe nulle part. `transactions.type` est un enum `cash | lydia`, ce qui
  suggère Lydia ; il faudra un webhook de confirmation, et ne créer la `subscription` qu'**après**
  confirmation, jamais à l'initiation du paiement.
- Ce qui est partagé entre les deux fronts (composants `bfd-*`, convertisseur de casse,
  intercepteurs) mérite d'être sorti en bibliothèque plutôt que dupliqué.

### 4.4 Deux publics, une seule API : `member` d'un côté, `client` de l'autre

**Le projet public consomme la même API.** Ce qui diffère n'est pas le backend mais le
_qualificatif_ de l'utilisateur : la personne du public n'est pas un membre de l'association.

**Règle d'accès retenue :**

| Zone                                    | Authentification                       | Enregistrement requis              |
| --------------------------------------- | -------------------------------------- | ---------------------------------- |
| Dashboard                               | SSO Keycloak **ou** email/mot de passe | une ligne dans `members`           |
| Zone publique (fast pass, précommandes) | **SSO Keycloak uniquement**            | une ligne dans `clients` (à créer) |

Le mécanisme d'authentification lui-même est décrit au §9 ; ce paragraphe ne traite que du
_qualificatif_ attaché à l'utilisateur une fois celui-ci authentifié.

Un même `user` peut porter **les deux** : un membre travaille au BAE certains soirs et peut
précommander ou prendre le fast pass les soirs où il ne travaille pas. Les deux appartenances sont
donc indépendantes, jamais exclusives — aucun « type de compte » sur `users`.

**La table `clients` suit le patron de `members`.** `members` n'a pas de colonne `user_id` : sa
clé primaire **est** la clé étrangère vers `users.id`
(`create_members_table.ts` : `table.integer('id').primary().references('id').inTable('users')`,
avec `selfAssignPrimaryKey` côté modèle). `clients` doit être calquée dessus — même PK partagée,
même `belongsTo(User, { foreignKey: 'id' })`. On obtient alors « membre et client » gratuitement :
deux lignes d'extension sur le même id.

Ce que la table doit porter, d'après la maquette `adherents` (`adherents.ts:190-212`) : prénom,
nom, téléphone, **promotion**, date d'inscription. `users` ne fournit qu'`email`. Le « solde
courant » et les compteurs (soirées, précommandes, dépensé) sont **dérivés** de `transactions` et
`pre_orders`, pas des colonnes à stocker.

**Bonne nouvelle : le schéma est déjà orienté utilisateur.** `pre_orders.user_id` et
`subscriptions.user_id` référencent `users`, pas `members` — les deux domaines publics sont donc
déjà rattachés au bon niveau, **aucune clé étrangère n'est à migrer**. À l'inverse
`orders.member_id` pointe sur `members` : la caisse reste bien un geste de staff, la distinction
est déjà correctement tracée.

~~**Décision à prendre — où vit l'identité ?**~~ — ✅ **tranchée le 2026-08-16, et livrée**
(§0 undecies). `first_name` / `last_name` ont été **remontés de `members` vers `users`**, nullables ;
`clients` ne porte que le spécifique public (téléphone, promotion, date d'inscription, note).
Une personne membre _et_ cliente a donc un seul nom, par construction. Les claims `prenom` / `nom`
alimenteront `users`, pas `clients`.

**Conséquences côté back :**

- ⚠️ **Le SSO devient bloquant pour toute la zone publique.** Aucune page publique n'est livrable
  avant lui — ce qui remonte sa priorité bien au-delà du « mot de passe et 2FA ». Le chantier est
  détaillé au §9.
- `keycloak_sub` (§9.4) sera nullable, comme `cas_id` l'est déjà : rien n'empêchera en base un
  client sans identité SSO. La règle « client ⇒ SSO uniquement » est donc un **invariant
  applicatif à faire respecter au provisionnement**, pas une contrainte de schéma. À décider : la
  durcir (contrainte / index partiel imposant `keycloak_sub NOT NULL` aux users portant une ligne
  `clients`) ou l'assumer dans le callback (§9.5), qui est de toute façon le seul chemin de
  création d'un client.
- `middleware.auth()` ne prouve que l'identité. Il faut deux gardes distincts — « a une ligne
  `members` » et « a une ligne `clients` » — sinon un client authentifié atteint toutes les routes
  du dashboard, qui sont aujourd'hui ouvertes à n'importe quel utilisateur authentifié (§3.1).
  `permission_middleware.ts` fait déjà exactement la résolution `user → member` et renvoie 403 en
  l'absence de ligne : c'est le modèle à dupliquer, et le premier garde existe donc déjà à moitié.
- ⚠️ **`GET /v1/account/profile` casse pour un client sans ligne `members`** :
  `ProfileController.show` appelle `MemberTransformer.transform(user.member)`, et le transformer
  déréférence `this.resource.role?.name` sans tester la nullité de la ressource. Le front s'appuie
  dessus au démarrage. Soit le profil devient tolérant (`member: null`), soit le projet public
  utilise un endpoint distinct — la seconde option est plus propre : les deux fronts n'ont pas
  besoin de la même charge utile.
- Les routes publiques de consultation (formules, menus) restent **non authentifiées** (§4.3) ;
  seules celles qui engagent une personne (souscription, précommande) exigent `user + client`.

**Conséquences côté front :**

- Les deux projets ont un garde de route de forme identique mais de condition différente
  (`member` requis vs `client` requis). C'est un candidat naturel à la bibliothèque partagée
  évoquée en §4.3, au même titre que les intercepteurs.
- La page `adherents` du dashboard devient la **vue administrateur des `clients`**, pas une page
  de membres : sa colonne « promotion » n'a de sens que là. À garder à l'esprit en la branchant
  (§4.1), pour ne pas la câbler par erreur sur `members`.

---

## 5. Périodes de soirée — ✅ RÉALISÉ

> **Cette section est faite** — voir le tableau du §0. Elle est conservée comme trace du raisonnement,
> pas comme travail restant. Ne la réimplémentez pas.
>
> Écarts entre ce qui était prévu ici et ce qui a été livré :
>
> - Le classement effectif départage le bloc ex æquo par **id de poste croissant** (déterminisme).
> - `unmatchedMemberIds` exclut les membres porteurs d'une ligne verrouillée, et ne liste que ceux
>   non appariés sur **aucune** période.
> - L'assiduité de `rankingKey` compte désormais des **soirées consolidées distinctes**
>   (`countDistinct('event_id')` + `whereNotNull('settled_at')`), plus des lignes d'affectation :
>   avec trois postes par soirée, `count(*)` pénalisait qui en tenait le plus.

Une soirée se déroule en **trois temps** : préparation, soirée, nettoyage. Un membre peut tenir
**plusieurs postes dans la même soirée, mais un seul par période**.

`jobs.type` existe déjà en base — un enum `['before', 'during', 'after']`, défaut `during`. Il
n'est lu **nulle part** : zéro occurrence dans `matching_service.ts`, et rien dans `runMatching`.

`stableMatch` est un Hospital-Residents classique où un membre sort définitivement de la file dès
qu'il est apparié : il ne peut donc obtenir **qu'un seul poste** par soirée. C'est structurellement
faux, pas un réglage à ajuster.

### 5.1 Le comportement attendu

Le classement des préférences est **global** : le membre ordonne tous les postes sans distinguer
les périodes. C'est l'affectation qui doit être segmentée.

Exemple de référence :

| Poste               | Période  |
| ------------------- | -------- |
| Installation tables | `before` |
| Service             | `during` |
| Barbeuc             | `during` |
| Vaisselle           | `after`  |

Classement d'un membre : 1. Service · 2. Barbeuc · 3. Installation tables · 4. Vaisselle.

- **Seul disponible** → il obtient Vaisselle, Service et Installation tables : trois postes, parce
  que ce sont trois moments différents. Il n'obtient pas Barbeuc, déjà occupé par lui-même sur la
  période `during`.
- **Trois disponibles, lui avec un score élevé** → il prend Service (son premier choix) sur la
  période `during`, et un membre à faible score peut se retrouver sur les trois autres postes —
  précisément parce que les postes d'avant et d'après sont bas dans le classement de tout le monde.

C'est ce qui rend le système équitable : les postes ingrats sont ceux d'avant et d'après, et ils
échoient à qui a le moins de priorité.

### 5.2 Mise en œuvre

Faire tourner **une affectation par période**, chacune sur les postes de ce `type`, en réutilisant
le même classement global restreint aux postes de la période. Un membre participe aux trois, et en
ressort avec au plus un poste par période.

Les capacités (`event_jobs.count`) restent inchangées : elles sont déjà par poste, donc par période
de fait. Les verrous et l'éligibilité (`job_eligible_members`) se filtrent de la même façon.

Points d'attention :

- **La disponibilité vaut pour toute la soirée**, préparation et nettoyage compris : un seul
  booléen `member_responses.is_available`, et c'est voulu. Répondre présent, c'est se rendre
  disponible sur les trois moments. **Aucun changement de schéma n'est nécessaire**, et le vivier
  de candidats est donc rigoureusement le même pour les trois affectations — seule la liste des
  postes change d'une période à l'autre.
- **Le rang atteint devient ambigu** pour le calcul des points (§6) : un membre peut décrocher son
  choix n° 1 sur `during` et son n° 4 sur `after` dans la même soirée. À décider — un delta par
  poste, ou un seul delta par soirée calculé sur le meilleur rang obtenu ? Le premier récompense le
  fait d'avoir accepté trois créneaux, le second reste centré sur « as-tu eu ce que tu voulais ».
  Cette décision conditionne la refonte du §6, donc à prendre **avant**.
- Les tests existants (`matching_algorithm.spec.ts`, `matching.spec.ts`) supposent tous un poste
  unique par membre : ils sont à réécrire, pas à compléter.

### 5.3 Les préférences sont implicitement complètes

Un membre ne doit **jamais** rester sans poste tant qu'il reste des places. Aujourd'hui c'est le
contraire : `stableMatch` fait avancer `nextProposalIndex` dans la liste de préférences du membre
et s'arrête quand elle est épuisée. Un poste non classé n'est donc jamais proposé — il suffit de ne
pas classer la vaisselle pour ne jamais la faire.

**Règle à appliquer.** Les postes absents du classement d'un membre sont traités comme **ex æquo en
dernière position**, à la suite de son classement existant. Le classement exprimé reste prioritaire ;
ce qui n'est pas classé n'est pas refusé, juste voulu en dernier.

Cas limite explicite : **un membre sans aucune préférence a tous les postes ex æquo en première
position**. Il est indifférent, donc son placement se décide entièrement par le classement côté
poste (son score) et par les places disponibles.

Conséquences :

- La liste de préférences effective devient : postes classés dans l'ordre, puis **tous** les autres
  postes de la période en un bloc ex æquo. Il faut un départage déterministe dans ce bloc — l'ordre
  de classement des postes ou l'id — sinon deux lancements identiques donnent des résultats
  différents.
- `unmatchedMemberIds` devient **rare** : il ne reste que le cas « plus aucune place ». Le front en
  dépend — `describeMatching()` (`pages/authed/coordination/coordination.ts`) formule aujourd'hui
  ses messages en supposant que des membres non affectés sont courants, et sa branche
  « Aucune affectation générée » attribue cela à un manque de correspondance. À reformuler.
- **Interaction avec les points (§6), à trancher :** quel rang est « atteint » sur un poste non
  classé ? Le traiter comme le rang suivant le dernier classé est cohérent avec « voulu en
  dernier ». Mais pour un membre sans aucune préférence, la règle des ex æquo en première position
  en ferait un rang 1 partout — donc, en sémantique de crédit (§6.1), une dépense maximale pour un
  poste qu'il n'a jamais demandé. Décider si l'absence de préférence donne un delta neutre plutôt
  que le delta du rang 1.

### 5.4 Représenter les moments dans la page de coordination

`pages/authed/coordination/` ignore complètement les périodes : les postes sont affichés à plat
et un membre n'a qu'un poste.

À reprendre :

- **Grouper les postes par période**, dans l'ordre chronologique préparation → soirée → nettoyage.
  `buildEventsData()` construit `roles` en aplatissant `eventJobs` : il faudra remonter `job.type`
  (absent de `ApiJob` aujourd'hui, à ajouter côté service) et regrouper.
- **`MemberView.poste` est un `string | null`** — il devient une liste, au plus un poste par
  période. La colonne « Affecté à » doit montrer les trois créneaux et distinguer « pas de poste
  sur ce moment » de « pas de poste du tout », sans retomber dans la confusion déjà corrigée entre
  poste tenu et fonction BAE.
- **Le taux de couverture doit être par période** : « complet » au sens global masquerait un
  nettoyage sans personne alors que la soirée est sur-staffée.
- **La modale de gestion des postes** (§ picker) liste les postes à plat : elle doit indiquer la
  période de chaque poste, sinon on arme une soirée sans savoir qu'il n'y a personne au rangement.
- **Le bandeau de verrouillage et le récapitulatif d'affectation** comptent des lignes sans
  distinction de moment — à ventiler également.

Le compteur d'effectif du poste (`assigned / needed`) reste juste tel quel : il est déjà par poste,
donc par période de fait.

---

## 6. Système de points — ✅ RÉALISÉ

> **Cette section est faite** — voir le tableau et la formule du §0. Conservée comme trace du
> raisonnement. Les quatre défauts décrits ci-dessous sont corrigés.
>
> Décisions arbitrées en cours de route, qui ne figuraient pas ici :
>
> - Le delta a **deux composantes** — un crédit de charge par période moins un coût de rang — et non
>   une seule. C'est ce qui permet à un poste non classé de ne rien coûter tout en rapportant.
> - Une **affectation manuelle est scorée** exactement comme l'automatique, sans quoi contourner le
>   moteur devenait avantageux.
> - La consolidation est idempotente par un `UPDATE … WHERE settled_at IS NULL … RETURNING` : une
>   lecture puis écriture séparées auraient créé une fenêtre de double crédit.
> - Les FK de `member_event_assigned_jobs` sont passées en `RESTRICT` sur `event_id`/`job_id` :
>   en `CASCADE`, supprimer une soirée effaçait les lignes consolidées et `points:recompute`
>   reconstruisait alors un score à zéro.

Vérifié dans le code, pas seulement rapporté. Quatre défauts distincts, dont deux non signalés.

### 6.1 Le sens est inversé

`computePointsDelta(rankAchieved)` vaut `+10` au rang 1 et décroît de 2 par rang : **obtenir son
premier choix rapporte le plus de points**. Et `sortByJobRanking` trie par clé _décroissante_,
donc **le plus de points passe en premier**.

Conséquence : celui qui obtient son premier choix devient plus prioritaire pour l'obtenir encore.
C'est une boucle où les mêmes gagnent toujours, exactement l'inverse de la rotation voulue.

**Recommandation** — garder « plus le score est élevé, plus on est servi tôt », et inverser le
signe du delta :

- obtenir un bon rang **dépense** du crédit (delta négatif, d'autant plus fort que le rang est bon) ;
- être servi tard, ou pas du tout, **en rapporte**.

Le score se lit alors comme un crédit de priorité : intuitif, affichable tel quel sur « mes
présences », et il ne reste qu'un signe à changer plus le tri à conserver. L'autre option (score
= dette, le plus bas servi en premier) marche aussi mais donne un nombre dont « plus c'est haut,
plus c'est mauvais » — moins lisible pour un membre.

⚠️ `clampPoints` borne à `[0, 100]`. Avec la sémantique de crédit, un membre systématiquement
écarté plafonnerait à 100 et cesserait d'accumuler de la priorité. Le plafond est à revoir, voire
à supprimer.

### 6.2 `points_delta` n'est jamais annulé à la désaffectation

`AssignmentsController.destroy` supprime la ligne **sans rendre les points**. Retirer un membre
d'un poste à la main lui laisse donc son bonus indéfiniment.

### 6.3 Le verrouillage a rendu des points irrécupérables

`runMatching` n'annule que les lignes `locked = false` — cohérent en soi, une affectation
verrouillée conserve son poste donc ses points. Mais tant que le front verrouillait par
DELETE puis POST, la ligne était recréée avec `points_delta = 0` : les points restaient acquis
sans trace permettant de les reprendre. Une relance annulait alors `0` et empilait un nouveau
delta par-dessus — le symptôme observé.

Corrigé pour l'avenir par `PUT /v1/assignments` (§8), mais **les lignes déjà en base peuvent être
fausses** : prévoir un recalcul.

### 6.4 La cause commune : les points sont mutés sur le membre

`members.points` est un cumul modifié en place à chaque lancement. L'annulation n'est donc exacte
que si rien d'autre n'y a touché entre-temps, et le clamp la rend lossy aux bornes (un membre à 95
recevant +10 est plafonné à 100 ; c'est bien le delta _appliqué_ qui est stocké, mais l'inverse
n'est plus vrai dès que plusieurs soirées se chevauchent).

**Refonte proposée — c'est la bonne approche.** Ne plus écrire dans `members.points` pendant
l'affectation ; se contenter de stocker le delta par affectation. À la clôture de la soirée, le
delta est consolidé dans le score du membre.

On y gagne :

- une annulation exacte, puisqu'il n'y a plus rien à annuler avant clôture ;
- un historique par soirée des points gagnés et perdus, directement affichable ;
- `members.points` devient une valeur **dérivée** (somme des deltas consolidés), donc
  recalculable — ce qui répare aussi les données corrompues par §6.2 et §6.3.

Pistes de mise en œuvre :

- `member_event_assigned_jobs.points_delta` existe déjà : c'est le stockage du delta prévu.
- Ajouter un marqueur de consolidation — soit `events.points_settled_at`, soit
  `member_event_assigned_jobs.settled_at` — pour rendre l'opération idempotente et empêcher une
  double application.
- Un endpoint de clôture (`POST /v1/events/:id/settle`) ou un déclenchement sur passage de
  `events.status`. À décider : `events` a déjà une colonne `status`.
- Prévoir une commande de recalcul (`node ace`) reconstruisant `members.points` depuis les deltas
  consolidés, pour rattraper l'existant.
- Le classement (`rankingKey`) doit alors se baser sur le score **consolidé**, sinon deux
  lancements sur la même soirée non clôturée se répondraient l'un à l'autre.

### 6.5 Afficher le score sur « mes présences »

`pages/authed/my-presences/`. **Aucun endpoint à créer** : `GET /v1/account/profile` renvoie déjà
`member.points` — et au passage `role` y est une _string_, aplatie par `MemberTransformer`,
contrairement à `GET /v1/members` où c'est un objet.

À afficher avec l'historique des deltas par soirée une fois §6.4 en place, sinon le nombre seul
n'explique rien. Attention à la formulation selon le sens retenu en §6.1 : « crédit de priorité »
et non « points gagnés ».

Déjà fait sur la page d'accueil : le panneau « votre rôle ce soir-là » n'affiche plus de score
inventé mais le **rang obtenu** (« vous avez obtenu votre 2e choix », issu de
`member_job_preferences`) et les points crédités par l'affectation. Deux conséquences pour la
refonte :

- la ligne « Points de cette affectation » suit le signe décidé en §6.1 : si un bon rang se met à
  coûter du crédit, elle affichera un négatif, et son intitulé devra suivre ;
- `RoleAssignment.preferenceRank` vaut `null` quand le poste n'est pas classé — ce qui est
  exactement le cas d'ex æquo du §5.3, à garder cohérent entre le moteur et l'affichage.

---

## 7. Présence verrouillée par l'affectation — ✅ RÉALISÉ

> **Cette section est faite** — voir le tableau du §0. Conservée comme trace du raisonnement.
>
> Ce qui a été tranché : seul le passage à « absent » est refusé (repasser présent reste possible,
> sinon un membre affecté alors qu'il était marqué absent serait enfermé), et la condition porte sur
> **la soirée entière**, pas sur une période. Le §7.3 reste vrai : il n'existe toujours aucun
> endpoint permettant au bureau de fixer la présence d'un **autre** membre — le chemin est
> « le bureau désaffecte, puis le membre se déclare absent ».

**Règle métier :** dès qu'un poste est affecté à un membre sur une soirée, ce membre ne peut plus
changer sa réponse de présence lui-même. Se désengager passe par un membre du bureau ou le
coordinateur, qui le retire d'abord de son poste ; il redevient alors libre de se déclarer absent.

Aujourd'hui rien ne l'empêche, et les deux moitiés du garde-fou manquent.

### 7.1 Le verrou est côté back, pas côté écran

`EventsController.setResponse` (`POST /v1/events/:id/response`) fait un
`member.related('responses').sync({ [eventId]: { is_available } }, false)` sur le membre
authentifié, sans jamais regarder `member_event_assigned_jobs`. Un membre affecté peut donc se
déclarer absent, et le poste reste compté comme tenu par quelqu'un qui a annoncé ne pas venir.

À faire : refuser la requête (409, avec un code d'erreur explicite — le front doit pouvoir en
formuler le message) quand le membre porte une affectation sur cet événement. Masquer les boutons ne
suffit pas, l'endpoint est appelable directement.

Deux points à trancher :

- **Bloquer tout changement, ou seulement le passage à « absent » ?** Un membre affecté est
  normalement déjà présent, donc « repasser présent » est un no-op et interdire l'endpoint entier
  serait équivalent en plus simple. Mais `AssignmentsController.store` ne vérifie **pas**
  `member_responses.is_available` : une affectation manuelle peut viser un membre absent ou sans
  réponse. Un blocage total l'enfermerait dans « affecté **et** absent », sans porte de sortie. Ne
  refuser que le passage vers l'indisponibilité évite ce cul-de-sac.
- **Avec les périodes (§5)**, un membre porte jusqu'à un poste par moment. La condition est donc
  « aucune affectation sur cette soirée », pas « aucune sur cette période » : être libéré du
  nettoyage ne rend pas la soirée entière annulable.

### 7.2 Côté front — deux écrans, un seul sait

Les boutons « Présent·e / Absent·e » appellent tous `EventsStore.setMemberPresence()` :

| Écran                                                 | Boutons                                | Connaît l'affectation du membre ?                                                  |
| ----------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------- |
| `pages/authed/home/home.html:157,164`                 | `respondPresent()` / `respondAbsent()` | **Oui** — `RoleAssignmentStore` alimente déjà le panneau « votre rôle ce soir-là » |
| `pages/authed/my-presences/my-presences.html:114,137` | idem, par événement                    | **Non** — `postFor()` (`my-presences.ts:197`) renvoie `null` en dur                |

`my-presences` a donc besoin des affectations du membre avant de pouvoir verrouiller quoi que ce
soit — exactement le même besoin que le §6.5 (afficher rang et deltas par soirée) : à traiter d'un
seul coup.

Dans les deux cas, **désactiver plutôt que masquer**, en affichant le poste tenu et la marche à
suivre : un bouton disparu se lit comme un bug, et « à qui s'adresser » est précisément ce que la
règle oblige à communiquer. Prévoir aussi le refus venant du back (deux onglets, ou une
désaffectation entre-temps) : le toast doit reprendre le message de l'API plutôt qu'un texte codé
en dur.

### 7.3 Le levier du bureau existe ; l'exception, non

Retirer un membre de son poste est déjà branché de bout en bout : `DELETE /v1/assignments` →
`CoordinationService.unassign()` → bouton de la page coordination (`coordination.html:132`). La
règle est donc applicable sans nouvel endpoint d'administration.

Deux réserves :

- ⚠️ `AssignmentsController.destroy` **ne rend pas les points** (§6.2). La désaffectation devient
  ici le geste courant du bureau et non plus un cas rare : le défaut passe de gênant à structurel,
  ce qui renforce la priorité donnée au §6.
- Il n'existe **aucun endpoint permettant au bureau de fixer la présence d'un autre membre** —
  `setResponse` travaille exclusivement sur `auth.getUserOrFail()`. Le chemin normal est donc
  « le bureau désaffecte, puis le membre se déclare absent ». Si le bureau doit pouvoir marquer
  quelqu'un absent directement (membre injoignable, désistement par message), cela demande un
  endpoint dédié — qui devra contourner son propre verrou, donc être protégé par une permission
  (§3.1) et pas par un simple `auth()`.

---

## 8. Dettes et points de vigilance

- **Fil d'activité (`home`)** — a besoin d'une table d'événements métier : acteur (`members`, qui
  seul porte un nom affichable, contrairement à `users`), verbe, sujet, horodatage. Ne surtout pas
  le rebrancher sur `/v1/logs` : cela produisait « lespiet a créé /v1/events ».
- **`logs` d'avant le 2026-08-06** — contiennent encore des jetons d'accès en clair dans
  `meta.response`, écrits avant le correctif de rédaction. Inertes (le convertisseur ne plante plus
  dessus) mais lisibles par qui possède `log:read`. Purge conseillée avant toute mise en
  production.
- **`POST /v1/assignments`** est create-or-ignore ; la mise à jour passe désormais par
  `PUT /v1/assignments`. Ne pas revenir à un DELETE + POST : cela remet `points_delta` à zéro.
- **Budget de bundle** — `angular.json` fixe 500 ko, l'initial est à ~788 ko. Le lazy loading a
  déjà fait passer 1,16 Mo → 765 ko ; le reste est du vendor. Soit on relève le seuil, soit on
  attaque les dépendances.
- **`sidebar.ts`** — modifié et non commité : les routes `/disabled` deviennent réelles.
- ~~**`config/database.ts`** est sur `pg` alors que `.env` porte `DB_PORT=3306`~~ — **fausse alerte,
  vérifiée.** Le conteneur Docker `bae-postgres-dev` publie **Postgres sur le port hôte 3306** :
  `DB_PORT=3306` est correct, ne le « corrigez » pas en 5432 (5432 est occupé par le Postgres d'un
  autre projet, et l'authentification y échouera). Si les tests back échouent tous sur un
  `Setup hook`, le conteneur est simplement arrêté : `docker start bae-postgres-dev`.
- **Le typecheck front : utilisez `npm run typecheck`.** `npx tsc -p tsconfig.json --noEmit` sort en
  **0 sur une erreur de type délibérée** — le `tsconfig.json` racine utilise les _project references_
  avec `"files": []`, donc `tsc -p` ne compile aucun fichier. Un script `typecheck`
  (`tsc --build tsconfig.json`) a été ajouté à `package.json` : lui vérifie réellement (sortie 2 sur
  la même erreur). Ne le remplacez pas par la forme `-p --noEmit`, qui paraît équivalente et ne l'est
  pas. Rappel : `ng build` ne typecheck pas non plus les `.spec.ts`.
- **`bfd-btn` ne propage ni `id` ni les attributs `aria-*`** jusqu'au `<button>` interne : ils
  atterrissent sur l'élément hôte du composant. `home.html` et `my-presences.html` ont dû retomber
  sur un `<button>` natif pour pouvoir poser un `aria-describedby`. À corriger dans le composant
  plutôt que de multiplier les contournements — et penser à y reconduire
  `focus-visible:ring-2 ring-blue/40`, perdu la première fois.
- **`validateAssignments()` (`coordination`) n'appelle aucun endpoint** : le panneau est en avance
  sur le back. Il est désormais désactivé sur une soirée clôturée et n'annonce plus un faux succès,
  mais il reste à brancher.
- **Aucun harnais axe-core** dans le dépôt front, alors que les règles du projet exigent qu'AXE
  passe. L'accessibilité n'est vérifiée qu'à la lecture du markup.
- **`DELETE /v1/events/:id` et `DELETE /v1/jobs/:id`** ne sont gardés que par `auth()` : ils
  refusent désormais de supprimer une soirée ou un poste porteur de crédit consolidé, mais un membre
  quelconque peut toujours détruire une soirée non consolidée et le travail d'affectation avec.
- **`GET /v1/logs`** est paginé (50 par défaut, 200 max) : tout client qui le consomme doit gérer
  `metadata`, et non plus supposer recevoir la table entière.
- **`config/cors.ts`** liste les origines de production **sans schéma**
  (`'dashboard.bae.eirb.fr'`) alors que l'en-tête `Origin` vaut toujours
  `https://dashboard.bae.eirb.fr` : la comparaison ne peut jamais correspondre, donc tout appel
  cross-origin est refusé en production. Invisible en développement
  (`origin: app.inDev ? true : [...]`). Indépendant du SSO, mais bloquant pour lui (§9.8).
- **`logs.url` stocke la query string** (`ctx.request.url(true)`) : toute route recevant un secret
  en paramètre l'écrit en clair dans une table lisible avec `log:read`. La rédaction ne couvre que
  le corps de réponse. Premier cas concret à venir : le callback OAuth et son `?code=` (§9.9).

---

## 9. SSO Keycloak — authentification en mode BFF

**Décision : le SSO est Keycloak (OIDC standard), en mode BFF — c'est Adonis qui porte le flow
OAuth, pas le navigateur.** Le front n'obtient jamais de jeton lisible : il reçoit un cookie
`httpOnly`. Partout où ce document parlait de « SSO CAS », lire « SSO Keycloak » — l'IdP change,
mais **`users.cas_id` reste la correspondance avec l'identité CAS de l'école** et garde tout son
rôle (§9.4).

Ce qui ne change pas : l'OAT reste le jeton d'accès de l'API, `auth_access_tokens` reste la table
de sessions, et **l'authentification email/mot de passe du dashboard est conservée telle quelle**.
Le SSO est une seconde porte vers le même jeton, pas un remplacement.

### 9.1 Le socle est déjà là — l'inventaire avant d'installer quoi que ce soit

Contrairement à ce que laisse penser le §3.3, presque toute la plomberie est **déjà installée et
câblée**. Il n'y a rien à `npm install`.

| Brique                     | État réel                                                                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@adonisjs/ally` ^6.3.0    | Dépendance présente, non configurée — mais **inutilisable ici** : pas de support PKCE, qu'EirbConnect exige (§9.3)                                           |
| `@adonisjs/shield` ^9.0.0  | Installé, `shield_middleware` **déjà dans `router.use()`**. `config/shield.ts` : `csrf.enabled: false`, `enableXsrfCookie: true` → **un booléen à basculer** |
| `@adonisjs/session` ^8.1.0 | Installé et câblé — c'est là que vivront `state` et `code_verifier`, et c'est aussi le secret CSRF de Shield                                                 |
| `@adonisjs/cors` ^3.0.0    | `credentials: true` **déjà activé**, allowlist de production déjà écrite (mais fausse, §9.8)                                                                 |

⚠️ **Le dépôt est en AdonisJS v7, pas v6** : `@adonisjs/core` est en `^7.3.4` et `@adonisjs/auth`
en `^10.1.0`. L'en-tête de ce document et `BAE-Front/.claude/CLAUDE.md` annoncent « AdonisJS 6 » —
c'est faux, et ça oriente vers la mauvaise documentation. Corrigé ici ; à corriger aussi dans
`CLAUDE.md`.

À produire, donc : un service OIDC (§9.3), les variables d'environnement, une migration, un
contrôleur, un middleware de lecture du cookie, et le basculement CSRF. Plus une demande à
EirbWare, qui est le vrai chemin critique (§9.2).

### 9.2 EirbConnect — on ne configure pas le realm, on le demande

**Le Keycloak est EirbConnect, opéré par EirbWare** (doc :
`https://docs.eirb.fr/respo_web/eirbconnect_documentation/`). Nous ne sommes pas administrateurs
du realm : il n'y a donc **aucune console d'admin à ouvrir**, et tout ce qui suit relève d'une
demande à formuler auprès d'EirbWare. C'est un délai humain à anticiper, pas une tâche de dev.

Ce que la doc donne :

| Paramètre      | Valeur                                                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| Issuer         | `https://conncect.vpn.eirb.fr/realms/eirb` (orthographe verbatim de la doc, `conncect` — **à confirmer**) |
| Realm          | `eirb`                                                                                                    |
| Type de client | **Confidential** (`CLIENT_ID` + `CLIENT_SECRET`) — exactement ce qu'exige le mode BFF                     |
| Scopes         | `openid profile email`                                                                                    |
| PKCE           | **Exigé**, `code_challenge_method: S256`                                                                  |
| Claims exposés | `uid`, `prenom`, `nom`                                                                                    |

**À demander à EirbWare :**

1. Un `CLIENT_ID` / `CLIENT_SECRET` pour le client confidential.
2. Le **whitelistage des URI de redirection** — c'est eux qui les enregistrent, pas nous :
   `http://localhost:3333/v1/auth/keycloak/callback` (développement) et
   `https://api.bae.eirb.fr/v1/auth/keycloak/callback` (production). Une seule URI de callback
   pour les deux fronts : c'est le cookie `sso_app` qui distingue la destination (§9.5), pas l'URL
   de retour. La doc mentionne le port 8080 en local — préciser qu'ici c'est 3333.
3. Les **post logout redirect URIs** (`https://dashboard.bae.eirb.fr`,
   `https://order.bae.eirb.fr`) si l'on veut le logout global (§9.5).
4. ⚠️ **Un claim de promotion**, s'il existe. La doc n'en liste aucun, or la maquette `adherents`
   affiche « Promotion » (§4.4). Deux issues : EirbWare l'expose, ou on le demande à l'utilisateur
   à la première précommande. À trancher **avant** d'écrire la table `clients`, c'est une colonne
   qui change de nature (dérivée de l'IdP vs saisie).

**Correspondance des claims — ils ne sont pas standards, et c'est structurant :**

| Claim EirbConnect | Colonne              | Rôle                                                                                                           |
| ----------------- | -------------------- | -------------------------------------------------------------------------------------------------------------- |
| `uid`             | **`users.cas_id`**   | Le login école. C'est **lui** la correspondance annuaire cherchée au §9.4, et la clé de réconciliation du §9.5 |
| `prenom`          | **`users.first_name`** | Pas `given_name`. ⚠️ **Corrigé le 2026-08-16** : plus `clients.first_name`, la colonne a été remontée sur `users` (voir §0 undecies) |
| `nom`             | **`users.last_name`**  | Pas `family_name`. Même correction                                                                             |
| `sub`             | `users.keycloak_sub` | UUID interne du realm                                                                                          |

Autrement dit, **la question du §9.4 est résolue** : `uid` alimente `cas_id`, la réconciliation des
comptes existants est possible, et aucun mapper supplémentaire n'est à demander pour ça. En
revanche, écrire `given_name` / `family_name` par réflexe donnerait `undefined` partout.

⚠️ **Deux points d'infrastructure à vérifier avant de promettre une date :**

- L'issuer est sous `*.vpn.eirb.fr`. Si l'IdP n'est joignable que depuis le réseau de l'école, cela
  contraint **deux** chemins distincts : le serveur Adonis (échange du code, appel `userinfo`) et
  **le navigateur de l'utilisateur** (redirections). Le second est le vrai risque : un étudiant
  qui précommande depuis son téléphone en 4G doit pouvoir atteindre la page de login.
- L'orthographe `conncect` figure telle quelle dans la doc. Soit c'est le nom réel, soit c'est une
  coquille : à vérifier avant de la recopier dans le `.env`.

Variables à ajouter au `.env` **et à `start/env.ts`** — ce fichier valide un schéma explicite, une
variable absente du schéma n'est ni typée ni lisible via `env.get()` :

```
KEYCLOAK_ISSUER=https://conncect.vpn.eirb.fr/realms/eirb   // Env.schema.string({ format: 'url' })
KEYCLOAK_CLIENT_ID=…                            // Env.schema.string()
KEYCLOAK_CLIENT_SECRET=…                        // Env.schema.secret()

# développement
KEYCLOAK_CALLBACK_URL=http://localhost:3333/v1/auth/keycloak/callback
DASHBOARD_URL=http://localhost:4200             // destination de redirection après callback
PUBLIC_APP_URL=http://localhost:4201            // idem, front public

# production
KEYCLOAK_CALLBACK_URL=https://api.bae.eirb.fr/v1/auth/keycloak/callback
DASHBOARD_URL=https://dashboard.bae.eirb.fr
PUBLIC_APP_URL=https://order.bae.eirb.fr
```

Les endpoints ne sont pas à écrire à la main : ils se découvrent depuis l'issuer, via
`/.well-known/openid-configuration`.

### 9.3 ⚠️ PKCE oblige à renoncer à Ally

**EirbConnect impose PKCE** (`code_challenge_method: S256`) — et nous ne pouvons pas assouplir
cette politique, puisque le realm ne nous appartient pas. Or **Ally v6 n'implémente pas PKCE** :
`Oauth2Driver` ne pose ni `code_challenge` à la redirection, ni `code_verifier` à l'échange. Le
plan initial (« un driver Ally custom ») bute donc sur une limite du paquet, pas sur un détail de
configuration.

Deux issues :

| Option                                                    | Ce que ça coûte                                                                                                                                                                                                                              |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`openid-client` dans un service Adonis** _(recommandé)_ | Une dépendance de plus. En échange : PKCE, découverte des endpoints, validation de l'`id_token` et logout RP-initiated, tout est natif                                                                                                       |
| Driver Ally + PKCE à la main                              | Générer le `code_verifier`, le stocker en session, dériver le challenge S256, l'injecter dans `configureRedirectRequest` puis `configureAccessTokenRequest`. Faisable, mais c'est réécrire à la main la partie la plus sensible du protocole |

**Recommandation : `openid-client`.** Trois raisons cumulatives, dont la dernière est décisive :
PKCE et la découverte sont natifs ; l'`id_token` — nécessaire au logout global (§9.5) — est
directement exposé, là où Ally ne le fait pas remonter ; et surtout **c'est la bibliothèque de
l'exemple d'implémentation d'EirbConnect**, ce qui veut dire que le jour où quelque chose ne passe
pas, on compare avec du code qui marche et on parle le même langage qu'EirbWare.

`@adonisjs/ally` reste alors installé sans être utilisé — soit on le retire, soit on le laisse en
notant pourquoi. Ne pas laisser un `config/ally.ts` vide traîner : le prochain lecteur croira à un
travail inachevé.

Ce que le service doit faire, dans les deux cas :

- **Découvrir** la configuration depuis `KEYCLOAK_ISSUER`, au démarrage et non à chaque requête.
- **Générer et stocker `state` + `code_verifier`** en session avant la redirection. La session est
  déjà câblée (`session_middleware`) et son cookie est en `SameSite=Lax` : il survit donc au
  retour depuis EirbConnect, qui est une navigation GET de premier niveau. En `Strict`, il serait
  perdu et **toutes** les connexions échoueraient sur une erreur d'état — symptôme classique et
  très déroutant.
- **Vérifier `state`** au retour, échanger le code avec le `code_verifier`, puis lire les claims.
- **Conserver l'`id_token`** si l'on veut le logout global : il sert d'`id_token_hint`.

Points qui coûtent du temps si on les découvre en route :

- **`openid` doit figurer dans les scopes** (`openid profile email`). Sans lui, la réponse est de
  l'OAuth2 pur : pas de `sub`, et `/userinfo` refuse.
- **Les claims d'EirbConnect ne sont pas les claims standards** : `uid`, `prenom`, `nom` — pas
  `preferred_username`, `given_name`, `family_name` (§9.2). Écrire les noms standards par réflexe
  donne `undefined` partout, sans erreur.
- **L'identifiant stable est `sub`, pas l'email.** Un utilisateur peut changer d'adresse ; s'il
  sert de clé, on crée un doublon au prochain login. C'est `sub` qui va dans `keycloak_sub`, et
  `uid` dans `cas_id`.
- **`uid` peut être absent des claims si le scope `profile` manque** — et son absence n'est pas une
  erreur visible, juste une réconciliation qui ne se fait plus (§9.5). Traiter un `uid` manquant
  comme un échec explicite du callback plutôt que comme un `null` qu'on écrit en base.

### 9.4 Migration

```ts
table.string('keycloak_sub').nullable().unique(); // nullable : les comptes mot-de-passe n'en ont pas
table.string('password').nullable().alter(); // nullable : les comptes SSO n'en ont pas
```

⚠️ **`password` nullable ouvre un défaut confirmé dans `POST /v1/auth/login`.** Le mixin
`withAuthFinder` (`@adonisjs/auth@10`) fait, dans `verifyCredentials` :

```js
if (!uid || !password) throw new E_INVALID_CREDENTIALS('Invalid user credentials');
const user = await this.findForAuth(uids, uid);
if (!user) {
  await hash.make(password);
  throw new E_INVALID_CREDENTIALS('Invalid user credentials');
}
if (await user.verifyPassword(password)) return user; // ← aucun garde sur password === null
```

et `verifyPassword` est documenté « @throws RuntimeException when password column value is
undefined or null ». Soumettre le formulaire mot-de-passe avec l'email d'un compte SSO produira
donc un **500**, là où un compte inexistant produit un 400. C'est un plantage, et accessoirement
un oracle d'énumération de comptes. À couvrir par un garde explicite avant l'appel, et par un
test (§9.11).

Le hook `hashPassword` ne pose lui aucun problème : il ne s'exécute que si la colonne est
`$dirty`, et `null` est falsy.

⚠️ **`users.cas_id` n'est pas un vestige et ne doit pas être supprimé.** C'est lui qui porte la
correspondance entre un utilisateur en base et son identité au CAS de l'école. Les deux colonnes
coexistent et ne jouent pas le même rôle :

| Colonne        | Rôle                                                                                  | Durée de vie                                                                |
| -------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `cas_id`       | **Identité métier** : à quelle personne de l'annuaire de l'école ce compte correspond | Stable — ne change ni si l'on reconstruit le realm, ni si l'on change d'IdP |
| `keycloak_sub` | **Clé technique d'authentification** : l'UUID interne du realm                        | Liée à ce realm-ci ; un ré-import du realm la change                        |

D'où la règle : `keycloak_sub` sert à **retrouver** rapidement l'utilisateur d'une session, `cas_id`
sert à **savoir qui il est** et à réconcilier avec l'existant (§9.5, étape 3). C'est `cas_id` qui
survit à un incident d'infrastructure, donc c'est lui qu'on ne perd jamais.

Conséquence sur la configuration Keycloak : l'identifiant CAS doit **arriver dans les claims**,
sinon la correspondance est impossible à établir au premier login (§9.2, point 8). Si le realm
fédère bien le CAS de l'école, c'est un mapper à exposer ; s'il ne le fédère pas, il faut
déterminer d'où viendra `cas_id` **avant** d'écrire le callback — c'est un préalable, pas un
détail d'implémentation.

L'invariant du §4.4 (« un client est forcément SSO ») se lit, lui, sur `keycloak_sub` : c'est la
preuve d'un passage par l'IdP.

### 9.5 `AuthController` — `redirect()` et `callback()`

Deux routes, hors du groupe `middleware.auth()` :

```ts
router.get('auth/keycloak/redirect', [controllers.KeycloakAuth, 'redirect']);
router.get('auth/keycloak/callback', [controllers.KeycloakAuth, 'callback']);
```

**`redirect()`** — lit `?app=dashboard|public`, **valide la valeur contre une liste fermée** (toute
autre valeur → 400), la pose dans un cookie signé court (`response.cookie('sso_app', app, {
maxAge: '10m', httpOnly: true, sameSite: 'lax' })`), génère `state` et `code_verifier` en session
(§9.3), puis redirige vers l'URL d'autorisation.

> Ne jamais accepter d'URL de retour en paramètre. Le cookie ne contient qu'un **mot-clé**, et la
> destination se résout côté serveur depuis `DASHBOARD_URL` / `PUBLIC_APP_URL`. Un
> `?redirect_uri=` accepté tel quel, c'est une redirection ouverte offerte à qui veut hameçonner
> vos utilisateurs.

**`callback()`** — dans l'ordre :

1. **Traiter les trois sorties d'erreur avant tout le reste**, chacune redirigeant vers le front
   avec un code explicite — sans quoi l'utilisateur tombe sur une page blanche :
   l'utilisateur a refusé le consentement ; `state` ne correspond pas (session perdue, ou
   tentative) ; l'IdP a renvoyé une erreur.
2. Échanger le code avec le `code_verifier`, puis lire les claims :
   `sub`, `uid`, `prenom`, `nom`, `email` (§9.2 — **pas** `given_name` / `family_name`).
3. **Résolution de l'utilisateur — en trois temps, pas un `firstOrCreate`.** C'est le point le
   plus facile à rater, et le rater crée des doublons sur des comptes existants :

   1. chercher par `keycloak_sub` → trouvé, c'est un retour d'utilisateur déjà lié, terminé ;
   2. sinon chercher par **`cas_id`** (issu des claims, §9.4) → trouvé : c'est un compte qui
      existe déjà en base et se connecte au SSO **pour la première fois**. On le **lie** en y
      inscrivant `keycloak_sub`, on ne crée rien ;
   3. sinon seulement, créer l'utilisateur avec `cas_id`, `keycloak_sub` et `email`.

   ⚠️ Sauter l'étape 2, c'est donner un second compte vierge — sans `members`, donc sans rôle,
   sans points, sans historique — à **chaque membre existant** le jour de la bascule. L'erreur est
   silencieuse : l'utilisateur voit juste un dashboard vide et croit à une perte de données.

   L'email n'est **jamais** une clé de recherche : il change. Le mettre à jour au passage si le
   claim diffère de la colonne, rien de plus.

4. **C'est ici que le §4.4 s'applique** — le provisionnement dépend du cookie `sso_app` :

   | `app`       | Règle                                                                                                                                                                          |
   | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
   | `dashboard` | **Aucun provisionnement.** Pas de ligne `members` → redirection vers une page « accès non autorisé ». On n'ouvre pas le dashboard à quiconque possède un compte SSO de l'école |
   | `public`    | `Client.firstOrCreate({ id: user.id }, { registeredAt })`, le nom allant sur `users` (§0 undecies) — c'est le JIT provisioning, et il n'a de sens que de ce côté. **C'est l'unique chemin de création d'un compte client** : le dashboard n'en a aucun |

   C'est la différence de fond entre les deux portes : la zone publique s'auto-provisionne, le
   dashboard exige une ligne créée par le bureau.

5. `const token = await User.accessTokens.create(user)` — **le même OAT qu'aujourd'hui**.
   ⚠️ `AccessTokenController.store` complète ensuite la ligne avec `ip_address` / `user_agent` par
   un `UPDATE` direct (le provider n'expose pas de hook). Ce bout de code doit être **factorisé et
   réutilisé ici**, sinon les sessions SSO apparaissent vides dans la page Sécurité (§2.3), qui
   affiche précisément ces deux colonnes.
6. Pose du cookie : `httpOnly: true`, `secure: app.inProduction`, `sameSite: 'lax'`, `path: '/'`,
   `maxAge` aligné sur l'expiration du jeton. ⚠️ `secure: true` **en dur casse le développement** :
   un cookie `Secure` est refusé sur `http://localhost`.
7. `response.redirect(app === 'dashboard' ? env.get('DASHBOARD_URL') : env.get('PUBLIC_APP_URL'))`.

**Logout.** `AccessTokenController.destroy` supprime l'OAT mais ne connaît pas le cookie : il doit
maintenant l'effacer (`response.clearCookie(...)`). Le logout Keycloak global (invalider aussi la
session SSO, pas seulement la session BAE) est une redirection vers
`/protocol/openid-connect/logout` — à décider : sans elle, se déconnecter puis recliquer « SSO »
reconnecte instantanément et sans mot de passe, ce qui surprend sur un poste partagé.

### 9.6 Lire l'OAT depuis le cookie plutôt que depuis l'en-tête

Le `tokensGuard` d'`@adonisjs/auth` lit l'en-tête `Authorization: Bearer` **en dur** et n'expose
aucune option de source. Deux voies :

| Approche                                                                     | Coût                                                                      |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Guard personnalisé implémentant `GuardContract`                              | Propre, mais on réimplémente la vérification du jeton et son cycle de vie |
| **Middleware qui recopie le cookie dans l'en-tête** avant l'authentification | Une dizaine de lignes, aucun code de sécurité réécrit — **recommandé**    |

Le middleware se place dans `router.use()` **avant** `initialize_auth_middleware`, et ne fait rien
si un en-tête `Authorization` est déjà présent. Cette condition n'est pas cosmétique :

- `silent_auth_middleware` est global (`ctx.auth.check()` sur chaque requête) et bénéficie
  automatiquement du même pont ;
- **les 58 tests du back s'authentifient par en-tête** — les garder prioritaires, c'est garder la
  suite verte sans la réécrire ;
- `curl` et les futurs appels machine-à-machine continuent de fonctionner.

### 9.7 CSRF

`csrf.enabled: true` dans `config/shield.ts` — `enableXsrfCookie` est déjà à `true`, et
`methods` couvre déjà `POST/PUT/PATCH/DELETE`. Le passage à l'authentification par cookie **rend
cette protection obligatoire** : tant que le jeton était en `localStorage`, aucune requête
inter-site ne pouvait l'emporter ; un cookie, si.

Quatre pièges, dans l'ordre où on les rencontre :

- ⚠️ **Le support XSRF natif d'Angular ne se déclenchera jamais ici.** `HttpXsrfInterceptor`
  ignore toute URL absolue commençant par `http://` ou `https://` — or `environment.apiUrl` vaut
  `http://localhost:3333/v1`. `withXsrfConfiguration()` donnera donc l'illusion de fonctionner
  sans jamais poser d'en-tête. **L'intercepteur maison est bien nécessaire**, ce n'est pas une
  duplication du natif.
- **La valeur du cookie `XSRF-TOKEN` est chiffrée** et doit être recopiée **telle quelle** dans
  `X-XSRF-TOKEN`. Shield la déchiffre côté serveur. Ne pas tenter de la décoder ou de la
  normaliser — et attention, le cookie est _lisible_ par JS (`httpOnly: false`) uniquement parce
  qu'il est chiffré.
- **Shield stocke le secret CSRF en session** : l'API cesse d'être sans état, et le cookie de
  session doit voyager avec (mêmes contraintes qu'en §9.8).
- ⚠️ **La toute première requête d'écriture échoue si aucun cookie n'a encore été émis.** Il faut
  un GET préalable. Heureusement le front en fait déjà un au démarrage : l'appel de réhydratation
  vers `/account/profile` (§9.10) sert de mise en route. À condition qu'il précède toute écriture
  — sinon prévoir une route dédiée.

`exceptRoutes` : le callback Keycloak est un GET, donc hors périmètre. En revanche le **webhook de
paiement** (§4.3) devra y figurer explicitement — un prestataire ne présentera jamais de jeton CSRF.

### 9.8 Topologie de production et cookies inter-sites

| Rôle                                   | Origine                         |
| -------------------------------------- | ------------------------------- |
| API Adonis                             | `https://api.bae.eirb.fr`       |
| Front dashboard                        | `https://dashboard.bae.eirb.fr` |
| Front public (précommandes, fast pass) | `https://order.bae.eirb.fr`     |

`SameSite=Lax` n'est pas une préférence, c'est une contrainte de topologie : le cookie n'est
transmis que si la page et la cible partagent le **domaine enregistrable** (eTLD+1) — ni le
sous-domaine ni le port n'entrent dans le calcul.

Les trois origines tiennent sous `eirb.fr`, donc **tout est same-site et `Lax` suffit**. Les
appels `dashboard.… → api.…` et `order.… → api.…` sont cross-**origin** (d'où le CORS et le
`withCredentials`) mais same-**site** (d'où le cookie qui passe). C'est exactement le montage
pour lequel `Lax` a été conçu ; il n'y a aucune raison de descendre à `SameSite=None`.

Deux conséquences pratiques :

- **Ne pas poser d'attribut `Domain` sur le cookie de session.** Un cookie _host-only_ émis par
  `api.bae.eirb.fr` n'est renvoyé qu'à `api.bae.eirb.fr`, ce qui est précisément le besoin — et
  c'est le comportement par défaut de `response.cookie()`. Ajouter `Domain=.bae.eirb.fr` par
  réflexe « sous-domaines » l'exposerait à `dashboard.` et `order.` sans aucun gain, y compris à
  un futur sous-domaine compromis.
- **Cette topologie fait partie du contrat.** Déplacer un front hors de `eirb.fr` (Vercel,
  Netlify, un domaine d'école) rend le cookie **silencieusement absent** : pas d'erreur, juste un
  utilisateur éternellement déconnecté. À écrire dans la doc de déploiement, pas seulement ici.
  Le repli serait `SameSite=None; Secure`, qui exige alors un CSRF irréprochable.

Le WebSocket profite de la même propriété : `wss://api.bae.eirb.fr` reçoit le cookie au handshake,
ce qui permet d'authentifier la connexion côté serveur au lieu de faire confiance à l'`user.id`
envoyé par le client (§9.10).

En développement, `localhost:4200 → localhost:3333` est également same-site (le port ne compte
pas) : rien à faire, hormis ne pas forcer `Secure` (§9.5).

⚠️ **Défaut à corriger dans `config/cors.ts` :** les noms d'hôte sont bons, mais les origines sont
écrites **sans schéma** (`'dashboard.bae.eirb.fr'`). L'en-tête `Origin` envoyé par le navigateur
vaut toujours `https://dashboard.bae.eirb.fr` : la comparaison par égalité de chaîne **ne matchera
jamais**, et tout appel cross-origin sera refusé en production. Le développement masque le problème
(`origin: app.inDev ? true : [...]`). À corriger en `['https://dashboard.bae.eirb.fr',
'https://order.bae.eirb.fr']` **avant** la mise en service du SSO — sinon on cherchera le bug dans
le flow OAuth.

Deux ajustements dans la foulée : `api.bae.eirb.fr` n'a rien à faire dans sa propre allowlist (une
requête même-origine n'envoie pas d'`Origin`), et l'entrée `'bae.eirb.fr'` actuellement présente
est à confirmer — si c'est un site vitrine qui n'appelle pas l'API, elle élargit la surface pour
rien.

### 9.9 Journalisation — deux fuites à fermer en même temps

Le §8 signale déjà des jetons en clair dans d'anciens `logs`. Le SSO en rouvre deux voies :

- `log_redaction_service.ts` supprime le corps des réponses pour
  `['/auth/login', '/auth/signup', '/auth/logout', '/account/sessions']`. **`/auth/keycloak/callback`
  doit rejoindre cette liste** (couche 1, la seule qui garantisse quoi que ce soit — la couche 2
  est une denylist de noms de clés, best-effort par construction).
- ⚠️ Plus grave, parce que la rédaction ne peut rien y faire : `request_logger_middleware` stocke
  `ctx.request.url(true)`, **query string comprise**, dans la colonne `logs.url`. Le callback
  arrive sous la forme `?code=…&state=…`. Le code d'autorisation — à usage unique et court, mais
  échangeable contre un jeton — serait donc écrit en clair dans une table lisible avec la
  permission `log:read`. La rédaction ne couvre que le corps : il faut **exclure cette route du
  logger**, ou tronquer la query pour elle.

### 9.10 Côté Angular — ce qui change dans les deux fronts

Le passage au cookie `httpOnly` n'est pas un remplacement d'intercepteur : **le front perd tout
accès au jeton**, et plusieurs mécanismes qui s'appuyaient sur sa présence n'ont plus de signal.

| Fichier                                      | Changement                                                                                                        |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `core/services/tokens/tokens-service.ts`     | **Supprimé.** Plus rien à stocker                                                                                 |
| `core/interceptors/auth/auth-interceptor.ts` | Devient un `req.clone({ withCredentials: true })`. Sa liste `IGNORE_PATHS` (`/auth/login`) n'a plus d'objet       |
| `core/interceptors/csrf/`                    | **Nouveau** : lit le cookie `XSRF-TOKEN`, le pose en `X-XSRF-TOKEN` sur les méthodes d'écriture uniquement        |
| `core/guards/auth-guard.ts`                  | **Réécrit** — voir ci-dessous                                                                                     |
| `core/store/auth/auth.effect.ts`             | `rehydrate$` perd sa garde sur le jeton ; `login$` ne fait plus `setTokens()` ; `logout$` doit appeler le serveur |

- ⚠️ **`authGuard` est le vrai chantier.** Il décide aujourd'hui sur
  `tokensService.getValidAccessToken()`, c'est-à-dire sur la présence d'une valeur en
  `localStorage` — un test synchrone et local. Avec un cookie `httpOnly`, **cette information
  n'existe plus côté client**. Le garde doit s'appuyer sur l'état du store d'authentification et
  _attendre_ la fin de la réhydratation, sinon il redirigera vers `/login` à chaque rechargement
  de page, avant que `/account/profile` n'ait répondu. Prévoir un état « en cours » explicite dans
  `auth.reducer`, et un garde qui filtre dessus (`filter(s => s !== 'pending')`, `take(1)`).
- `rehydrate$` se simplifie : appeler `/account/profile` et conclure sur le résultat. Un 401 →
  `rehydrationFailed`. C'est aussi ce qui amorce le cookie CSRF (§9.7).
- `logout$` fait aujourd'hui `tokensService.clear()` puis **`localStorage.clear()`** — ce qui
  efface au passage la préférence de thème (`theme-service` y écrit). La déconnexion devient un
  `POST /auth/logout` (le serveur seul peut effacer le cookie) ; en profiter pour supprimer ce
  `localStorage.clear()` collatéral.
- **Bouton SSO** : `window.location.href = \`${apiUrl}/auth/keycloak/redirect?app=dashboard\``.
Ce doit être une navigation de premier niveau — un appel `HttpClient` suivrait la redirection en
  XHR et échouerait au CORS de Keycloak. Conséquence à assumer : on quitte la SPA, tout état non
  persisté est perdu.
- Le front public n'a **pas de formulaire de connexion** : le bouton SSO est le seul chemin, avec
  `app=public`. Son garde exige une ligne `clients`, celui du dashboard une ligne `members` (§4.4).
- `ApiEndPointV1` : ajouter les entrées SSO plutôt que de concaténer des chaînes dans les
  composants.
- À vérifier au passage : `websocketService.initialize(user.id)` prend l'identifiant **fourni par
  le client** et n'authentifie rien. Le cookie étant envoyé lors du handshake WebSocket même
  origine, c'est l'occasion d'authentifier la connexion côté serveur au lieu de faire confiance à
  un `user.id` reçu du navigateur.

### 9.11 Ce qui mérite un test

En suivant la règle du dépôt — un test pour un défaut nommé, pas pour une ligne couverte :

| Défaut visé                                                                          | Test                                                                                                                                                |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Un compte SSO (password `null`) fait planter le login mot-de-passe en 500 (§9.4)     | `POST /auth/login` sur un utilisateur sans mot de passe → 400 `E_INVALID_CREDENTIALS`, pas 500                                                      |
| Un `?app=` arbitraire fait de `redirect()` une redirection ouverte                   | `?app=https://evil.example` → 400, aucune redirection                                                                                               |
| Un membre existant se voit créer un compte vierge à sa première connexion SSO (§9.5) | Utilisateur en base avec `cas_id` et sans `keycloak_sub`, callback portant ce `cas_id` → le même `users`, `keycloak_sub` renseigné, aucune création |
| Un changement d'email côté Keycloak crée un second utilisateur                       | Deux callbacks, même `sub`, emails différents → un seul `users`, email mis à jour                                                                   |
| Le pont cookie → en-tête casse l'authentification par en-tête                        | Une requête authentifiée par `Authorization` reste acceptée (c'est la garantie que les 58 tests existants restent verts)                            |
| Le dashboard s'ouvre à un utilisateur SSO sans ligne `members`                       | Callback `app=dashboard` sans membre → pas de session, redirection d'erreur                                                                         |

Ne pas tester le flux OAuth lui-même : cela reviendrait à tester `openid-client` et EirbConnect.
Isoler la résolution d'utilisateur et le provisionnement dans un service qui prend des **claims
déjà validés** en entrée — c'est là qu'est toute notre logique, et c'est testable sans réseau.

---

## 10. Paiement — Lydia Pro (lien de paiement et scan de QR client)

**Décision : l'encaissement dématérialisé passe par Lydia Pro**, par **lien de paiement** et par
**scan de QR code**. Cela concerne trois usages : la cotisation publique (§4.3), les précommandes
(§3.4) et l'encaissement au comptoir (`caisse`).

### 10.1 Deux flux distincts, en sens opposés

⚠️ **Ce ne sont pas deux présentations d'une même intégration.** Le sens du QR code est l'inverse
de l'intuition, et s'en rendre compte tard coûte une page entière à refaire :

| Flux                 | Qui initie                                                  | Sens                                                    | Contexte                               |
| -------------------- | ----------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------- |
| **Lien de paiement** | Nous : l'API crée une demande, obtient une URL              | Le **client** ouvre le lien et paie                     | Front public : cotisation, précommande |
| **Scan du QR**       | Le **client** : il affiche un QR dans son application Lydia | **Nous** scannons ce QR pour encaisser sur notre compte | Comptoir : page `caisse`               |

Le second flux n'est décrit par aucune documentation accessible, mais **il est attesté par
l'usage** : Scan'Eirb encaisse ainsi, y compris depuis sa version web (§10.6). Le tableau tient
donc — reste à découvrir _par quel mécanisme_, ce qui est l'objet du §10.6.

Dans le second cas, **le QR n'est jamais généré ni affiché par nous** — il est _lu_. Il n'y a donc
aucune bibliothèque de génération de QR à installer ; il faut **une caméra et un décodeur**.

Conséquences concrètes pour la caisse :

- **C'est une capacité matérielle, pas une page.** Il faut un appareil avec caméra au comptoir, et
  côté navigateur `getUserMedia` + un décodeur (l'API native `BarcodeDetector` là où elle existe,
  une bibliothèque en repli). La caméra exige un **contexte sécurisé** : HTTPS en production,
  `localhost` toléré en développement.
- **Cette capacité est attendue trois fois ailleurs.** Le §4 liste `stocks/scanner` (« décision
  produit : scan côté client ou endpoint dédié »), et le §11 ajoute les QR émis par le BAE —
  retrait de précommande, fast pass, identité client. Même besoin technique à chaque fois : **un
  composant de scan réutilisable**, plusieurs actions derrière. Les traiter séparément, c'est
  écrire quatre fois le même code caméra, avec quatre fois les mêmes bugs de permission et
  d'orientation.
- ⚠️ **Le bouton d'encaissement Lydia reste distinct du bouton de scan de nos QR** (§11.4) : une
  caméra qui devine ce qu'elle lit finira par débiter quelqu'un venu montrer son adhésion.
- **Le flux est court et synchrone du point de vue du caissier** : il scanne, il attend une
  réponse, il rend la monnaie ou refuse. L'écran doit donc distinguer clairement « en cours »,
  « encaissé » et « refusé » — un encaissement ambigu devant un client qui attend, c'est un
  double paiement en puissance.

Le flux « lien », lui, est asynchrone par nature : le client paie sur son téléphone, à son rythme.
C'est **celui-là** qui a besoin d'une confirmation poussée en direct (§10.4).

### 10.2 Le schéma de `transactions` ne peut pas porter un paiement en ligne

C'est le vrai chantier. La table tient en quatre colonnes utiles :

```ts
table.increments('id');
table.enum('type', ['cash', 'lydia']).notNullable();
table.decimal('amount', 10, 2).unsigned().notNullable();
table.timestamp('created_at');
table.timestamp('updated_at');
```

Ni statut, ni référence externe, ni payeur. Conséquences, dans l'ordre de gravité :

- **Pas de `status`.** Une ligne signifie aujourd'hui « l'argent est passé » — c'est vrai pour du
  liquide, faux dès qu'il y a un prestataire. Un paiement en ligne a des états (`pending`,
  `paid`, `expired`, `cancelled`, `refunded`) et l'écrasante majorité des demandes créées
  n'aboutissent jamais. Sans statut, impossible d'appliquer la règle du §4.3 (« ne créer la
  `subscription` qu'après confirmation ») autrement qu'en ne créant _rien_ avant — donc en
  perdant la trace des paiements abandonnés, et avec elle toute capacité de diagnostic.
- **Pas de référence externe.** Il faut une colonne `provider_reference` **avec un index unique** :
  c'est à la fois le lien avec le prestataire pour le rapprochement (page `paiements`) et
  **la clé d'idempotence du webhook**. Un prestataire réémet ses notifications ; sans unicité en
  base, un double appel encaisse deux fois.
- **Pas de payeur.** `orders.transaction_id` et `pre_orders.transaction_id` pointent vers la
  transaction, donc ces deux cas sont couverts par le côté opposé. Mais **`subscriptions` n'a
  aucune colonne `transaction_id`** (sa clé est `(user_id, fast_pass_id, subscribed_at)`) : la
  cotisation payée en ligne n'a nulle part où enregistrer _ce qui l'a payée_. À ajouter, sinon la
  page `adherents` ne pourra jamais afficher le moyen de paiement qu'elle promet déjà dans sa
  maquette (`Cotisation.moyen`).
- **`type` est un `enum` figé** à `cash | lydia`. Faire évoluer un enum est une migration lourde ;
  si un second prestataire est envisageable un jour, le moment de basculer sur une table ou une
  chaîne contrainte, c'est maintenant. Noter aussi que `type` décrit le **moyen**, pas la
  présentation : lien et QR produisent tous deux `lydia`, et distinguer les deux n'a d'intérêt que
  statistique — si on y tient, c'est une colonne séparée, pas une valeur d'enum de plus.
- `amount` est un `decimal` : rendu **en string** par le driver (piège §1). `TransactionsController`
  le coerce déjà avec `Number()`. Pour la comparaison avec le montant annoncé par le prestataire,
  **comparer en centimes entiers**, jamais deux flottants.

### 10.3 Les invariants du flux

Aucun n'est propre à Lydia ; tous se paient cher s'ils sont découverts en production.

1. **Le jeton commerçant ne quitte jamais le serveur.** Vaut surtout pour le flux « scan » : le
   navigateur du comptoir décode le QR et **transmet le code lu à notre API**, qui seule appelle
   Lydia. Un front qui appellerait Lydia directement exposerait le jeton d'encaissement du BAE
   dans un bundle JavaScript.
2. **La confirmation vient du serveur, jamais du navigateur.** Pour le flux « lien », l'URL de
   retour dans le navigateur est un confort d'affichage : l'utilisateur peut fermer l'onglet,
   perdre le réseau, ou la fabriquer à la main. **Le webhook est la seule source de vérité** et
   c'est lui — et lui seul — qui déclenche la contrepartie (créer la `subscription`, valider la
   précommande). Pour le flux « scan », la vérité est la réponse de l'API d'encaissement à
   _notre_ appel — pas ce que l'écran du client affiche.
3. **Ne jamais faire confiance au contenu de la notification.** La réponse saine est de
   **réinterroger l'API du prestataire** sur l'état de la demande à réception, plutôt que de
   croire le corps reçu. C'est plus robuste que toute vérification de signature, et ça résiste à
   un endpoint deviné.
4. **Vérifier le montant** renvoyé contre le montant attendu avant toute contrepartie. Une demande
   de paiement dont le montant a été manipulé côté client est le scénario de fraude classique.
5. **Idempotence.** Le webhook sera appelé plusieurs fois pour le même paiement, et un caissier
   rescannera un QR dont la réponse a mis trop longtemps. La contrepartie doit être conditionnée à
   une transition d'état (`pending → paid`) faite en une seule requête, pas à un
   `if (already) return` lu puis écrit — deux notifications simultanées passeraient les deux.
6. **Expiration.** Les demandes non payées doivent finir `expired`, sinon la table se remplit de
   `pending` éternels et le rapprochement devient illisible. Une commande `node ace` planifiée
   suffit.

### 10.4 Ce qui, dans ce dépôt précisément, va poser problème

- ⚠️ **`case_converter_middleware` réécrit le corps entrant en camelCase.** Si la vérification de
  la notification repose sur une **signature calculée sur le corps brut**, elle échouera
  systématiquement : le contrôleur ne voit plus les octets reçus. Il faut capter le corps brut
  avant conversion (route exclue du middleware, ou lecture du flux) — ou s'en remettre à
  l'invariant n° 2, qui contourne le problème en réinterrogeant l'API.
- ⚠️ **Le webhook doit être exclu du CSRF** (`csrf.exceptRoutes`, §9.7) et **hors du groupe
  `middleware.auth()`** : un prestataire ne présente ni jeton CSRF ni session. C'est donc une
  route publique en écriture — d'où l'insistance sur les invariants 2 à 4.
- ⚠️ **`logs.url` stocke la query string** (§8). Si l'URL de confirmation porte un jeton en
  paramètre, il finit en clair dans une table lisible avec `log:read`. Même correctif que pour le
  callback OAuth : exclure la route du logger.
- `GET /v1/transactions` est aujourd'hui **en lecture seule** et sous `middleware.auth()`. Le
  chemin d'écriture reste à créer (§3.4) ; le paiement en ligne en est le premier client, mais la
  caisse en espèces en a besoin tout autant.
- **Le flux « lien » a besoin d'une confirmation poussée en direct**, puisque le client paie sur
  son propre téléphone : c'est l'usage du service WebSocket déjà présent
  (`core/services/websocket/`) — le webhook confirme, le serveur pousse, la page bascule. Le flux
  « scan » n'en a pas besoin : il se résout dans la réponse HTTP à notre appel d'encaissement.
- **Le scan est une capacité front à mutualiser** avec `stocks/scanner` (§10.1), pas un bout de
  code de la page `caisse`.

### 10.5 Configuration et environnements

À obtenir côté Lydia Pro, et à ranger comme les variables Keycloak — dans le `.env` **et** dans le
schéma de `start/env.ts` (§9.2) : le jeton de commerçant, l'URL de l'API, et les URL de retour et
de notification, distinctes par environnement.

Deux points restent à faire préciser par Lydia, parce qu'ils changent la forme de l'intégration
(le troisième — l'environnement de test — est réglé, cf. §10.6) :

- **Ce que contient le QR client et comment on l'encaisse** : le code lu est-il à usage unique ?
  Porte-t-il un montant, ou l'imposons-nous ? L'encaissement est-il confirmé de façon synchrone,
  ou faut-il quand même attendre une notification ? La réponse décide s'il faut, ou non, un état
  `pending` pour ce flux aussi.
- **Le comportement en cas d'échec** : provision insuffisante, QR expiré, client qui annule depuis
  son application. Ces cas arrivent au comptoir, devant quelqu'un qui attend — ils méritent un
  message d'écran chacun, pas une erreur générique.

Ne rien présumer de ces réponses : elles conditionnent le modèle de données du §10.2.

### 10.6 Obtenir l'accès à l'API — état des lieux au 7 août 2026

**Aujourd'hui le BAE passe par [scan.eirb.fr](https://scan.eirb.fr/) ; l'objectif est d'intégrer
l'encaissement directement dans l'application.** Voici ce que la recherche publique établit, et ce
qu'elle laisse ouvert.

**⚠️ La documentation de l'API Lydia n'est pas publique.** Elle s'obtient sur demande à
`supportpro@lydia-app.com`, **en joignant un cahier des charges et le type de produits vendus**.
L'API n'est pas open source. C'est donc, comme les identifiants EirbConnect (§9.2), **un délai
humain sur le chemin critique** : à lancer maintenant, pas quand le reste sera prêt. Un
environnement d'**homologation** est fourni dans le cadre d'une intégration, avec identifiants et
moyens de paiement de test dédiés — la question laissée ouverte en §10.5 est donc réglée.

**⚠️ Lydia Pro devient Sumeria.** Les supports parlent désormais de « Sumeria / Lydia ». Faire
confirmer par le support que l'offre pro, les URL d'homologation et les jetons visés sont toujours
d'actualité **avant** d'écrire quoi que ce soit : une intégration bâtie sur des URL en fin de vie
est du travail à refaire.

**Ce que les implémentations tierces laissent voir du modèle.** Deux paquets non officiels — un
[wrapper PHP](https://github.com/Pythagus/lydia) et un
[module Django publié par le pôle web de l'ENIB](https://pole-web.pages.enib.fr/website/reference/lydia.html),
soit une association d'école dans exactement notre situation — convergent sur la même forme :

| Élément    | Ce qu'on en sait                                                                                                                                                                   |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Opérations | Création d'une demande de paiement · consultation de son état (par `request_uuid`) · remboursement (par `transaction_identifier` + `amount`)                                       |
| Champs     | `vendor_token`, `order_ref`, `recipient`, `recipient_type`, `amount`, `currency`, `message`, `callback_url`, `request_id`, `request_uuid`, `mobile_url`, `state`, `transaction_id` |
| États      | `WAITING = 0`, `ACCEPTED = 1`, `REFUSED = 5`, `CANCELLED = 6`, `UNKNOWN = -1`                                                                                                      |
| Devises    | `EUR`, `GBP`                                                                                                                                                                       |

Trois choses s'en déduisent directement, et confortent le §10.2 :

- `request_uuid` est le **`provider_reference`** à stocker en unique — c'est lui qui sert à
  réinterroger l'état, donc à appliquer l'invariant n° 3 du §10.3.
- Les états existent bel et bien côté prestataire : **la colonne `status` manquante du §10.2 n'est
  pas une invention de confort**, c'est le miroir de `state`.
- ⚠️ **Une demande de paiement est adressée à une personne** : `recipient` + `recipient_type`
  (`email` ou `phone`). Ce n'est donc pas un lien anonyme que l'on affiche, mais une sollicitation
  envoyée à quelqu'un d'identifié. Pour le front public ce n'est pas un problème — l'email vient
  du SSO (§4.4). Pour un inconnu au comptoir, c'en est un : il faudrait lui demander son numéro.

**Le flux « le vendeur scanne le QR du client » n'apparaît dans aucune source publique** — toutes
les intégrations documentées vont dans l'autre sens. Mais **l'usage prouve qu'il existe** :
Scan'Eirb encaisse exactement comme ça, on y connecte le compte Lydia Pro du BAE et on scanne. Le
§10.1 tient donc ; ce n'est pas la faisabilité qui est en jeu, c'est le **mécanisme**, qu'aucune
documentation accessible ne décrit.

**Point capital : cela fonctionne aussi depuis la version web de Scan'Eirb.** Le scan n'exige donc
pas d'application native, et la page `caisse` peut viser ce flux. Seul le **paiement par CB** est
indisponible en web — limite dont il faut établir si elle vient de Lydia (auquel cas nous
l'hériterons à l'identique) ou d'un choix de Scan'Eirb.

**Scan'Eirb : le raccourci.** L'application est signée Alexandre Boin, pour le BDE
ENSEIRB-MATMECA. Il a nécessairement obtenu un accès à l'API et connaît le mécanisme de connexion
du compte marchand — les deux inconnues qui restent. Le contacter, même s'il n'est plus étudiant,
vaut mieux que des semaines d'aller-retour avec le support : une réponse de dix lignes suffirait.
Questions à lui poser, par ordre d'utilité : comment se connecte le compte Lydia Pro (jeton
marchand ? flux d'autorisation ?), quelle partie de l'API sert à encaisser depuis un QR scanné, et
pourquoi la CB ne passe pas en web.

**EirbPay** : solution interne, **non maintenue**. À garder comme source d'inspiration ou repli de
dernier recours, jamais comme dépendance — reprendre un logiciel de paiement sans mainteneur, c'est
en devenir le mainteneur.

**Sur le rétro-ingénierie de l'application Lydia Pro** : c'est le plus mauvais des plans, et pas
pour des raisons de principe. Une intégration non supportée casse à la première mise à jour du
prestataire, sans préavis et sans recours — sur le chemin qui manipule l'argent réel de
l'association, un soir de soirée. Elle sort très probablement des conditions d'utilisation, ce qui
expose le compte du BAE. Et elle prive de l'environnement d'homologation, donc de toute mise au
point sans risque. Le chemin par le support est plus court qu'il n'en a l'air.

**Repli si Lydia ne suit pas** : Lydia est distribué par des prestataires de paiement (Monext /
Payline, Worldline Sips). Ces intégrations sont matures, mais **orientées e-commerce** — paiement
par lien, remboursement, annulation — et ne couvrent pas l'encaissement au comptoir. Sips impose
en outre l'email ou le mobile du client dans la requête. C'est un repli pour le §4.3, pas pour la
caisse.

### 10.7 Ce qui mérite un test

| Défaut visé                                           | Test                                                                                                                            |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Une notification rejouée encaisse deux fois           | Deux appels du webhook, même référence → une seule `subscription`, une seule transaction `paid`                                 |
| Un QR rescanné au comptoir encaisse deux fois         | Deux appels d'encaissement avec le même code lu → un seul débit, la seconde réponse indique « déjà encaissé » et non une erreur |
| Un montant manipulé est honoré                        | Notification avec un montant inférieur à l'attendu → aucune contrepartie, transaction non `paid`                                |
| Le retour navigateur suffit à obtenir la contrepartie | Appel de l'URL de retour sans notification serveur → rien n'est créé                                                            |
| Une demande abandonnée reste `pending` pour toujours  | Après expiration, la transaction passe `expired` et libère le rapprochement                                                     |

Ne pas tester l'API de Lydia : la simuler, et tester **notre** réaction à ses réponses.

---

## 11. QR codes émis par le BAE — retrait, identité, anti-partage

Au-delà de l'encaissement Lydia (§10), le comptoir scanne **nos propres** QR : celui d'une
précommande pour acter son retrait, celui d'un fast pass ou d'un client pour le reconnaître et
tenir son historique — fondation d'une future fidélité.

### 11.1 Le mécanisme est déjà écrit, et branché nulle part

⚠️ **Ne pas concevoir ce système : il existe.** `app/services/jwt_service.ts` implémente
exactement le QR tournant décrit, et **aucun fichier du dépôt ne l'utilise** — ni contrôleur, ni
route, ni test.

```ts
export type QrTokenPayload = JWTPayload &
  (
    | { type: 'fast_pass'; userId: number; fastPassId: number }
    | { type: 'pre_order'; userId: number; preOrderId: number; eventId: number }
  );

class JwtService {
  // « Defaults to 60 seconds so the QR becomes invalid quickly if captured »
  async generateQrToken(data: Omit<QrTokenPayload, keyof JWTPayload>, ttlSeconds = 60) {}
  async verifyQrToken(token: string) {}
}
```

Sont donc déjà en place : la signature RS256 (`config/jwt.ts`, clés `JWT_PRIVATE_KEY` /
`JWT_PUBLIC_KEY` en base64, `jose` en dépendance), le TTL court de 60 secondes, et **une union
discriminée qui couvre précisément les deux usages**. C'est un travail fait, à relire avant d'en
écrire un autre.

Deux notes d'exploitation : `*.pem` est gitignoré (les clés ne sont pas dans l'historique — bien),
donc **un nouvel environnement doit être provisionné en clés** ou le serveur ne démarre pas
(`start/env.ts` les exige) ; et faire tourner les clés invalide tous les QR en circulation, ce qui
à 60 secondes de durée de vie est sans conséquence.

### 11.2 Ce que « rolling » achète, et ce que ça coûte

Le besoin est clair : un QR **statique** est une capture d'écran, donc un objet partageable. Pour
un fast pass — qui vaut identité et droits d'un client — c'est rédhibitoire. Un jeton de 60
secondes rend le partage inopérant : le temps de l'envoyer, il est mort.

Le choix d'implémentation est déjà le bon, et il vaut la peine de comprendre pourquoi :

| Approche                                                       | Verdict                                                                                                                          |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| TOTP calculé **par le client** à partir d'un secret partagé    | À écarter : le secret vit dans le navigateur, donc s'extrait, donc se partage — on a déplacé le problème                         |
| **Jeton signé, court, émis par le serveur** _(celui du dépôt)_ | Le secret ne quitte jamais le serveur ; la vérification ne demande aucune lecture en base ; l'expiration est portée par le jeton |

⚠️ **Le coût, à ne pas découvrir le soir d'une soirée : il faut du réseau côté client.** Un jeton
de 60 secondes suppose que le téléphone du client rafraîchisse son QR au comptoir — dans une salle
bondée, avec une réception médiocre, c'est le mode de panne le plus probable de tout le dispositif.
Trois réponses, à combiner :

- **Assumer un TTL plus long** (quelques minutes) : le partage redevient marginalement possible,
  la robustesse augmente beaucoup. Le paramètre existe déjà (`ttlSeconds`), la décision est à
  prendre explicitement plutôt que par défaut.
- **Prévoir un chemin dégradé au comptoir** : retrouver la précommande ou l'adhérent par son nom.
  Il sera de toute façon nécessaire (téléphone déchargé, cassé, oublié).
- Le comptoir aussi a besoin de réseau pour vérifier. Le dégradé n'est donc pas facultatif.

**Rejeu.** Un jeton reste valide pendant sa fenêtre : il peut être présenté deux fois. Ce n'est pas
au jeton de l'empêcher, c'est à l'état métier — voir §11.3. Pour un fast pass, un double scan est
sans effet ; pour un retrait, il ne doit pas livrer deux fois.

### 11.3 La base porte déjà le retrait — ne pas ajouter de booléen

**`pre_order_items.received_quantity` existe** (défaut `0`, contrainte `>= 0`), aux côtés de
`quantity`. Le retrait est donc **déjà modélisé, et au bon grain** : on peut remettre une partie
d'une précommande et laisser le reste, ce qu'un `collected: boolean` sur `pre_orders` rendrait
impossible. Le scan incrémente `received_quantity` ; « entièrement retirée » se **dérive**
(`received_quantity = quantity` sur toutes les lignes) et ne se stocke pas.

C'est aussi ce qui rend le double scan inoffensif : la seconde présentation constate qu'il ne
reste rien à remettre, et le dit — elle ne rejoue pas la remise.

Ce qui manque, en revanche :

- **Une table d'événements de scan** : qui, quoi, quand, sur quelle soirée. C'est elle qui répond à
  « la personne est venue », qui alimente l'historique client, et qui servira de base à la
  fidélité. Distincte de `received_quantity`, qui dit ce qui a été remis, pas qui s'est présenté.
- **Les endpoints d'émission et de vérification** — le service ne s'expose nulle part (§11.4).
- **Un QR d'identité client pur.** L'union actuelle ne connaît que `fast_pass` et `pre_order` ;
  reconnaître un client sans fast pass ni précommande demande un troisième membre — cohérent avec
  la table `clients` du §4.4, et à ajouter au type plutôt qu'à détourner `fast_pass`.

Sur la validité d'un fast pass au comptoir : elle vaut `subscribed_at + duration` jours et
**n'est pas stockée** (§4.1). Le scan en est le second consommateur après la page `adherents` —
raison de plus pour centraliser ce calcul côté back au lieu de le refaire dans le scanner.

### 11.4 Deux boutons, deux endpoints — et c'est délibéré

**Décision retenue : la caisse sépare explicitement les deux gestes.** Un bouton « Encaisser »
scanne le QR **Lydia du client** (§10.1) ; un bouton « Scanner » lit **nos** QR — fast pass,
précommande, et les suivants.

Ce n'est pas une commodité d'interface, c'est une garantie : laisser une seule caméra deviner ce
qu'elle vient de lire, c'est accepter qu'un jour elle **débite** quelqu'un venu simplement montrer
son adhésion. Le geste ambigu est celui qu'il faut rendre impossible, pas celui qu'il faut
détecter.

En revanche, **à l'intérieur** du bouton « Scanner », aucune raison de démultiplier : un seul
endpoint reçoit le jeton, et `QrTokenPayload` étant une union discriminée, `payload.type`
aiguille vers le bon traitement. C'est exactement l'usage prévu par le type existant.

Côté front, c'est toujours **le même composant de scan** que pour Lydia et `stocks/scanner`
(§10.1) : la caméra, les permissions et le décodage sont un problème résolu une fois. Seule
l'action qui suit change. Rappel : la caméra exige un contexte sécurisé — HTTPS, ou `localhost`.

### 11.5 Fidélité — poser les fondations, surtout pas le compteur

La demande est explicite : l'historique d'abord, les points « peut-être plus tard ». C'est le bon
ordre, et le §6 explique pourquoi mieux que n'importe quel argument : `members.points` est un
cumul muté en place, et il est aujourd'hui **faux** — annulations manquantes, plafond destructeur,
recalcul impossible.

Donc, pour la fidélité : **enregistrer les événements, dériver le solde**. Jamais un
`clients.loyalty_points` incrémenté à chaque scan. Les événements sont vrais pour toujours ; une
formule de points change deux fois par an, et si elle est la seule trace, chaque changement
réécrit le passé.

### 11.6 Ce qui mérite un test

| Défaut visé                                            | Test                                                                                      |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Un QR capturé reste utilisable                         | Jeton présenté après expiration → refusé, sans effet métier                               |
| Une précommande scannée deux fois est remise deux fois | Second scan → aucune incrémentation de `received_quantity`, réponse « déjà retirée »      |
| Un fast pass expiré passe au comptoir                  | Scan d'un jeton valide dont la souscription a dépassé `subscribed_at + duration` → refusé |
| Un jeton forgé est accepté                             | Charge utile modifiée puis re-signée avec une autre clé → refusée par `verifyQrToken`     |

---

## 12. Ordre suggéré

1. **Périodes de soirée** (§5) — d'abord, parce que le moteur n'affecte qu'un poste par membre là
   où il en faut un par moment : l'affectation est donc fausse pour toute soirée ayant de la
   préparation ou du nettoyage. Et c'est ce choix qui décide de ce que « rang obtenu » veut dire,
   donc de la refonte des points.
2. **Système de points** (§6) — corruption de données en cours : chaque lancement fausse
   davantage les scores, et le sens inversé rend l'affectation inéquitable. Plus on attend, plus
   il y a de données à rattraper. À faire dans la foulée du §5, les deux touchant le même moteur.
3. **Verrou de présence** (§7) — petit, et dans le même lot : c'est un garde côté back sur un
   endpoint existant, plus deux écrans à désactiver. À faire après le §5 (la condition dépend des
   périodes) et après le §6.2 (la désaffectation devient le geste courant du bureau, elle doit
   rendre les points avant qu'on ne l'encourage).
4. **Les deux demandes externes — à envoyer aujourd'hui**, avant toute ligne de code : ce sont les
   seuls points de la liste dont le délai ne dépend pas de nous, et beaucoup attend derrière.
   - **EirbWare**, pour les identifiants EirbConnect (§9.2), en posant dans le même message le
     claim de promotion et l'accessibilité de l'IdP hors réseau école.
   - **Lydia** (`supportpro@lydia-app.com`), pour la documentation de l'API (§10.6). Et
     **d'abord** l'auteur de Scan'Eirb, qui a déjà résolu le problème : comment se connecte le
     compte Lydia Pro, et par quel appel encaisse-t-on depuis un QR scanné. C'est le raccourci le
     plus rentable de tout ce document.
5. **SSO Keycloak** (§9) — remonté ici pour trois raisons : shield, session et CORS `credentials`
   sont **déjà câblés**, donc c'est moins cher qu'annoncé ; il conditionne toute la zone publique
   (§4.4) ; et il peut **supprimer** une partie du point suivant.
   Dans cet ordre : `config/cors.ts` (§9.8) → migration (§9.4) → service OIDC et callback (§9.3,
   §9.5) → bascule des fronts sur le cookie (§9.10) → CSRF (§9.7) en dernier, une fois le reste
   vert.
6. **Mot de passe + 2FA** (§3.3) — sécurité de l'authentification locale, qui subsiste pour le
   dashboard. À arbitrer **après** le §9 : Keycloak fait le TOTP nativement, et le périmètre à
   développer se réduit alors aux seuls comptes locaux, voire à rien.
7. **Adhérents / cotisations** (§4.1) — `fast-passes` est déjà routé, il ne manque que
   `subscriptions` : c'est la page la moins chère à livrer. Décider **avant** de la brancher où
   vit l'identité d'un client (§4.4) : cette page en est le premier consommateur.
8. ~~**Matrice rôles × permissions** (§3.1)~~ — ✅ **fait** (§0 bis). Les 13 routes members/roles/
   permissions sont gardées ; le reste de l'API demeure ouvert à tout membre authentifié.
9. ~~**Écritures Équipe** (§2.1)~~ — ✅ **fait** (§0 ter). Modifier (prénom, nom, rôle) et
   supprimer un membre sont branchés sous les deux règles de hiérarchie dérivée ; ne reste que
   « Inviter un membre », hors périmètre assumé (§3.2, aucune table `invitations`).
   ~~**Écritures Logistique** (§2.2)~~ — ✅ **fait le 2026-08-09** (§0 quater). Création et
   consommation réversible d'un bon d'achat sont branchées ; la liste de courses reste un état de
   session, et l'édition comme la suppression d'un bon ne sont pas branchées.
10. **Extraction des pages publiques** dans leur projet (§4.3), en commençant par les précommandes
    existantes — à faire **avant** d'écrire la page de paiement, sinon elle sera à déménager.
    Livrer dans la foulée la table `clients` et les deux gardes d'accès (§4.4) : sans eux, le
    projet public n'a aucun moyen de distinguer ses utilisateurs des membres. Suppose le §9 fait —
    le front public n'a pas d'autre porte d'entrée que le SSO.
11. **Refonte de `transactions`** (§10.2) — `status`, `provider_reference` unique,
    `subscriptions.transaction_id`. À faire **avant** le point suivant : la caisse comme le
    paiement en ligne écrivent dans cette table, et la migrer une fois qu'elle est pleine coûte
    bien plus cher.
12. **Commandes / caisse** (§3.4) — le plus gros morceau, débloque `caisse`, `soiree`, `paiements`
    et le fil d'activité. Y adjoindre le **composant de scan** partagé, puis ses deux boutons :
    encaissement Lydia (§10.1) et QR du BAE (§11.4). ⚠️ Le bouton d'encaissement dépend de la
    réponse de Lydia (§10.6) — construire d'abord tout ce qui n'en dépend pas, plutôt que
    d'attendre.
13. **QR émis par le BAE** (§11) — brancher `JwtService`, qui est déjà écrit : endpoint
    d'émission, endpoint de vérification, table d'événements de scan. Le retrait de précommande
    s'appuie sur `received_quantity`, qui existe déjà (§11.3). Peu coûteux, et c'est la fondation
    de la fidélité — mais **enregistrer les événements, jamais un compteur** (§11.5).
14. **Précommandes**, puis le **paiement public de la cotisation** (§4.3) par **lien Lydia**
    (§10.1). Penser à inscrire le webhook dans `csrf.exceptRoutes` (§9.7) et à l'exclure du
    logger (§10.4).
15. **Tickets** (§4.2) — à arbitrer : construire, ou brancher un outil externe.
