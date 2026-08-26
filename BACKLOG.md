# BAE — état des tâches restantes

> **Dernière mise à jour : 2026-08-26.** Les blocs 0 et A ci-dessous ont été **revérifiés dans le
> code** au 2026-08-23, la tâche 27 livrée le 2026-08-24, le cycle de vie de la soirée le
> 2026-08-26. Les blocs B à I datent du 2026-08-20 et n'ont **pas** été rejoués : les traiter comme
> une piste, pas comme un état.

Ce document a un défaut connu, qui est celui qu'il reproche aux deux HANDOFF : c'est un journal, et
un lot ultérieur ferme des points sans les rayer sur place. Entre le 20 et le 21 août, **seize
commits** ont atterri sans que rien ne soit rayé ici, si bien que la moitié du bloc A y figurait
comme ouverte alors qu'elle était livrée. **Rayer au fil de l'eau, ou ne pas écrire.**

---

## ✅ Livré

### 2026-08-26 — le cycle de vie d'une soirée, de l'ouverture au bilan

Clôturer une soirée ne la clôturait pas : on revenait sur `soiree/live` avec la soirée en cours, la
caisse ouverte, et `events.status` inchangé en base. Le bilan qui suivait était vide.

Toute la mécanique réactive était pourtant en place et juste — `EventsStore.activeEvent` privilégie
une soirée `ongoing`, la caisse ouvre et ferme sa session par un `effect` qui la suit, la vue live
se vide. **Il manquait les deux écritures** qui font tourner la roue.

| #   | Cause racine                                                                                                                                                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A   | `closeNight()` ouvrait `ProductionReturnModal`, qui postait `/production-returns`, affichait « Soirée clôturée » et naviguait. **Aucun appel à `/settle`**, aucun `status`.                                                                |
| B   | `POST /events/:id/settle` consolidait les points mais **ne touchait jamais `events.status`**. Le §6.4 du HANDOFF laissait le choix « endpoint **ou** passage de `status` » ; seule la moitié « points » avait été faite.                   |
| C   | Le front n'avait **aucun moyen** d'écrire `status` — donc pas d'ouverture non plus, et la règle « `ongoing` prime » n'a jamais pu être vraie.                                                                                              |
| D   | `SoireeBilan.target` visait « la dernière `completed` **par date** ». En base c'était une soirée de **2027 sans menu ni commande** : tous les KPI à zéro. Indépendant de A–C, et il y aurait survécu.                                      |
| E   | `EventFactory` tirait `status` **au hasard** : sept soirées `ongoing` en dev, la plus ancienne captant caisse et vue live en permanence.                                                                                                   |
| F   | `event_summary_service` faisait `entry.amount += row.amount` **sans `Number()`** : une colonne numérique revient en chaîne, `0 + '8.50'` vaut `'08.50'`. « Encaissé par moyen » était une concaténation. Un test le disait déjà, en rouge. |

| Portée    | Livré                                                                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Back**  | `settle` passe `status = 'completed'` dans la même transaction que les points. Idempotent.                                                                  |
| **Back**  | `POST /events/:id/open` (`event:write`) — la seule porte vers `ongoing`, avec l'invariant **au plus une soirée ouverte** (409 `E_EVENT_ALREADY_OPEN`).      |
| **Back**  | `status` **retiré** de `eventUpdateValidator` : un PATCH générique contournait l'invariant.                                                                 |
| **Back**  | `assertEventOpen` sur `priceCart` (espèces **et** carte) et `commitProduction` — 409 `E_EVENT_CLOSED`. Pas sur les retours : ils font partie de la clôture. |
| **Back**  | `event:unsettle` remet la soirée en service, ou en `scheduled` si une autre est ouverte.                                                                    |
| **Back**  | `EventFactory` déduit `status` de la date ; le seeder étale 1 clôturée à J-7, 1 du jour ouverte, 8 à venir.                                                 |
| **Front** | `EventsStore.openEvent` / `closeEvent` patchent `status` sur place — c'est **ce patch** qui ferme la caisse et vide la vue live sans rechargement.          |
| **Front** | `soiree/live` : « Ouvrir la soirée » sur une soirée préparée, et l'état vide propose enfin celles d'hier soir restées planifiées (le passage de minuit).    |
| **Front** | `ProductionReturnModal` **est** la clôture : retours puis `/settle`. Le toast ne ment plus.                                                                 |
| **Front** | `soiree/bilan/:id` + sélecteur des soirées clôturées ; à défaut, la dernière clôturée **dont la date est passée**.                                          |

#### Suite du même jour — l'ouverture explicite n'ouvrait rien

Signalé après coup : « la page live et la caisse sont actives avec la prochaine soirée comme si elle
était ouverte ». Deux causes, indépendantes de tout ce qui précède.

- **`activeEvent` retombait sur « non clôturée, datée d'aujourd'hui ».** Cette règle avait sa raison
  d'être tant que **rien** ne pouvait ouvrir une soirée : la date en tenait lieu. Depuis
  `POST /events/:id/open`, elle rendait l'ouverture décorative — la caisse s'ouvrait d'elle-même à
  minuit, le jour de la soirée, sur une soirée que personne n'avait lancée. **`activeEvent` ne
  retient plus que `ongoing`.** Effet voulu : une soirée ouverte qui **déborde minuit** ne se ferme
  plus toute seule, `ongoing` ne regardant pas la date. Le chemin d'entrée est l'état vide de
  `soiree/live`, qui propose les soirées d'hier et d'aujourd'hui encore programmées.
- **`EventsStore.load()` ne relit jamais** : il sort dès que `loading === 'loaded'`. Les écrans de
  service en tenaient un instantané par chargement de page, si bien qu'une soirée clôturée depuis un
  autre onglet, un autre poste ou `event:unsettle` restait « en cours » à l'écran. `soiree/live`,
  `caisse`, `precommandes-admin` et `paiements` appellent désormais **`refresh()`**.

Trouvé en passant, et vieux : **`new Date(null)` vaut le 1ᵉʳ janvier 1970**, pas `Invalid Date`. Une
soirée sans date était donc la plus ancienne de toutes, et gagnait `earliest()`. Le garde-fou
`isValidDate` était écrit pour ce cas et ne voyait qu'une date parfaitement valide ; l'ancien filtre
sur le jour le masquait. `EventsService` normalise désormais `null` en `Invalid Date`.

Enfin, les deux écrans se renvoyaient l'un à l'autre : la caisse disait « ouvrez depuis la vue
live », et la vue live « une soirée doit être ouverte par le bureau ». L'état vide de `soiree/live`
dit maintenant **pourquoi** il est vide — soirée ouvrable et bouton, aucune soirée programmée
aujourd'hui, ou droit `event:write` manquant.

#### Suite (2) — le stock ne suivait pas les ventes

Signalé ensuite : « lorsqu'il n'y a plus rien à vendre il faut actualiser la page pour le voir ».

`sellable` — ce qui reste vendable, croisé côté serveur entre les lancements de production et les
ventes non annulées — n'était relu qu'**au chargement de la page**, après un lancement de
production, et par la caisse après **ses propres** encaissements. Le fil temps réel apportait bien
les commandes (les tickets tombaient en cuisine), mais personne ne rafraîchissait le stock : « il
reste 12 » ne bougeait pas et la rupture n'apparaissait qu'après un F5.

`soiree/live` et `caisse` relisent désormais `sellable` sur `order.created` et `order.cancelled` —
les deux seuls messages qui déplacent le vendable ; un changement de statut en cuisine, non. Un
paiement par carte abouti diffuse **aussi** un `order.created`, il est donc couvert sans traitement
propre.

Corrigé du même geste à la caisse, où c'était pire : deux comptoirs sur la même soirée se croyaient
chacun seul, et `canAdd` autorisait de vendre un article que l'autre venait d'épuiser.

⚠️ **`auditTime`, jamais `debounceTime`** (`STOCK_AUDIT_MS`, dans `shared/utils/stock-level`). Un
`debounce` repousse son échéance à chaque nouvelle vente : un service soutenu — une commande toutes
les 400 ms au coup de feu — ne relirait **jamais** le stock, précisément quand il bouge le plus
vite. Un test tient cette différence, et il a été vérifié qu'il tombe si l'on repasse à
`debounceTime`.

Deux pièges qui ont coûté une passe chacun, et qui valent au-delà de ce lot :

- **`messageOf(error, repli)` préfère le message du serveur.** Sur un échec de clôture après des
  retours déjà écrits, il ne restait que « cette soirée est clôturée » — l'opérateur ressaisissait
  ses comptages et créditait deux fois. Il faut **composer** les deux moitiés, pas choisir.
- **Une fenêtre glissante de 24 h n'est pas déterministe.** « Ouvrable » se calcule en **jours
  civils** (hier ou aujourd'hui) : une soirée d'hier 22 h sortait de la fenêtre à 22 h 01 le
  lendemain, donc le test passait ou non selon l'heure d'exécution.

⚠️ **Dette restante, non traitée :** `transactions.amount` est `integer` (centimes) dans la
migration depuis `c40ccbf`, mais la base de dev porte encore un `numeric(10,2)` en **euros** — la
migration a été modifiée sur place et jamais rejouée. Le bilan additionne donc des euros face à des
centimes en dev. Le code est juste ; c'est la base qui a dérivé.

### 2026-08-24 — le FastPass accessible depuis le site public

`GET /account/qr` existait depuis le lot SSO — jeton d'identité signé, TTL 180 s, résolu au
comptoir en acheteur avec la validité de son fast pass. **Rien ne l'exposait côté public** : un
adhérent n'avait aucun moyen de montrer son adhésion.

| Portée     | Livré                                                                                                                              |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Public** | Page `/ma-carte` sous `sessionGuard` : porteur, formule, échéance, QR qui se réémet seul à `ttl - 15 s` (patron de `commande.ts`). |
| **Public** | Entrée « FastPass » dans le menu de compte **et** dans le menu mobile, conditionnée à une cotisation active.                       |
| **Public** | `PurchasesStore.loadSubscriptions()` — la moitié cotisations, gardée sur `init` : une requête par session, pas par navigation.     |
| **Public** | `displayName` remonté du `PublicHeader` vers `SessionStore`, les deux le lisaient autrement.                                       |

Aucune modification back. Deux défauts trouvés par les tests avant d'exister à l'écran :

- `new Date('2027-01-12')` se lit en UTC puis s'affiche en heure locale — l'échéance reculait
  d'un jour à l'ouest de Greenwich. `parseISO` corrige.

  Traqué ensuite dans tout le public : seul **`mes-commandes.ts:subscriptionLabel`** l'avait
  vraiment (il formate `expiresAt`, servi en `YYYY-MM-DD`). `commande.ts:dateOf` ne reçoit que
  `eventDate`, un ISO **avec fuseau**, donc il était juste — passé à `parseISO` quand même, pour
  que le prochain format court ne rouvre pas le trou.

  Côté dashboard : `adherents.ts` (`formatDate`, sur `expiresAt` / `subscribedAt` /
  `registeredAt`) et `subscription-create-modal.ts` (l'échéance annoncée, calculée depuis un
  `<input type=date>`) corrigés de même.

  `stocks.store.ts` enfin, en quatre endroits sur `expirationDate` et `openedAt`
  (`@column.date()`). Trois relevaient de l'affichage ; le quatrième décidait du **statut DLC** :
  un lot dont la DLC tombe le jour même s'affichait `périmé` dès le matin, et comptait dans le
  KPI « périmés ». Quatre tests de bornes le tiennent désormais (veille, jour même, 7 j, 8 j).

  Balayage terminé : les seuls champs servis sans heure sont ceux de `subscriptions`,
  `clients`, `stock_batches` et `vouchers`. **Le chemin des bons d'achat s'en protégeait déjà**
  (`logistique.store.ts:formatIsoDate`, parsé à la main). Tout le reste parse des horodatages
  complets, que `new Date` lit correctement.

  Les deux idiomes qui coexistaient (`parseISO` d'un côté, le `formatIsoDate` à la main de la
  logistique de l'autre) sont réunis dans **`@bae/ui` : `parseApiDate` / `formatApiDate`**
  (`utils/api-date.ts`, 8 tests). Sept consommateurs dans les deux applications, plus un seul
  endroit où la règle est écrite. Effet de bord assumé : une date illisible rend désormais
  `—` côté bons d'achat, là où le regex renvoyait la chaîne brute.

- « Pas encore su » se rendait comme « pas de cotisation », et une panne réseau aussi : la page
  aurait envoyé racheter une formule déjà payée. Trois états distincts désormais.

### 2026-08-24 — le DTO de la soirée dérive du modèle (tâche 19)

`EventData` et `EventApiDto` listaient les mêmes champs à la main, et un ajout se payait en
plusieurs éditions dont rien ne signalait l'oubli : les champs sont optionnels, un mapping
incomplet compile. `EventApiDto` et `RosterRowApiDto` sont désormais **dérivés** (`Omit` +
les seuls champs dont la forme change : `id` entier, dates ISO), et `toEventData` /
`toRosterRow` ne convertissent plus que ces champs-là, le reste passe par diffusion.

Conséquence assumée : ce que l'API sert en plus (`createdAt`, `updatedAt`) entre maintenant dans
le store, où rien ne le lit et d'où rien ne repart vers l'API.

**`location` ne ment plus.** Le modèle le déclarait `string` requis alors qu'**aucune colonne
`location` n'existe côté back** : il était toujours `undefined`. `agenda.store.ts:19` le gardait
déjà, `my-presences.html` non — l'écran affichait « Lieu · » suivi de rien. Le champ reste
déclaré (c'est un manque du back), en `string | null` optionnel, et le gabarit le conditionne.

> ⚠️ **Il reste une troisième déclaration de la même soirée** : `ApiEvent`
> (`coordination-service.ts:8`), avec `id: number` et un `preOrderCloseLeadHours` que les deux
> autres n'ont pas. La fusionner touche 4 fichiers de coordination et leurs specs — écartée
> volontairement de la 19, à reprendre si le coût d'un ajout se fait sentir de ce côté.

> ⚠️ Les fixtures de spec servent un `location: 'Foyer'` que l'API n'envoie jamais. C'est ce qui
> a masqué le trou : un test qui invente son payload ne teste pas le contrat.

### 2026-08-24 — gestes de la page Adhérents (tâche 27)

Le back était prêt et **le chemin d'écriture front l'était aussi** : `ClientsStore.updateClient()`
et `ClientsStore.subscribe()` existaient, testés, branchés sur `PATCH /clients/:id` et
`POST /subscriptions`. Il ne manquait que les formulaires — la tâche était du branchement, pas un
chantier.

| Portée        | Livré                                                                                                                                                            |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dashboard** | `ClientEditModal` (téléphone, note interne) sur le bouton « Modifier ».                                                                                          |
| **Dashboard** | `SubscriptionCreateModal` : formule, date, paiement facultatif. Une seule modale pour « Renouveler » (fiche) et « Enregistrer une cotisation » (action de page). |
| **Dashboard** | `FastPassesService` — `GET /fast-passes` n'avait aucun consommateur côté dashboard. Nomme ses unités : `durationYears`, `priceEuros`.                            |
| **Dashboard** | Tri de la liste (nom, expiration, cotisation) par le menu « Trier », avec inversion du sens en rechoisissant le critère actif.                                   |

**Le périmètre réel était de 7 gestes, pas 4** : `adherents.ts` en portait trois de plus dans
`pageActions` que le gabarit. Trois restent inertes, désormais avec une infobulle qui dit
**pourquoi** et non « pas encore branché » :

- **Contacter** — aucun SMTP (tâche 100, demande externe).
- **Export CSV** — aucun endpoint d'export.
- **Import liste** — un compte naît d'EirbConnect ; ce qu'un import créerait n'est pas tranché.

**Prémisse corrigée au passage.** L'infobulle de « Modifier » promettait la promotion :
`updateClientValidator` la refuse **délibérément**, elle dérive du claim `diplome` et le prochain
login SSO l'écraserait. Le formulaire ne porte donc que téléphone et note, et le dit.

Trois pièges d'attente relevés dans les specs, tous le même : `lastValueFrom` rend la main **un
tour après** le `flush()`. Le rechargement du store, la fermeture de la modale et le remplissage de
la feuille de détail demandent chacun un tour de plus que ce qu'on croit.

### 2026-08-23 — créneaux de retrait des précommandes

`pre_orders.pickup_at` existait, circulait de bout en bout et n'était **écrit qu'à la commande,
affiché nulle part**. Trois trous comblés :

| Portée        | Livré                                                                                                                                                                                                          |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Back**      | `pickupWindowOf` / `assertPickupSlot` / `setPickupAt` (`pre_order_service.ts`), route `PATCH /pre-orders/:id/pickup` gardée par `order:write`, diffusion `broadcastPreOrder`. `PublicEventView.endsAt` exposé. |
| **Back**      | Le créneau choisi au **checkout client** passe par la même règle : `POST /pre-orders` acceptait jusque-là n'importe quelle heure ISO.                                                                          |
| **bae-ui**    | `buildPickupSlots` / `pickupWindowEnd` / `formatPickupSlot`, partagés par les deux applications — ce que le client choisit, le staff doit pouvoir le reprendre.                                                |
| **Dashboard** | La colonne « Borne retrait » de `precommandes-admin` (faux scanner + champ inerte) remplacée par l'éditeur de créneaux.                                                                                        |
| **Public**    | Sélecteur de créneau au panier ; créneau affiché sur `commande` et `mes-commandes`.                                                                                                                            |

**Défaut d'encaissement corrigé au passage.** `pre_order_items` a pour clé primaire
`(pre_order_id, product_id)` : deux lignes du même produit dans une même commande faisaient
**échouer l'insert au callback de paiement**, donc après débit — client débité, précommande
inexistante. Fusion posée dans `quotePreOrder` (le point de construction des lignes, pas
d'écriture), ce qui referme aussi le contournement du plafond par découpage en plusieurs lignes.

**Unité de `events.duration` tranchée : ce sont des secondes**, comme l'écrit `calcDuration()`. La
colonne n'avait jamais été relue, si bien que les 20 specs back la posaient en heures (`duration: 4`).
Converties.

### 2026-08-23 — pilotage clavier

Les listes maîtresses du dashboard étaient des `<div>` cliquables : inatteignables à la tabulation,
et muettes sur la ligne ouverte. Axe ne le voyait pas — il ne détecte pas un gestionnaire de clic.

- Vraies `<button>` là où rien d'interactif n'est imbriqué : `precommandes-admin`, `recettes`,
  `parametres` (choix de thème), `presences` (pastille de calendrier).
- `role="button"` + `tabindex` + Entrée/Espace là où la ligne porte déjà un contrôle :
  `coordination/events` (bouton d'action), `stocks` (case à cocher).
- `adherents` avait le patron mais ne gérait qu'Entrée ; Espace ajouté.
- Le fond de modale reste un `div` `aria-hidden` : c'est correct, Échap ferme déjà
  (`modal-container.ts:30`) et le focus est piégé.

Vérifié : plus aucun `div` cliquable inerte dans les trois projets.

### 2026-08-20 — lots 45, 7, 9, 5, puis A1

| #      | Livré                                                                                                                                                                                   |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **45** | `pre_order_items.list_price_cents` + `pre_orders.discount_percent`, prix portés par l'`intent`. Corrige le total surfacturé à l'écran client.                                           |
| **7**  | `client_activity_service.activityOf()`, tuiles Précommandes et Dépensé ; tuile « Solde courant » retirée.                                                                               |
| **9**  | Permission `payment:read`, `GET /payments`, section « Paiements en ligne » de la page `paiements`.                                                                                      |
| **5**  | Modale de clôture de production : elle lisait `input.required()` dans son **constructeur**, donc levait `NG0950` — aucune requête n'était émise. Chargement déplacé dans un `effect()`. |
| **A1** | 2 (`ExternalNavigation`), 3 (`bae-toast-container` : tout toast public était muet), 16 (code mort), 17 (rien à faire), 24, 30 (`CLAUDE.md`).                                            |

---

## Corrections d'état, vérifiées dans le code

| Fait vérifié                                                                                                                       | Conséquence                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **`gh pr list` sur `BAE-Back` renvoie `[]` (2026-08-23).** La pile des 5 PR est mergée.                                            | **Tâche 1 faite.** Ce document la donnait pour le blocage n°1.        |
| **Suite back : 634 tests, 0 échec.** La famille PDF (`print_*`, `pdf_service`, `event_receivables/pdf`) passe.                     | Les « 13 tests PDF en échec » du 2026-08-20 sont **périmés**.         |
| `POST /pre-orders` existe (`start/routes/public.ts`), garde `audience('client')`.                                                  | Le « maillon bloquant » du §36/§38/§39 est levé.                      |
| Lot Lydia : table `payments` complète, webhook, confirmation idempotente, expiration.                                              | §10 largement livré. La refonte de `transactions` est **contournée**. |
| `GET /events/:id/production-returns` existe.                                                                                       | H2 §32 « le seul blocage réel » → levé.                               |
| PrimeNG absent de `package.json` et plus référencé.                                                                                | H1 §0 septies (« `main` ne compile pas ») → **périmé**.               |
| `DB_PORT=5432` partout.                                                                                                            | H1 §8 (« 3306 est correct ») est **faux et activement trompeur**.     |
| Aucun stockage de fichiers (`@adonisjs/drive`/`flydrive`/`aws-sdk` absents).                                                       | H2 §23.1 confirmé bloqué.                                             |
| `config/mail.ts` : aucun SMTP fourni.                                                                                              | Demande externe pure.                                                 |
| `goods` : pas de colonne de méthode de stockage. `events` : pas de colonne `type`. Pas de contrainte unique `(user_id, event_id)`. | Tâches 44, 58, 46.                                                    |

---

## Bloc 0 — Répare une casse existante

| #   | Tâche                                 | État                                                         |
| --- | ------------------------------------- | ------------------------------------------------------------ |
| 1   | Merger la pile de PR back dans `main` | ✅ **Fait.** Aucune PR ouverte sur `BAE-Back` au 2026-08-23. |

---

## Bloc A — Front

29 items. **24 faits, 4 ouverts, 1 différé.** Chaque « fait » ci-dessous a été constaté dans le
code le 2026-08-23 (le 2026-08-24 pour la 27), pas déduit d'un message de commit.

### Faits

| #      | Preuve                                                                                                          |
| ------ | --------------------------------------------------------------------------------------------------------------- |
| **2**  | `ExternalNavigation` dans les deux logins, un test par zone sur le paramètre `app=`.                            |
| **3**  | `<bae-toast-container />` dans `bae-public/app.html`.                                                           |
| **4**  | `bae-btn` porte `id`, `ariaLabel`, `ariaPressed`, `ariaDescribedby` ; spec « puts the id on the inner button ». |
| **5**  | Modale de clôture réparée et couverte.                                                                          |
| **6**  | `roster-aside.ts:50-52` distingue les **trois** états, « Non répondu » compris, avec sa propre couleur.         |
| **7**  | Tuiles Précommandes et Dépensé branchées.                                                                       |
| **8**  | ⚠️ **Prémisse fausse, tâche annulée.** Voir ci-dessous.                                                         |
| **9**  | Section « Paiements en ligne » de la page `paiements`.                                                          |
| **10** | `notifications.html:92` rend le canal mail en mention.                                                          |
| **11** | `logistique.ts:163` et `events.html:236` branchés sur `PrintService.download`, deux specs.                      |
| **12** | `TeamService.getLogs(page, limit)` envoie bien les deux paramètres.                                             |
| **13** | Compteur de génération dans `logistique.store.ts:144-164`, et `shoppingListGeneration:343`.                     |
| **14** | Panneaux « Accès restreint » : `logistique.html:78,300`, `soiree/live/live.html:392`.                           |
| **15** | `88c7bfe` — le bouton de bascule reste focusable pendant l'écriture.                                            |
| **16** | `CartRow`, `SupplierTotal`, `ScannerUnknownModal` et l'appel `svc.getGoods()` supprimés.                        |
| **17** | Rien à faire : `LogistiqueAssignModal` **est** utilisée par `LogistiqueEvents`.                                 |
| **18** | Harnais axe-core (`bae-ui/src/testing.ts`), consommé par plusieurs specs.                                       |
| **19** | `EventApiDto` / `RosterRowApiDto` dérivés du modèle — voir « Livré » ci-dessus.                                 |
| **20** | `core/services/barcode/barcode-scanner-service.ts` mutualisé, consommé par `buyer-picker` et `stocks/scanner`.  |
| **23** | `parametres.ts:54-58` expose les **trois** choix, `system` compris.                                             |
| **24** | `2a8d492` — `describeMatching` n'affirme plus une cause unique.                                                 |
| **27** | Modifier, Renouveler, Enregistrer une cotisation et Trier branchés — voir « Livré » ci-dessus.                  |
| **28** | `adherents.ts:93` injecte `ClientsStore`, plus `members`.                                                       |
| **29** | `securite.html:9` conditionne le panneau à `hasPassword()`, spec `userWith(hasPassword)`.                       |
| **30** | `.claude/CLAUDE.md` à jour (arborescence, alias, sélecteurs).                                                   |

### La tâche 8 n'existe pas

> « Borne de retrait de `precommandes-admin` → composant de scan partagé »

**Prémisse fausse.** `precommandes-admin` est la **liste des précommandes d'une soirée**, pas une
borne : le retrait du client est géré par la **caisse**, qui vérifie déjà les QR. Le panneau
« Borne retrait » était un faux scanner que personne n'avait demandé — il a été remplacé le
2026-08-23 par l'éditeur de créneaux, qui est le besoin réel. Ne pas la rejouer.

Conséquence sur la **tâche 20** : la mutualisation du scan est faite (deux consommateurs), et le
troisième consommateur qu'on lui prêtait n'a jamais eu lieu d'être. L'arbitrage `@zxing/browser`
(tâche 97) reste ouvert mais n'est plus bloquant pour cet écran.

### Ouverts

| #      | Tâche                                                                                                | Note                                                                                 |
| ------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **26** | Écarts au design system                                                                              | Demande l'accès au MCP `claude_design`.                                              |
| **21** | Vérifications à l'œil : 7 écrans publics, `soiree/bilan`, Équipe, bons d'achat avec **deux** comptes | Non-code. Le comportement d'un compte **sans** la permission est ce qu'il faut voir. |
| **22** | Bout-en-bout du logout SSO à la main                                                                 | Non-code. Le protocole n'est joué en test nulle part.                                |
| **25** | Sortir `shared/components/modal/` dans `bae-ui`                                                      | **Différée volontairement** : le jour où `bae-public` aura une modale.               |

### Ordre proposé

1. **26** — sous réserve d'accès aux maquettes.
2. **21 / 22** — à intercaler, ce sont des vérifications humaines.

**Le bloc A ne contient plus de code.** Ce qui reste y est soit non-code (21, 22), soit
suspendu à un accès (26), soit différé (25). La suite est dans les blocs B et C, à commencer par
les gardes de permission manquantes (**32**, **33**) : un bon d'achat est un objet au porteur, et
n'importe quel membre peut aujourd'hui supprimer une soirée.

---

# Annexe — inventaire des tâches 31 à 130

> ⚠️ **Évalué le 2026-08-20 et non rejoué depuis.** Les blocs 0 et A ci-dessus ont bougé ;
> ceux-ci n'ont pas été revérifiés. Avant d'attaquer une ligne : relire la source citée,
> **puis le code**.

Chaque ligne porte sa source (`H1 §x` = HANDOFF.md, `H2 §x` = HANDOFF2.md).

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

### État des suites au 2026-08-24

| Suite         | Résultat                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------- |
| Back          | **634 tests, 0 échec** — relevé le 2026-08-23, non rejoué depuis (rien n'a bougé côté back) |
| bae-dashboard | **702** (2026-08-24)                                                                        |
| bae-public    | **112** (2026-08-24)                                                                        |
| bae-ui        | **101** (2026-08-24)                                                                        |
| Typecheck     | `ng build bae-dashboard` vert · Prettier vert sur tout le dépôt (2026-08-24)                |

⚠️ `node ace test` tourne sur la **base de dev**, faute de `.env.test` (tâche 63) : un changement
de branche produit des échecs qui n'en sont pas. Côté front, `pnpm` refuse de démarrer hors TTY
tant que `node_modules` est désynchronisé du lockfile — `pnpm install` d'abord, ou passer par
`./node_modules/.bin/ng`.

### Comment lire ce document

Avant d'attaquer une tâche : relire la ligne source citée, **puis le code**. La règle que le
handoff énonce lui-même vaut dans les deux sens — une section « ✅ RÉALISÉ » ne se croit pas
sur parole, et une section « ❌ bloqué » non plus (blocs H et I). **Ce document ne fait pas
exception** : ses blocs B à I datent du 2026-08-20 et n'ont pas été rejoués depuis.

Et en refermant un lot : **rayer ici**. C'est le seul entretien qui empêche ce fichier de
redevenir ce qu'il reproche aux handoffs.
