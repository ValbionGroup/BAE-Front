# BAE — suite du HANDOFF, à la lumière du cahier des charges

Rédigé le 2026-08-09. **Se lit après `HANDOFF.md`, pas à sa place.** Les sections y reprennent la
numérotation là où elle s'arrête (§12), pour qu'une référence croisée ne soit jamais ambiguë.

Source : le cahier des charges « BAE — ERP » (Google Sheets, onglet unique lu le 2026-08-09).
Ce document ne le recopie pas : il ne retient que **ce que le HANDOFF ne couvre pas, couvre mal, ou
couvre alors que le cahier des charges y renonce**.

**Ce fichier est versionné depuis le 2026-08-10**, comme `HANDOFF.md`.

> Tout ce qui est écrit ici comme « état actuel » a été **vérifié dans le code** le 2026-08-09
> (migrations, `start/routes/*.ts`, `package.json` du back, stores et services du front), pas
> déduit du HANDOFF. Les rares points non vérifiés sont signalés comme tels.

---

## 13. Ce que le cahier des charges apporte

### 13.1 L'échelle de priorité, et ce qu'elle réordonne

La colonne `Priorité` va de **0 à 5**, et **5 est le plus prioritaire** — lecture déduite, pas
donnée : « Liste des produits » (la page la plus avancée du dépôt, marquée « En cours ») est à 5,
« Double authentification » et « Scan des produits » (assorti de « Analyser la faisabilité ») sont à 0. ⚠️ **À faire confirmer par l'auteur du document** : tout l'ordre du §30 en dépend, et une échelle
inversée le retournerait entièrement.

Les **six exigences à 5** — le sommet de la demande, à connaître par cœur :

| Exigence                                               | Domaine      | Couvert par le HANDOFF ?                        |
| ------------------------------------------------------ | ------------ | ----------------------------------------------- |
| Liste des produits en stock                            | Stocks       | ✅ livré (« En cours » au CDC, en réalité fait) |
| Prendre en priorité les aliments proches de péremption | Stocks       | 🟡 back livré (§0 octies), écran au §32         |
| Affecter un numéro de lot pour le stockage             | Logistique   | ✅ livré (§0 octies)                            |
| Génération de la liste de courses                      | Logistique   | ✅ livré (§0 septies)                           |
| Définir la commande à l'entrée                         | Commandes    | ⚠️ §3.4, mais sans le lien au stock — §24       |
| Générer un QR à jeton variable pour le retrait         | Précommandes | ✅ §11 (`JwtService` déjà écrit, à brancher)    |

**C'est une tension avec le §12 du HANDOFF, et elle mérite d'être vue avant de reprendre le
travail.** L'ordre du §12 est piloté par les dépendances techniques et la corruption de données en
cours (périodes → points → SSO → paiement). Le cahier des charges, lui, met en tête un bloc
**stocks / recettes / logistique / caisse** qui n'apparaît qu'aux points 11 à 13 du §12. Aucun des
deux n'a tort : l'un ordonne par risque, l'autre par valeur. Le §30 propose une fusion.

### 13.2 Ce que le cahier des charges tranche — des arbitrages du HANDOFF qui se ferment

| Question laissée ouverte par le HANDOFF                        | Réponse du cahier des charges                                                                                                                    |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| §4.2 « Tickets : construire, ou brancher un outil externe ? »  | **Construire.** Trois exigences détaillées, priorités 3/2/1, avec états et notifications — voir §26                                              |
| §3.3 « 2FA : à arbitrer après Keycloak »                       | **Priorité 0**, et explicitement conditionnée : « si connexion via email/password ». Le §9 la vide presque entièrement de son objet — voir §13.3 |
| §10.6 « Repli si Lydia ne suit pas »                           | Le CDC nomme **Stripe ou un autre pré-processeur**, à chiffrer sur les coûts de fonctionnement — voir §25                                        |
| §2.2 « Liste de courses : table dédiée, ou état de session ? » | **Ni l'un ni l'autre : elle se _génère_**, à partir des recettes et du stock connu — voir §17                                                    |
| §5.2 « La disponibilité est un booléen pour toute la soirée »  | Confirmé, **mais à trois états** : non répondu / participation / abstention — voir §19                                                           |

### 13.3 Ce que le cahier des charges abandonne — à ne pas construire

Deux lignes portent explicitement l'état **« Abandonnée »**. Les inscrire ici est le seul moyen
qu'elles ne reviennent pas par la porte d'à côté :

- **« Affecter un lieu d'alternance »** (Bordeaux / hors Bordeaux, pour prioriser les disponibles).
  Motif donné : « inutile avec la mise en place des présences qui, par définition, définiront si
  quelqu'un est disponible ou non ». Conséquence : **aucune colonne de localisation sur `members`**,
  et le moteur d'affectation (§5) ne doit pas gagner de critère géographique.
- **Tout le domaine « Trésorerie »** (section entière, aucune ligne). Attention à ne pas le confondre
  avec le domaine **Paiement**, bien vivant (§10) : ce qui est abandonné, c'est la comptabilité de
  l'association, pas l'encaissement.

Et un troisième, de fait : la **double authentification** est à 0 et conditionnée aux comptes
email/mot de passe. Le §12 du HANDOFF le pressentait (« Keycloak fait le TOTP nativement, le
périmètre se réduit alors aux seuls comptes locaux, voire à rien ») ; le CDC le confirme.
**Recommandation : sortir le 2FA du périmètre tant que le SSO n'est pas livré**, et ne le rouvrir
que si des comptes locaux subsistent après coup.

---

## 14. Design system — à importer avant d'écrire la moindre UI

Toutes les sections qui suivent produisent des écrans. **Le design system de référence vit dans
Claude Design, pas dans le dépôt** : `shared/components/ui/*` en est une implémentation partielle,
pas la source. L'importer _avant_ de dessiner évite de livrer des écrans à retoucher.

Prompt de récupération, à passer tel quel :

> Use the claude_design MCP (`https://api.anthropic.com/v1/design/mcp`, auth via `/design-login`)
> to import this project:
> `https://claude.ai/design/p/019e1c0a-86ed-72eb-949d-25f2fc0a2e7d?file=index.html`
>
> Focus on these files (the whole project is readable) : `index.html`
>
> Also read these files the selection imports :
> `app.jsx`, `chrome.jsx`, `design-canvas.jsx`, `primitives.jsx`, `screen-adherents.jsx`,
> `screen-analyse.jsx`, `screen-auth.jsx`, `screen-caisse-z.jsx`, `screen-caisse.jsx`,
> `screen-components.jsx`, `screen-coordination-events.jsx`, `screen-coordination.jsx`,
> `screen-dashboard.jsx`, `screen-extras.jsx`, `screen-logistique-events.jsx`,
> `screen-logistique.jsx`, `screen-modals.jsx`, `screen-paiements.jsx`,
> `screen-precommandes-admin.jsx`, `screen-precommandes.jsx`, `screen-presences-membre.jsx`,
> `screen-presences.jsx`, `screen-recettes.jsx`, `screen-settings-extra.jsx`,
> `screen-soiree-bilan.jsx`, `screen-soiree-live.jsx`, `screen-states.jsx`,
> `screen-stocks-scanner.jsx`, `screen-stocks.jsx`, `screen-system.jsx`, `screen-team.jsx`,
> `screen-tickets.jsx`, `theme.jsx`

Deux remarques d'exploitation :

- `primitives.jsx` et `theme.jsx` sont les deux fichiers à lire en premier : ils portent
  respectivement les équivalents de `bfd-*` et les jetons de couleur. C'est là que se voient les
  écarts avec l'implémentation Angular actuelle (`bfd-btn` qui ne propage ni `id` ni `aria-*`, §8).
- La liste couvre **des écrans qui n'existent pas encore** dans le dépôt — `screen-caisse-z`,
  `screen-soiree-bilan`, `screen-stocks-scanner`, `screen-tickets`. Pour ces pages-là, la maquette
  Claude Design est la seule spécification d'interface disponible : la lire avant, pas après.

---

## 15. Emails et tâches planifiées — ✅ RÉALISÉ le 2026-08-16

> **Cette section est faite** — voir le §0 quindecies de `HANDOFF.md` et
> `BAE-Back/NOTIFICATIONS.md`. Conservée comme trace du raisonnement.
>
> Livré : les deux tables (`activity_events`, `notifications`), le helper `presenceStates` du §19,
> l'émetteur `emit`, `@adonisjs/mail` avec un transport configurable, et les trois commandes
> `notify:presence-pending`, `notify:presence-upcoming`, `notify:dispatch`.
>
> **L'avertissement d'idempotence ci-dessous était juste, et la parade n'est pas applicative :**
> deux contraintes `UNIQUE` en base, plus un `SAVEPOINT` par insertion — sur Postgres une violation
> de contrainte avorte la transaction entière, ce qui aurait fait perdre les destinataires suivants.
>
> **Non livré, et pour deux raisons distinctes :** les deux déclencheurs de tickets attendent une
> table `tickets` qui n'existe pas, et **aucun mail ne part réellement** faute de SMTP — la demande
> externe du §30.1 n'est toujours pas partie.

## 15 bis. L'analyse d'origine

⚠️ **`BAE-Back/package.json` ne contient ni `@adonisjs/mail`, ni scheduler, ni cron** (vérifié par
grep sur `package.json` et `config/`). Aucun mail n'est envoyable, aucune tâche récurrente n'est
planifiable. Ce n'est pas signalé une seule fois dans `HANDOFF.md`.

Or **cinq exigences du cahier des charges en dépendent entièrement** :

| Exigence                                         | Priorité | Déclencheur                                                  |
| ------------------------------------------------ | -------- | ------------------------------------------------------------ |
| Rappel de réponse aux présences                  | 2        | Récurrent — soirée approchante, membre sans réponse          |
| Rappel des participations avant événement        | 1        | Récurrent — soirée approchante, membre ayant répondu présent |
| Rappel de péremption (stocks)                    | 1        | Récurrent — `stock_batches` dont la DLC approche             |
| Notification de création de ticket (au pôle web) | 1        | Événementiel                                                 |
| Changement d'état d'un ticket (au créateur)      | 2        | Événementiel                                                 |

Deux besoins distincts qu'il ne faut pas confondre :

- **L'envoi** : `@adonisjs/mail` (v9 sur Adonis 7), un transport (SMTP de l'école ? prestataire ?),
  et des gabarits. À décider **avec qui fournit le SMTP** — c'est une demande externe de plus, à
  ranger avec EirbWare et Lydia (§12.4 du HANDOFF), pas une tâche de dev.
- **Le déclenchement récurrent** : trois des cinq rappels sont périodiques. Adonis n'a pas de
  scheduler intégré ; les options sont une commande `node ace` appelée par un `cron` système, ou un
  paquet dédié. **La commande `node ace` est à privilégier** : le dépôt en a déjà trois
  (`points:recompute`, `event:unsettle`, `member:role`), avec le motif `--dry-run` déjà établi, et
  elle reste testable sans horloge. L'expiration des transactions (§10.3, invariant 6) a exactement
  le même besoin — c'est un cinquième client de la même brique.

⚠️ **Piège d'idempotence, le même que pour le webhook de paiement (§10.3).** Un rappel doit être
envoyé _une fois_. Une commande relancée deux fois, ou un cron qui se chevauche, ne doit pas
spammer. Il faut une trace de l'envoi (table `notifications` du §21, ou une colonne d'horodatage sur
la cible) et une transition d'état en une seule requête — pas un `if (déjà envoyé) return` lu puis
écrit.

⚠️ **Un rappel de présence a besoin de distinguer « n'a pas répondu » de « a répondu non ».**
C'est précisément ce que le schéma actuel ne permet pas proprement — voir §19.

---

## 16. Recettes — la quatrième page en lecture seule

Le §2 du HANDOFF titre « Retirer le "lecture seule" » et liste **trois** pages. Il y en a
**quatre** : `pages/authed/recettes/` n'y figure pas, alors qu'elle est exactement dans le même cas.

**Le domaine est déjà entièrement modélisé** — et le HANDOFF ne le dit nulle part :

| Table                | Colonnes                                                           | Ce que ça couvre au CDC                                                                                                             |
| -------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `products`           | `name`, `description`, `is_vegetarian`, **`recipe` (text)**        | « Création de recettes réutilisables » (P4) et **« Définir une méthode de confection / assemblage » (P2)** — la colonne existe déjà |
| `product_goods`      | `product_id`, `good_id`, `quantity`, **`rank`**, **`instruction`** | « Sélectionner des aliments pour une recette » (P4), avec **l'ordre d'assemblage et une instruction par ingrédient**                |
| `product_furnitures` | idem, vers `furnitures`                                            | Le non-alimentaire d'une recette (barquettes, couverts) — ⚠️ à ne pas oublier dans la liste de courses (§17)                        |

**Le back écrit déjà** : `POST /products`, `PUT|PATCH /products/:id`, `DELETE /products/:id`,
plus `GET /products/summary` et `GET /products/:id/ingredients` (agrégats taillés pour la page).

**Le front, non** : `RecipesService` n'appelle que les deux `GET`, et `RecipesStore` n'expose que
`load()` et `getIngredients()`. Les boutons de la page sont inertes, exactement comme l'étaient ceux
d'Équipe avant le §0 ter.

### À faire

- Brancher la création et l'édition d'une recette (nom, végétarien, description, texte de
  confection) sur les routes existantes. **C'est le lot le moins cher du cahier des charges** : la
  table, les routes et l'écran existent, il manque le chemin d'écriture front.
- Composer les ingrédients : ajouter / retirer un `good`, sa `quantity`, son `rank`, son
  `instruction`. ⚠️ **Vérifier d'abord si une route d'écriture des ingrédients existe** — `GET
/products/:id/ingredients` est en lecture ; `PUT /products/:id` peut ou non accepter le tableau
  imbriqué. Non vérifié : à lire dans `ProductsController` avant d'estimer.
- « Estimer le prix d'une recette » (P3) est **déjà calculé en lecture** : `RecipeProduct` porte
  `cost` et `lastPrice`, `RecipeIngredient` porte `unitPrice`, et la page affiche déjà une marge.
  Reste à vérifier **quel prix fournisseur** sert de base (`good_suppliers` en porte un par
  enseigne, §2.2) : le moins cher, le dernier acheté, ou une moyenne. Ce choix doit être **unique et
  côté back**, parce que le §17 et le bilan de soirée le réutiliseront.

⚠️ **`products` porte deux rôles à la fois** et c'est un piège de nommage : c'est la _recette_ (le
CDC) **et** l'article vendu (`order_products`, `event_products`, `pre_order_items`). Modifier une
recette rétroactivement change donc ce qu'on croit avoir vendu le mois dernier. À trancher avant
d'ouvrir l'édition : versionner, ou assumer. L'analyse historique par « type de soirée » (§27) est
la première victime si on assume sans le dire.

---

## 17. Liste de courses générée — l'exigence la plus structurante du cahier des charges

> « Après affectation de la quantité de production, il faut pouvoir générer la liste de courses en
> fonction des stocks connus » — **priorité 5**.

Le §2.2 du HANDOFF pose la question à l'envers : « aucune table de liste de courses n'existe. Soit
on en crée une, soit on assume que c'est un état de session. » Le cahier des charges répond qu'il ne
s'agit **ni d'une table saisie à la main, ni d'un état de session** : c'est un **calcul**.

```
besoin(good) = Σ  event_products.quantity × product_goods.quantity
              sur les recettes au menu de la soirée
manque(good) = max(0, besoin(good) − stock_disponible(good))
```

Les trois entrées existent déjà, chacune vérifiée :

- **La quantité de production** : `event_products` (`quantity`, `price`) — table présente, **aucun
  contrôleur** (§3.4 du HANDOFF). C'est le maillon manquant, et il est aussi ce dont dépend
  `soiree/bilan`.
- **La recette** : `product_goods.quantity` — présent (§16).
- **Le stock** : `GET /stocks` agrège déjà par produit (`totalQty`) — présent et livré.

Et il faut y ajouter `product_furnitures` : une soirée consomme aussi du non-alimentaire, et
l'oublier donne une liste de courses fausse le jour où on la suit vraiment.

### Ce que ça implique, dans l'ordre

1. **`event_products` doit devenir écrivable** — c'est le préalable, et il ne figure aujourd'hui
   que comme une ligne du tableau §3.4. « Affectation de la quantité de production » est le geste
   métier ; l'écran n'existe nulle part (ni dans `logistique`, ni dans `coordination`).
2. **Le calcul vit côté back**, pas dans la page. Trois consommateurs au moins : la liste de
   courses, l'estimation du coût d'une soirée (§16) et le bilan. Le recalculer dans chaque écran,
   c'est trois vérités divergentes.
3. **La case à cocher de la page logistique reprend un sens.** Le §2.2 s'interrogeait sur son
   statut : dès lors que la liste est générée, cocher, c'est enregistrer _ce qui a été acheté_ — et
   ce qui a été acheté devient un `restock` (table et routes existantes). La boucle se ferme :
   liste générée → courses → `restocks` → `stock_batches` → stock. **C'est ce chaînage qui fait la
   valeur du produit**, et aucun de ses maillons n'est aujourd'hui relié aux deux autres.
4. **Le prix multi-enseignes** (P2, « pouvoir connaître le prix unitaire pour chaque enseigne »)
   trouve ici son usage réel : la liste de courses doit pouvoir s'afficher **par enseigne**, avec un
   total. ⚠️ Le §2.2 signale que `good_supplier_seeder` fabrique 15 fournisseurs pour 10 produits
   avec des prix aléatoires — donc un tableau ingérable. **Corriger le seeder avant de dessiner cet
   écran**, sinon on dessinera contre des données absurdes.

---

## 18. Stocks — trois exigences absentes du HANDOFF, dont deux à priorité 5

Le §0 et le domaine « Stocks » du CLAUDE.md couvrent les lots, les DLC et la mise au rebut. Trois
exigences n'y sont pas.

### 18.1 « Prendre en priorité les aliments proches de péremption » (P5) et « affecter un numéro de lot pour le stockage » (P5)

Ce sont **deux moitiés de la même fonctionnalité**, et les traiter séparément ferait écrire deux
fois le même calcul. Le CDC illustre la seconde ainsi : « le système indique de prendre le lot n°4,
5, 8 de sauce ».

Autrement dit : **du FEFO** (_first expired, first out_) rendu **actionnable au sol**. Étant donné
un besoin en quantité (celui du §17, ou celui d'une recette qu'on assemble), le système répond par
une **liste de lots à prélever**, ordonnée par DLC croissante.

État vérifié : `stock_batches` existe et `GET /stocks/:id/batches` renvoie déjà
`dlcLabel` / `dlcStatus` / `remainingQty` — **toute la matière est là**, rien à migrer. Manquent :

- ~~**Un identifiant de lot lisible par un humain.**~~ — **note fausse, corrigée le 2026-08-11.**
  La colonne existe : `stock_batches.label`, `notNullable`, présente **depuis la migration
  d'origine**, et `StockBatchesController.nextLabel(goodId)` produit déjà `L25-4` — un numéro
  séquentiel **par produit**, ce qui est exactement la décision que cette puce demandait de prendre.
  Ce qui manquait n'était pas la donnée mais son **chemin de lecture** : `BatchWithRemaining`
  (`app/services/stock_service.ts`) ne porte pas `label`, donc `GET /stocks/:id/batches` ne le
  renvoie pas, donc `StockBatchRow` côté front ne peut pas l'afficher. Le numéro existait en base et
  n'était visible nulle part. Le §0 sexies du `HANDOFF.md` porte la même erreur (« le lot créé ne
  porte ni `label` »). Traité par le lot production / FEFO — voir §32.
- **L'endpoint de prélèvement** : « je consomme N unités de ce produit » → le back décrémente les
  lots dans l'ordre FEFO et renvoie ce qui a été pris. ⚠️ **Ne pas le faire côté front** : deux
  postes qui prélèvent en même temps videraient deux fois le même lot. `stock_movements` existe déjà
  et est routé — c'est très probablement la table d'écriture, à vérifier avant d'en créer une.

### 18.2 « Signaler la méthode de stockage » (P1)

Aucune colonne. `goods` porte `name`, `unit`, `brand`, `category_id` — rien sur le mode de
conservation (frigo / congélateur / sec / cave). C'est une migration d'une colonne, mais **à décider
avant l'écran d'ajout de produit**, pas après : ajouter un champ obligatoire à une table déjà
peuplée coûte plus cher.

⚠️ Ne pas la confondre avec `stock_batches.openedAt` (« date d'ouverture du paquet », P1) — **vérifié
le 2026-08-11, rien à corriger**. `stock_batches` n'a pas de colonne `opened_at` : la valeur est
dérivée à la lecture (`stock_service.ts:55-58`) du plus ancien mouvement `'out'` du lot. Marquer un
lot comme entamé se fait donc **implicitement**, par toute consommation — ce que fait déjà chaque
lancement de production (§0 octies). Aucun bouton front n'attend d'endpoint dédié
(`stocks.html` n'affiche `openedAt` qu'en lecture seule) ; il n'y a pas de chemin d'écriture séparé
à ajouter tant que le produit ne demande pas un geste explicite « marquer entamé » indépendant de
toute consommation.

---

## 19. Présences — trois états, et un booléen qui n'en porte que deux

> « Permettre à chaque utilisateur de positionner sa présence (**non répondu, participation et
> abstention**) sur une soirée donnée » — priorité 4.

État vérifié : `member_responses.is_available` est un **booléen `NOT NULL DEFAULT false`**, sur une
clé primaire `(member_id, event_id)`. Le troisième état n'existe donc que par **l'absence de ligne**.

Ça peut suffire — mais seulement si tout le code le respecte, et c'est exactement le genre de
distinction qui se perd en chemin :

- ⚠️ **Le rappel de réponse (§15) est inutilisable sans elle.** Envoyer un mail « tu n'as pas encore
  répondu » à quelqu'un qui a répondu _non_ est le bug le plus visible possible. La requête doit
  donc être « membres **sans ligne** pour cet événement », pas « membres avec `is_available =
false` ».
- ⚠️ **`defaultTo(false)` est un piège actif.** Toute écriture qui crée la ligne sans passer
  `is_available` inscrit une abstention explicite. `EventsController.setResponse` fait un `sync()`
  avec la valeur, donc va bien — mais toute future écriture (le bureau marquant quelqu'un absent,
  §7.3) doit être relue à cette aune.
- **Le front doit afficher trois états**, pas deux boutons et un défaut. `home` et `my-presences`
  présentent aujourd'hui « Présent·e / Absent·e » ; « pas encore répondu » doit se distinguer
  visuellement — c'est aussi ce qui rend le rappel légitime aux yeux du membre.

**Recommandation : ne pas migrer le schéma.** L'absence de ligne est un troisième état parfaitement
valide et gratuit ; le risque est dans le code qui l'ignore, pas dans la table. Ce qu'il faut, c'est
**un helper unique côté back** (`presenceState(member, event): 'pending' | 'in' | 'out'`) que le
roster, les rappels et le moteur d'affectation partagent — plutôt qu'un `is_available` lu à trois
endroits avec trois conventions.

---

## 20. Coordination — deux exigences non couvertes

### 20.1 « Affectation manuelle de tâche » (P4) — le CDC ajoute une clause que le §5 n'a pas

> « Permettre au coordo de définir manuellement le poste d'un utilisateur. **Ce poste ne doit pas
> être modifié par l'exécution de l'algo.** »

Le HANDOFF (§0, §6) dit que `AssignmentsController.store` existe et qu'une affectation manuelle est
**scorée** comme l'automatique. Il dit aussi que `runMatching` « n'annule que les lignes `locked =
false` ». Le mécanisme de protection existe donc — mais **rien n'indique qu'une affectation manuelle
soit verrouillée d'office**, et le §6.3 décrit le verrouillage comme un geste séparé du front.

À vérifier puis trancher : **une affectation créée à la main doit-elle poser `locked = true`
automatiquement ?** Le cahier des charges dit oui, sans ambiguïté. Si ce n'est pas le cas
aujourd'hui, un coordinateur qui affecte manuellement puis relance l'algorithme perd son travail —
et il ne s'en apercevra qu'après.

⚠️ Interaction avec les points (§6) : si l'affectation manuelle devient verrouillée d'office, elle
est aussi **conservée entre deux lancements**, donc son `points_delta` ne doit être appliqué qu'une
fois. Le §6.3 raconte précisément ce qui arrive quand ce n'est pas le cas.

### 20.2 « Affectation de bonus/malus » (P0)

> « Permettre au coordo de définir des malus/bonus à un utilisateur. »

Aucun mécanisme. Le score d'un membre est aujourd'hui **entièrement dérivé** des deltas consolidés
(§6.4) — c'est précisément ce qui le rend recalculable, et un bonus manuel écrit dans
`members.points` détruirait cette propriété au premier `points:recompute`.

**La forme à retenir découle donc directement du §6.4 : un bonus/malus est une ligne d'ajustement,
pas une valeur.** Une table `point_adjustments` (membre, delta, motif, auteur, date), sommée avec
les deltas d'affectation. Le recalcul reste exact, l'historique est lisible par le membre, et le
motif est ce qui rend la décision défendable devant lui.

Priorité 0 : à noter, pas à faire maintenant. Mais **la décision de forme est à prendre en même
temps que le §6**, pas après — c'est le même agrégat.

---

## 21. Notifications et messagerie — le CDC décrit deux choses, pas une

> « Système de notification avec **deux parties : messages & notifications (autres)** » — priorité 2.

Le §4 du HANDOFF expédie la page `notifications` en « aucune table ». Le cahier des charges y met
**deux domaines distincts** :

- **Notifications** — événements système poussés vers l'utilisateur : DLC proche (§15), ticket mis à
  jour (§26), affectation publiée, précommande prête. Unidirectionnelles, marquables comme lues.
- **Messages** — de la messagerie entre personnes. C'est un domaine à part entière : auteur,
  destinataire(s), fil, non-lus. **Rien dans le dépôt ne s'en approche.**

⚠️ **Ne pas les fondre dans une seule table** parce que l'écran les met côte à côte. Une
notification est jetable et dérivée d'un événement métier ; un message est un contenu que quelqu'un
a écrit et qu'on ne supprime pas à la légère. Une table unique avec une colonne `kind` finira avec
la moitié de ses colonnes toujours nulles.

Trois recoupements à ne pas rater :

- Le **fil d'activité de `home`** (§8) attend « une table d'événements métier : acteur, verbe, sujet,
  horodatage ». C'est **la même table** que les notifications, vue autrement : le fil est le flux
  global, la notification est sa projection vers une personne. Les concevoir ensemble, ou l'un des
  deux sera à refaire.
- Les **rappels par mail** (§15) sont le **même événement** livré par un autre canal. La table
  d'événements est donc aussi ce qui rend les envois idempotents.
- Le **WebSocket existe déjà** (`core/services/websocket/`) et le §10.4 le réserve à la confirmation
  de paiement. Les notifications en sont le second client naturel — et le §9.10 signale que la
  connexion n'authentifie rien aujourd'hui (`initialize(user.id)` fait confiance au client). À
  corriger **avant** d'y faire passer des notifications personnelles.

---

## 22. Accueil, sidebar, modules, mobile

### 22.1 Page d'accueil (P3) — une exigence de plus que l'écran actuel

> « Afficher la/les soirées à venir, la soirée en cours **avec les recettes (assemblage)** et le
> poste affecté. Permettre de définir sa présence pour un événement à venir. »

Trois quarts sont livrés (§0, §6.5, §7.2). Le quart manquant est **« les recettes (assemblage) »** :
le membre qui prend son poste doit voir **ce qu'il faut assembler ce soir**. C'est le premier
consommateur concret de `products.recipe` et de `product_goods.rank` / `.instruction` (§16) —
autrement dit, la fonctionnalité « méthode de confection » n'est pas un champ de saisie décoratif,
elle a un écran de lecture prévu, et c'est celui-là.

Dépend donc de `event_products` (quelles recettes sont au menu de cette soirée), la même table que
le §17. Deux exigences, un seul déblocage.

### 22.2 Sidebar (P1) — « proposer différents menus adaptés en fonction du rôle »

Le §0 bis a livré **un** cas : l'entrée Équipe disparaît sans `role:read`. Le CDC demande la
généralisation. Le socle est là (`permissionGuard`, `permissions: string[]` à la racine du profil) ;
ce qui manque est une **table de correspondance entrée de menu → permission**, et surtout les
permissions elles-mêmes : le §3.1 rappelle que « le reste de l'API demeure ouvert à n'importe quel
membre authentifié ». Masquer une entrée de menu dont la route n'est pas gardée est **cosmétique** —
à faire avec le garde, jamais seul.

### 22.3 « Modules » — une décision d'architecture, pas une page

> « Définir si les fonctionnalités sont développées sous forme de module » (colonne _Contrainte_).

C'est une **question ouverte adressée à l'équipe**, pas une tâche. Elle porte sur la possibilité
d'activer/désactiver des pans du produit (tickets, précommandes, fidélité) par association ou par
déploiement. Elle a un coût réel : un module désactivable, c'est un garde à écrire sur chaque route
et chaque entrée de menu, plus un écran d'administration.

**À trancher tôt** : rétrofiter la modularité sur douze domaines existants coûte beaucoup plus que
de la poser au départ. La page `parametres/modules` existe déjà en données factices (§4) — elle est
la trace de cette intention, pas sa réalisation.

### 22.4 « Application mobile » — section vide

Le cahier des charges ouvre la section et n'y met **aucune ligne**. À faire préciser (§28). Deux
éléments du dossier existant y touchent déjà et méritent d'être posés dans la discussion : le
**scan au comptoir fonctionne en web** (§10.6, Scan'Eirb), et le **QR client à 60 secondes suppose
du réseau** dans une salle bondée (§11.2). Une PWA installable répondrait sans doute au besoin réel
sans ouvrir un troisième projet — mais c'est à l'auteur du CDC de dire ce qu'il attendait.

### 22.5 Thème (P1) — livré, avec une réserve mineure

`ThemeService` gère bien `dark | light | system`, avec `matchMedia('(prefers-color-scheme: dark)')`
et réaction au changement système. **L'exigence est satisfaite.** Une seule réserve, non vérifiée :
`toggle()` bascule entre les deux thèmes explicites et **ne revient jamais à `system`** ; seul
`set()` le permet. Vérifier que l'écran de préférences expose bien les **trois** choix, et pas
seulement le bouton de bascule — sinon le mode « système », qui est le défaut demandé, devient
irrécupérable une fois quitté.

Et le rappel du §9.10 vaut d'être répété ici : `logout$` fait `localStorage.clear()`, ce qui efface
`bae_theme`. Se déconnecter réinitialise donc la préférence de thème.

---

## 23. Logistique — justificatifs de paiement et verrouillage des bons

### 23.1 « Ajout des paiements » (P1) — personne n'a de stockage de fichiers

> « Permet aux remplisseurs du stock de **transférer la preuve de paiement** des produits. »

Un ticket de caisse photographié, donc **un fichier**. Rien dans le dépôt ne stocke de fichier :
pas de `@adonisjs/drive`, pas de bucket, aucune colonne de chemin sur `restocks`. C'est une brique
absente, du même ordre que le mailer (§15) — et elle a des conséquences qu'on découvre tard si on ne
les pose pas maintenant :

- **Où** : disque local (perdu au redéploiement d'un conteneur), ou objet distant (S3, MinIO) ?
- **Qui peut lire** : un justificatif porte le nom du payeur et le détail de ses achats. Servir ces
  fichiers derrière `middleware.auth()` seulement, c'est les ouvrir à tout membre.
- **Combien** : une photo de ticket fait quelques Mo ; sans limite de taille ni de type, c'est aussi
  un vecteur d'envoi de n'importe quoi.

`restocks` existe et est routé — c'est la ligne à laquelle rattacher le justificatif.

### 23.2 « Ajout des bons d'achats » (P0) — la contrainte compte plus que la fonction

La colonne _Contrainte_ dit : **« Verrouiller l'accès à la LOG pour éviter les vols de bons
d'achat »**. C'est la seule exigence de sécurité formulée explicitement dans tout le cahier des
charges, et elle recoupe frontalement le §3.1 du HANDOFF : les routes `/vouchers` (qui existent,
GET/POST/PUT/PATCH/DELETE) **ne sont gardées que par `auth()`**, comme presque toute l'API.

Un bon d'achat est un objet **au porteur** : sa valeur est dans sa lecture. Y donner accès à tout
membre authentifié, c'est le donner. **À ranger avec les routes à garder par permission**, et à
faire avant de brancher l'écran d'écriture du §2.2 — pas après.

---

## 24. Caisse — « suivre les stocks à l'entrée » (P2)

> « Être au courant des stocks disponibles à la zone de paiement. »

Le §3.4 crée `orders` / `order_products` pour enregistrer la vente. Le CDC demande **le sens
inverse** : que le caissier voie ce qu'il reste. Ce n'est pas la même donnée.

Deux questions à trancher, dans cet ordre :

1. **Quel stock ?** Celui du magasin (`stocks`, en unités d'ingrédients) n'est pas ce qui intéresse
   le comptoir. Ce qu'il faut, c'est **le restant d'articles vendables** :
   `event_products.quantity − Σ order_products` sur la soirée. `event_products` est encore une fois
   le maillon manquant (§17, §22.1) — **trois exigences dépendent maintenant de cette seule table**.
2. **Une vente décrémente-t-elle le stock d'ingrédients ?** Si oui, il faut relier `order_products →
products → product_goods → stock_batches` à chaque encaissement, en FEFO (§18.1). C'est cohérent,
   mais c'est un couplage lourd sur le chemin le plus chaud de l'application, un soir de soirée.
   **Recommandation : non en direct.** Décrémenter le stock d'ingrédients à la **production**
   (l'assemblage, en cuisine) et non à la vente — ce qui correspond à la réalité physique, et laisse
   la caisse ne toucher qu'à un compteur d'articles.

⚠️ Le rafraîchissement doit être **poussé**, pas interrogé en boucle : deux postes de caisse sur la
même soirée voient sinon deux stocks différents. Le WebSocket existe (§21).

---

## 25. Paiement — le cahier des charges ouvre une porte que le §10 ne considère pas

Sur « Faire l'encaissement en ligne via l'app » (P3), le commentaire dit :

> « Possibilité de passer par **Stripe ou autre pré-processeur de paiement** : regarder les coûts de
> fonctionnement et prendre quelque chose de raisonnable. »

Le §10 du HANDOFF traite Lydia comme acquis et ne mentionne Stripe nulle part (ses replis sont
Monext/Payline et Worldline Sips). Or le §10.6 documente longuement que **la documentation de l'API
Lydia n'est pas publique**, qu'elle s'obtient sur demande, et que le flux « le vendeur scanne le QR
du client » n'est décrit par aucune source accessible.

**Ces deux constats se combinent en une recommandation nette : découpler les deux flux.**

| Flux                                   | Prestataire                      | Pourquoi                                                                                                                                          |
| -------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **En ligne** (cotisation, précommande) | Stripe **ou** Lydia — à chiffrer | Le paiement par lien est un problème résolu, documenté publiquement, avec un environnement de test ouvert **le jour même**. Rien n'y impose Lydia |
| **Au comptoir** (QR client)            | Lydia, sans alternative          | C'est l'usage établi du BAE et de Scan'Eirb. Aucun pré-processeur e-commerce ne fait ça (§10.6)                                                   |

L'intérêt n'est pas d'abandonner Lydia : c'est de **ne pas laisser le délai d'accès à son API
bloquer le flux en ligne**, qui est le seul chemin vers la zone publique (§4.3). La contrainte
posée par le CDC — « attention à ce que les montants soient envoyés par le site et non via le panel
d'administration » — est déjà couverte par l'invariant n° 4 du §10.3.

⚠️ **Le chiffrage demandé est réel, pas rhétorique.** Stripe prend une commission par transaction ;
Lydia est souvent gratuit entre particuliers et facturé côté pro. Sur des cotisations à quelques
euros, l'écart en pourcentage est ce qui décide. **C'est un calcul à faire, pas une préférence
technique** — et il demande le volume annuel prévisionnel, qu'il faut aller chercher auprès du
bureau.

---

## 26. Tickets — l'arbitrage est clos, on construit

Le §4.2 du HANDOFF hésitait : « à arbitrer — c'est le domaine le plus éloigné du métier BAE, et sans
doute le plus facile à remplacer par un outil externe ». **Le cahier des charges tranche** : trois
exigences, priorités 3, 2 et 1, avec le modèle de données dans l'énoncé.

- **Création** (P3) : un ticket porte un **sujet** parmi `bug | amélioration | nouveauté` et un
  **état** parmi `nouveau | en cours | clos`. Ouvert à **tout utilisateur**, sur « un service de
  l'application » — donc un champ de rattachement au domaine concerné.
- **Notification de création** (P1) : mail **à tous les membres du pôle web**, avec titre et corps.
  ⚠️ « Le pôle web » n'existe pas comme rôle : le catalogue RBAC porte `President`,
  `Administrateur`, `Tresorier`, `Coordinateur`, `Secretaire`, `Pole Log`, `Pole BBQ`, `Membre`
  (§0 bis). **Il manque un destinataire** — soit un rôle `Pole Web`, soit une permission
  `ticket:manage` dont les porteurs sont les destinataires. La seconde est meilleure : elle évite
  d'ajouter un rôle pour une liste de diffusion.
- **Changement d'état** (P2) : mail au **créateur**, avec l'état et la résolution.

Les deux tiers de ce lot sont donc des mails — **il dépend entièrement du §15**. Construire les
tables sans le mailer livre un helpdesk muet, ce qui est pire qu'un helpdesk absent : personne ne
verra les tickets.

Reste, comme le disait le §4.2, que la maquette existe (`screen-tickets.jsx`, §14) et que les tables
sont simples : `tickets` (auteur, sujet, titre, corps, service, état, priorité) et
`ticket_messages`. C'est un lot court une fois le mailer en place.

---

## 27. Analyse & historique — « type de soirée » n'existe pas en base

> « Garder l'historique précis des soirées pour chaque **"type de soirée"** » (P1) ·
> « Prédire le nombre de commandes via l'historique + précommandes » (P2).

État vérifié : la table `events` porte `id`, `name`, `description`, `date`, `status`
(`scheduled | ongoing | completed`) et `duration`. **Aucune colonne de type.** Les guillemets du
cahier des charges autour de « type de soirée » suggèrent d'ailleurs que la notion elle-même n'est
pas stabilisée côté métier.

Deux choses à faire, dans l'ordre :

1. **Faire définir ce qu'est un type de soirée** (§28) : BBQ / crêpes / gala ? récurrence
   hebdomadaire ? taille attendue ? Une table `event_types` et une colonne, ou un simple libellé
   contraint — mais la question est métier, pas technique.
2. Sans elle, la prédiction n'a **aucune base de comparaison** : `AnalyseStore` expose déjà un
   champ `prediction`, et la seule façon honnête de le calculer est « les N dernières soirées **du
   même type** ». Comparer un barbecue à un gala donne un nombre, pas une prévision.

⚠️ Rappel du §16 : si les recettes sont modifiables en place et que `products` sert à la fois de
recette et d'article vendu, **l'historique se réécrit tout seul**. C'est exactement cette exigence-ci
qui en pâtit. Le trancher avant d'ouvrir l'édition des recettes, pas quand l'historique sera faux.

---

## 28. Ce que le cahier des charges laisse ouvert — questions à poser

À poser en une fois, comme les demandes EirbWare et Lydia (§12.4) : ce sont des délais humains.

| Question                                                                                                                                                                  | Pourquoi elle bloque                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **L'échelle de priorité : 5 est-il le plus urgent ?**                                                                                                                     | Tout l'ordre du §30 en dépend (§13.1)                                                                                                     |
| **Les sections vides** — « Infrastructure », « Paramétrages », « Fonctionnalités optionnelles », « Application mobile », et les cinq « Fonctionnalités obligatoires > X » | Cinq sections ouvertes et non remplies : soit le document est inachevé, soit ces domaines sont hors périmètre. Ce n'est pas la même chose |
| **« Application mobile » : PWA, ou application native ?**                                                                                                                 | Décide si le scan au comptoir (§10.1) suffit en web — Scan'Eirb prouve que oui (§10.6)                                                    |
| **« Modules » : les fonctionnalités sont-elles activables/désactivables ?**                                                                                               | Rétrofiter coûte beaucoup plus cher que poser (§22.3)                                                                                     |
| **Qu'est-ce qu'un « type de soirée » ?**                                                                                                                                  | Sans réponse, ni historique ni prédiction (§27)                                                                                           |
| **Qui fournit le SMTP ?**                                                                                                                                                 | Cinq exigences derrière (§15)                                                                                                             |
| **Quel volume annuel de paiements en ligne ?**                                                                                                                            | Le chiffrage Stripe vs Lydia demandé par le CDC est indécidable sans lui (§25)                                                            |
| **Le « pôle web » : rôle RBAC, ou permission ?**                                                                                                                          | Destinataire des notifications de tickets (§26)                                                                                           |
| **Quel prix fournisseur fait référence** (moins cher, dernier acheté, moyen) ?                                                                                            | Coût de recette, liste de courses et bilan doivent tous les trois donner le même nombre (§16, §17)                                        |

---

## 29. Correspondance complète — cahier des charges ↔ dépôt

Le tableau qui évite de relire les deux documents. `✅` = livré et vérifié · `🟡` = partiel ou
back-only · `❌` = rien.

| Exigence (CDC)                                  | P     | État | Où                                                                    |
| ----------------------------------------------- | ----- | ---- | --------------------------------------------------------------------- |
| Connexion email / mot de passe                  | 4     | ✅   | Conservée telle quelle par le §9                                      |
| Connexion via ENT Bordeaux INP                  | 2     | ❌   | §9 — Keycloak EirbConnect, chantier décrit, non commencé              |
| Lieu d'alternance                               | —     | 🚫   | **Abandonnée** (§13.3)                                                |
| Double authentification                         | 0     | ❌   | §3.3 — à sortir du périmètre (§13.3)                                  |
| Mode sombre / clair / système                   | 1     | ✅   | `ThemeService`, réserve mineure §22.5                                 |
| Notifications (messages + autres)               | 2     | ❌   | §21 — deux domaines, aucune table                                     |
| Page d'accueil                                  | 3     | 🟡   | Présences et poste livrés ; **recettes/assemblage manquant** (§22.1)  |
| Sidebar par rôle                                | 1     | 🟡   | Un seul cas livré (§0 bis) ; à généraliser (§22.2)                    |
| Vue publique précommandes                       | 1     | ❌   | §4.3 — projet Angular séparé, suppose le SSO                          |
| Application mobile                              | —     | ❓   | Section vide (§28)                                                    |
| Modules                                         | —     | ❓   | Décision d'architecture (§22.3)                                       |
| Choix des présences (3 états)                   | 4     | 🟡   | Deux états à l'écran, le troisième par absence de ligne (§19)         |
| Rappel de réponse aux présences                 | 2     | ❌   | §15 — aucun mailer                                                    |
| Rappel des participations                       | 1     | ❌   | §15                                                                   |
| Date de péremption / suivi par lots             | 3     | ✅   | Livré                                                                 |
| Date d'ouverture du paquet                      | 1     | 🟡   | `openedAt` en lecture ; écriture à vérifier (§18.2)                   |
| Liste des produits                              | 5     | ✅   | Livré                                                                 |
| Rappel de péremption                            | 1     | ❌   | §15 + §21                                                             |
| **Priorité aux aliments proches de péremption** | **5** | 🟡   | §18.1 — calcul et endpoint livrés (§0 octies) ; écran au §32          |
| Signaler les périmés pour les jeter             | 3     | ✅   | `discardBatch`                                                        |
| Signaler la méthode de stockage                 | 1     | ❌   | §18.2 — colonne absente                                               |
| Stocks sous forme de lots                       | 4     | ✅   | Livré                                                                 |
| Algorithme de répartition                       | 2     | ✅   | §5, par périodes                                                      |
| Définition des préférences                      | 2     | ✅   | `parametres/preferences` + `GET/PUT /account/preferences`             |
| Bonus / malus par le coordo                     | 0     | ❌   | §20.2 — table d'ajustements                                           |
| **Affectation manuelle non écrasée par l'algo** | **4** | 🟡   | Mécanisme `locked` présent ; verrouillage d'office à vérifier (§20.1) |
| Scan des produits                               | 0     | ❌   | §10.1 — composant de scan partagé                                     |
| **Ajout des paiements (preuve)**                | 1     | ❌   | §23.1 — **aucun stockage de fichiers**                                |
| Ajout des bons d'achats                         | 0     | 🟡   | Routes présentes, front non branché, **routes non gardées** (§23.2)   |
| Multiple enseigne                               | 2     | 🟡   | `good_suppliers` présent ; seeder à revoir (§2.2, §17)                |
| **Génération de la liste de courses**           | **5** | ❌   | §17 — le chaînon central                                              |
| **Numéro de lot pour le stockage**              | **5** | ✅   | §0 octies — visible sur la page Stocks, ordre FEFO                    |
| Encaissement sur place (QR Lydia)               | 4     | ❌   | §10 — bloqué sur l'accès à l'API                                      |
| Encaissement en ligne                           | 3     | ❌   | §10 + §25 — Stripe à chiffrer                                         |
| **Définir la commande à l'entrée**              | **5** | ❌   | §3.4 — `orders` sans contrôleur                                       |
| Suivre les stocks à l'entrée                    | 2     | ❌   | §24 — dépend d'`event_products`                                       |
| « Prouver » son adhésion                        | 2     | 🟡   | §11 — `JwtService` écrit, non branché                                 |
| Liste des soirées avec menus                    | 2     | ❌   | Dépend d'`event_products` (§17)                                       |
| Commander un ou des articles                    | 3     | ❌   | §3.4 — `pre_orders` sans contrôleur                                   |
| **QR à jeton variable pour le retrait**         | **5** | 🟡   | §11.1 — `JwtService` **déjà écrit**, aucun appelant                   |
| Retirer un article à la fois                    | 3     | ✅   | `pre_order_items.received_quantity` (§11.3)                           |
| Création de ticket                              | 3     | ❌   | §26 — arbitrage clos, on construit                                    |
| Notification de création (mail)                 | 1     | ❌   | §26 + §15                                                             |
| Changement d'état (mail)                        | 2     | ❌   | §26 + §15                                                             |
| Création de recettes réutilisables              | 4     | 🟡   | §16 — back écrit, **front en lecture seule**                          |
| Sélectionner les aliments d'une recette         | 4     | 🟡   | §16 — `product_goods` présent                                         |
| Méthode de confection / assemblage              | 2     | 🟡   | §16 — `products.recipe` + `product_goods.instruction` existent        |
| Estimer le prix d'une recette                   | 3     | 🟡   | §16 — calculé en lecture, base de prix à fixer                        |
| Trésorerie                                      | —     | 🚫   | **Abandonné** (§13.3)                                                 |
| Historique par type de soirée                   | 1     | ❌   | §27 — **pas de colonne de type**                                      |
| Prédiction de commandes                         | 2     | ❌   | §27 — dépend du type de soirée                                        |

---

## 30. Ordre — amendement du §12

Le §12 du `HANDOFF.md` reste valable **pour ce qu'il ordonne**. Ce qui suit s'y insère.

### 30.1 Inchangé et prioritaire

Les points **1 à 3** du §12 (périodes ✅, points ✅, verrou de présence ✅) sont livrés. Le point
**4 — les demandes externes — reste le plus urgent du dossier**, et le cahier des charges lui en
ajoute deux :

> **À envoyer aujourd'hui, avant toute ligne de code :**
>
> 1. **EirbWare** — identifiants EirbConnect (§9.2)
> 2. **L'auteur de Scan'Eirb**, puis le support Lydia (§10.6)
> 3. **🆕 Le SMTP** — qui le fournit, et sous quelles limites d'envoi (§15)
> 4. **🆕 Les questions ouvertes du §28** — en un seul message à l'auteur du cahier des charges

### 30.2 Un lot nouveau, et il est en tête

**Lot « chaîne alimentaire » — recettes → production → liste de courses → stock.** Il n'existe dans
aucun des deux documents pris isolément : le HANDOFF a les morceaux dispersés (§2.2, §3.4, §4), le
CDC a l'intention (quatre des six exigences à priorité 5). C'est **la plus grosse création de valeur
du dossier**, et son coût est faible parce que presque tout est déjà en base.

Dans cet ordre, chaque étape débloquant la suivante :

1. **`event_products` écrivable** (§17) — la table existe, il manque le contrôleur. Débloque à elle
   seule le menu d'une soirée, la liste de courses, le stock au comptoir (§24), l'assemblage sur
   l'accueil (§22.1) et le bilan de soirée.
2. **Écritures recettes** (§16) — back déjà routé, front à brancher. Le lot le moins cher du
   cahier des charges.
3. **Génération de la liste de courses** (§17) — le calcul, côté back. Corriger
   `good_supplier_seeder` d'abord.
4. **FEFO et numéro de lot** (§18.1) — même moteur de calcul, autre sortie.

### 30.3 Le reste, inséré

- **§15 (mailer + tâches planifiées)** — juste après le lot ci-dessus. Cinq exigences derrière, plus
  l'expiration des transactions (§10.3). Rien de gros ; simplement absent.
- **§9 (SSO)** — reste au point 5 du §12. Le CDC le donne à 2, mais il conditionne toute la zone
  publique, ce qui prime.
- **§26 (tickets)** — descend du point 15 au milieu du peloton (le CDC le tranche), mais **après**
  le §15 : sans mail, un helpdesk est muet.
- **§23.2 (garder les routes `/vouchers`)** — à faire avec, ou avant, les écritures Logistique
  (point 9 du §12). C'est la seule exigence de sécurité formulée par le CDC.
- **§19 (trois états de présence)** — petit, à faire avec le §15, dont il est le préalable.
- **§20.1 (verrouillage de l'affectation manuelle)** — à vérifier tout de suite : si le
  comportement est faux, un coordinateur perd son travail sans le voir. Coût probable : une ligne.
- **§3.3 (2FA)** — **sortir du périmètre** (§13.3).
- **§20.2 (bonus/malus)**, **§22.3 (modules)**, **§22.4 (mobile)** — non planifiés, mais leur
  **forme** est à décider maintenant, parce qu'elle contraint du code qu'on écrit entre-temps.

### 30.4 Une dépendance à retenir plutôt que le reste

**`event_products` est le maillon dont dépendent le plus de choses**, et il n'a aujourd'hui aucun
contrôleur. Cinq exigences le traversent : la liste de courses (P5), la commande à l'entrée (P5), le
stock au comptoir (P2), le menu des précommandes (P2) et l'assemblage sur l'accueil (P3). Une table
qui existe déjà, une centaine de lignes de contrôleur — c'est le meilleur rapport
déblocage/effort de tout le dossier.

---

## 31. Génération de PDF — ✅ RÉALISÉ le 2026-08-12

> **Cette section est faite** — voir le §0 duodecies de `HANDOFF.md`. Conservée comme trace du
> raisonnement, pas comme travail restant. Ne la réimplémentez pas.
>
> **La décision ouverte plus bas a été tranchée : côté serveur, avec Puppeteer.** Sept documents
> sont livrés, pas trois — la liste de courses, la fiche recette, le plan de production, la feuille
> de clôture, l'inventaire par lots, les étiquettes de lot et la feuille d'affectation.
>
> Deux contraintes découvertes à l'implémentation, absentes de l'analyse ci-dessous :
> `CaseConverterMiddleware` corrompait les flux binaires en les traitant comme du JSON, et l'image
> Docker doit installer un Chromium natif (celui que télécharge Puppeteer ne tourne pas sur Alpine).

Ajouté le 2026-08-10. Trois boutons de l'interface promettent un document téléchargeable et **aucun
n'a de quoi le produire** : rien dans le dépôt front ni dans `BAE-Back/package.json` ne génère de
PDF, et aucune route ne renvoie un fichier.

| Bouton               | Où                                             | État                         |
| -------------------- | ---------------------------------------------- | ---------------------------- |
| **Fiche logistique** | topbar de `/logistique/:id` (liste de courses) | désactivé, `title` explicite |
| **Fiche logistique** | pied de chaque carte de soirée, `/logistique`  | inerte — aucun gestionnaire  |
| « Exporter PDF »     | prévu par `screen-logistique.jsx`              | jamais implémenté            |

Les deux « Fiche logistique » doivent produire **le même document** : c'est le sens du geste — la
feuille qu'on imprime et qu'on emmène faire les courses. Le second est aujourd'hui cliquable et sans
effet ; à aligner sur le premier (désactivé avec un titre) tant que la brique n'existe pas, parce
qu'un bouton qui ne réagit pas au clic est plus déroutant qu'un bouton grisé qui explique pourquoi.

### Ce que le document doit contenir

Tout est déjà calculé et servi par `GET /v1/events/:id/shopping-list` (§17, livré au §0 septies du
`HANDOFF.md`) : le nom de la soirée, les lignes à acheter avec `needQty` / `stockQty` / `missingQty`,
les deux sections **denrées** et **non-alimentaire**, les prix par enseigne, les totaux par enseigne
avec leur drapeau de couverture, l'optimum et l'économie multi-enseigne. **Aucun calcul nouveau n'est
nécessaire** — c'est une mise en page, pas une fonctionnalité métier.

### La décision à prendre : où le PDF est produit

- **Côté client** (`jspdf`, `pdf-lib`, ou l'impression du navigateur via une feuille de style
  `@media print`). Aucune dépendance back, rien à déployer, et la mise en page réutilise les
  composants existants. Mais le rendu dépend du navigateur, et rien n'est archivé côté serveur.
  ⚠️ Une feuille `@media print` sur la page existante est de loin le chemin le moins cher, et
  couvre le besoin réel : imprimer la liste.
- **Côté serveur** (Puppeteer, `@react-pdf`, une bibliothèque native). Rendu identique pour tout le
  monde, document archivable, et adressable par URL — mais c'est un binaire Chromium à embarquer
  dans l'image de déploiement pour Puppeteer, ce qui n'est pas neutre.

⚠️ **Trancher en même temps que le §23.1** (« Ajout des paiements », la preuve d'achat photographiée) :
les deux ont besoin de **servir un fichier**, et donc de la même réponse à la question « où vivent
les fichiers et qui peut les lire ». Ce dépôt n'a aujourd'hui ni `@adonisjs/drive`, ni bucket, ni
colonne de chemin — les résoudre séparément coûterait deux fois.

Priorité : le cahier des charges ne demande **pas** de PDF explicitement. C'est un confort issu de la
maquette, à ranger après les exigences qu'il chiffre — mais avant de laisser trois boutons mentir sur
ce qu'ils font.

---

## 32. `soiree/live` doit devenir réelle — ✅ RÉALISÉ le 2026-08-16

> **Cette section est faite** — voir les §0 nonies (production, clôture) et §0 terdecies (file
> cuisine, kitchen display) de `HANDOFF.md`. Conservée comme trace du raisonnement.
>
> Le « vrai manque » identifié plus bas — _aucun endpoint ne dit ce qui a été prélevé, par denrée_ —
> a été comblé par le lot `orders` : `OrdersController` écrit les lignes, et la file cuisine est
> diffusée en **SSE via `@adonisjs/transmit`**, et non par le websocket qu'anticipait le §4 du
> `HANDOFF.md`. Les deux autres pages qui attendaient ce déblocage sont `soiree/bilan` et
> `precommandes-admin` : elles l'ont désormais, et ne sont plus bloquées que par leur câblage front.

Ajouté le 2026-08-11, pendant le lot **production / FEFO** (§18.1). Spec :
`docs/superpowers/specs/2026-08-11-production-fefo-design.md`.

**Décision prise :** les deux gestes de production — **lancer** une production et **déclarer les
restes** en fin de soirée — vivent tous les deux sur `soiree/live`, pas sur `/logistique/:id`. Le
back de ce lot est écrit pour eux ; **aucun écran ne les appelle encore**.

### Pourquoi les deux au même endroit

Produire et déclarer les restes sont **la même main sur le même stock**, à deux heures d'écart. Les
séparer entre une page de préparation et une page de service obligerait l'opérateur à apprendre deux
endroits pour un seul cycle. L'option « lancement sur `/logistique/:id` » a été envisagée puis
écartée pour cette raison.

Et `events.status` porte **déjà** le cycle complet (`scheduled | ongoing | completed`), donc la page
se conçoit comme **un écran à trois états**, pas comme trois écrans :

| `status`    | Ce que la page montre                                                      |
| ----------- | -------------------------------------------------------------------------- |
| `scheduled` | à préparer — on **lance la production** depuis le menu de la soirée        |
| `ongoing`   | le service                                                                 |
| `completed` | à clôturer — on **déclare les restes** : réserve (mouvement `in`) ou rebut |

### La page est factice — mais ce n'est **pas** un préalable bloquant

`pages/authed/soiree/live/` n'a rien de réel : tickets, KPIs, transactions, alertes, et jusqu'au nom
« Soirée Hivernale » écrit en dur dans le gabarit. **La page ne sait pas quelle soirée elle affiche**
— aucun paramètre de route (`/soiree/live` est un chemin fixe), aucun store injecté, et
`closeNight()` se contente d'un `router.navigate(['/soiree/bilan'])`.

> ⚠️ **Correction du 2026-08-11**, à la question « le front est-il faisable maintenant ? ». La
> première rédaction de ce §32 présentait « rendre `soiree/live` réelle » comme **un lot à part
> entière et un préalable**. C'était surestimé, et la vérification dans le code le montre :
>
> - **`EventDetail.status` est déjà dans le modèle front**, et son propre commentaire dit
>   « `GET /events` le renvoie déjà ». `EventsStore` porte `load()`, `getEventById()` et le
>   chargement du menu avec son `menuStatus`. Donner une identité à la page, c'est **quelques
>   lignes**, pas un lot.
> - Le panneau de production n'oblige **pas** à toucher aux ~400 lignes factices (tickets, KPIs,
>   alertes, transactions). Elles peuvent rester fausses pendant qu'un panneau réel existe à côté —
>   à condition de ne pas laisser croire l'inverse à l'écran.
>
> Le piège du §1 de `HANDOFF.md` (« des modales factices derrière des boutons d'apparence normale »)
> reste à éviter, mais il se traite en **désactivant ou en marquant** ce qui est faux, pas en
> refaisant toute la page avant de commencer.

### ⚠️ Le vrai manque : aucun endpoint ne dit ce qui a été prélevé, par denrée

C'est **le seul blocage réel**, et il est côté back. La modale de clôture doit demander « tu as sorti
24 saucisses, combien reviennent ? » — or rien ne le lui dit :

- `GET /events/:id/production-runs` répond **par recette** (`plannedQty`, `producedQty`, `runs[]`),
  jamais par denrée.
- `POST /events/:id/production-returns` **calcule** le retournable en interne (`Σ out − Σ in` par
  lot, agrégé sur la soirée) mais ne l'expose nulle part. Il ne le mentionne que dans le message du
  400 `E_RETURN_EXCEEDS_PICKED` — et on ne construit pas un formulaire à partir d'un message
  d'erreur.

**Ce qu'il manque, précisément :** un `GET /events/:id/production-returns` rendant, par denrée,
`goodId`, `goodName`, `unit`, `takenQty`, `returnedQty`, `returnableQty`. Tout le calcul existe déjà
dans `commitReturns` (`app/services/production_service.ts`) — il s'agit d'en extraire la partie
lecture, gardée par `stock:read`. Quelques dizaines de lignes, aucun changement de modèle.

### Ce qui est faisable **maintenant**, et dans quel ordre

Tout ce qui suit ne dépend d'aucun travail préalable — les endpoints existent depuis le §0 octies de
`HANDOFF.md`.

1. **Donner une identité à la page.** Soit une route `/soiree/:id/live`, soit la dérivation depuis
   `EventsStore` de la soirée dont le `status` n'est pas `completed` — c'est la promesse que la page
   affiche déjà en haut à gauche (« LIVE · Soirée en cours »). S'il n'y en a aucune, **le dire**,
   plutôt que d'afficher une soirée inventée. `EventDetail.status` et `EventsStore.load()` existent.
2. **Le panneau de production**, entièrement faisable : le menu de la soirée
   (`EventsStore`, réel depuis le §0 septies), le « 120 / 200 produits »
   (`GET /events/:id/production-runs`), et le lancement en deux temps —
   `POST /events/:id/production-runs` avec `dryRun` pour afficher le plan FEFO **avant** le geste,
   puis le même appel sans le drapeau pour confirmer.
3. **Marquer ce qui reste faux.** Les tickets, KPIs, alertes et transactions en dur peuvent
   subsister à côté d'un panneau réel, mais l'écran doit le dire — un bandeau, ou des boutons
   désactivés avec un `title`, comme la convention déjà en place sur « Preuve d'achat » et
   « Fiche logistique ».

### Ce qui attend le petit endpoint manquant

4. **La modale de clôture** (« ce qui reste : réserve ou rebut »). L'écriture existe
   (`POST /events/:id/production-returns`), mais pas la lecture qui alimente le formulaire — voir
   l'encadré ci-dessus. **À faire côté back d'abord**, sinon la modale devra inventer sa liste de
   denrées.

### Deux règles à ne pas perdre en route, quel que soit l'ordre

5. **Se souvenir que le rebut n'écrit rien** : la sortie a eu lieu au lancement, jeter c'est ne pas
   recréditer. Les deux boutons de la modale se distinguent par leur effet sur le stock, pas par une
   trace. Le gaspillage n'est donc pas **chiffré**, mais il n'est pas perdu : `Σ out − Σ in` sur les
   mouvements d'un lancement donne ce qui n'est pas revenu, et
   `production_runs.quantity − Σ order_products` donnera le produit non vendu — le vrai chiffre —
   **le jour où `orders` aura un contrôleur** (§3.4). Seul reste indistinguable le rebut qui n'est
   pas un écart : un paquet tombé, une denrée jetée avant l'assemblage.
6. **Dire à l'écran que le non-alimentaire n'est pas prélevé.** Produire 200 hot-dogs décrémente les
   saucisses et les pains, **pas** les barquettes : `furnitures` porte un compteur plat, sans lots ni
   grand livre de mouvements (§8.2 du spec).

### Deux autres pages attendent le même déblocage

`soiree/bilan` est dans le même état, et le §22.1 (« la soirée en cours **avec les recettes
(assemblage)** » sur l'accueil) consomme les mêmes données. Le lot qui rend `soiree/live` réelle
devrait les regarder ensemble plutôt que de refaire trois fois la dérivation « quelle soirée est en
cours ».

---

## 33. Ordre au 2026-08-16 — amendement du §30, qui amendait le §12

Écrit après le merge `orders` × `adhérents` (§0 quaterdecies de `HANDOFF.md`). **Les §12 et §30
restent valables pour ce qu'ils expliquent ; c'est leur liste qui a bougé.** Trois lots majeurs ont
été livrés depuis le §30 sans que celui-ci soit mis à jour : les documents imprimés, les commandes
et les adhérents.

### 33.1 Ce qui est clos depuis le §30

| Point du §30                       | État                                                                    |
| ---------------------------------- | ----------------------------------------------------------------------- |
| §30.2 — lot « chaîne alimentaire » | ✅ intégralement livré (§0 septies, octies, nonies)                     |
| §31 — génération de PDF            | ✅ livré, 7 documents (§0 duodecies)                                    |
| §32 — `soiree/live` réelle         | ✅ livré (§0 nonies + §0 terdecies)                                     |
| §3.4 — les 4 domaines sans route   | ✅ tous routés (§0 terdecies pour les deux derniers)                    |
| §20.1 — affectation verrouillée    | ✅ livré (§0 decies)                                                    |
| §26 — tickets : l'arbitrage        | toujours ouvert, mais **après le §15** — un helpdesk sans mail est muet |

### 33.2 L'ordre en vigueur

1. ~~**Réparer le merge `orders` × `adhérents`**~~ — ✅ fait (§0 quaterdecies), back à 371 tests.
2. **Merger la PR back #27.** Elle est ouverte, et le front `main` appelle déjà `/clients` : tant
   qu'elle ne l'est pas, la page `adhérents` est en 404 contre le back déployé. **C'est la seule
   tâche du dossier qui répare une casse existante.**
3. **Les quatre demandes externes du §30.1** — inchangées, et toujours non parties. EirbWare,
   Scan'Eirb puis Lydia, le SMTP, les questions du §28. Seul lot dont le délai ne dépend pas de nous.
4. ~~**§15 — mailer et tâches planifiées.**~~ — ✅ **fait le 2026-08-16** (§0 quindecies).
   Restent derrière : le §26 (tickets), le rappel de péremption des stocks, l'expiration des
   transactions (§10.3) et le câblage du fil d'activité de `home`. ⚠️ **Aucun mail ne part encore** :
   il manque le SMTP, soit le point 3 ci-dessus.
5. ~~**§9 — SSO Keycloak.**~~ — ✅ **fait le 2026-08-16** (§0 sexdecies). Flux BFF complet avec
   PKCE, résolution en trois temps et gardes d'audience, vérifié contre un Keycloak réel.
   `@adonisjs/ally` reste **inutilisé** : il n'implémente pas PKCE (§9.3), c'est `openid-client`
   qui porte le flux. ~~Restent le CSRF (§9.7), le CORS (§9.8), la bascule du front sur le
   cookie (§9.10)~~ — ✅ **faits le 2026-08-16** (§0 octodecies). Reste le **front public**
   lui-même (§4.3) et le logout global SSO.
6. ~~**Les cinq pages factices restantes**~~ — ✅ **fait le 2026-08-16** (§0 septdecies). Les cinq
   sont branchées, et le §26 (tickets) est tranché : le domaine a été construit, pas externalisé.

### 33.3 Ce que le §30 disait et qu'il faut cesser de croire

- ⚠️ **« `event_products` est le maillon dont dépendent le plus de choses »** (§30.4) — c'était
  vrai, ça ne l'est plus : le contrôleur existe depuis le §0 septies. Le maillon d'aujourd'hui est
  le **mailer** (§15), dont dépendent les notifications, les tickets, le §19 et l'expiration des
  transactions.
- ⚠️ **`soiree/live` attend `orders`** — non, elle l'a. Et la diffusion se fait en **SSE
  (`@adonisjs/transmit`)**, pas par le websocket que le §4 du `HANDOFF.md` annonçait.
- ⚠️ **Lydia** — `paymentMethod` accepte `'lydia'` depuis le §0 terdecies, mais **rien n'encaisse**.
  C'est un libellé enregistré. Tout le §10 reste ouvert.

---

## 34. Séparation des pages publiques — ✅ livré le 2026-08-17

**Ferme la partie « structure » du §4.3 de `HANDOFF.md` et le point 10 du §12.** Branche
`feat/split-public-front` côté front, `feat/public-front-prereqs` côté back.
Front **139 fichiers de test / 673 tests**, back **455 tests**, typecheck et format verts.

### 34.1 Ce qui a été fait

Le §4.3 disait « projet Angular séparé » sans trancher entre un dépôt distinct et une seconde
application. **Mono-dépôt retenu**, en trois projets :

| Projet          | Rôle                                           | Préfixe |
| --------------- | ---------------------------------------------- | ------- |
| `bae-dashboard` | l'ancien `src/`, inchangé fonctionnellement    | `bfd-`  |
| `bae-public`    | espace commandes, port 4201                    | `bfp-`  |
| `bae-ui`        | primitives, 6 intercepteurs, thème, jetons CSS | `bae-`  |

Le facteur décisif contre deux dépôts : le design system n'est pas stable (§14), donc la taxe
« publier une lib puis bumper deux dépôts » se paierait à chaque retouche. En mono-dépôt, le CI
se retravaille **une fois**.

⚠️ **`bae-ui` n'est pas construite.** Les deux applications en consomment les **sources** via
l'alias `@bae/ui` → `projects/bae-ui/src/public-api.ts`. Raison : Tailwind 4 ne génère un
utilitaire que s'il **voit** le source qui le mentionne. Une lib compilée par `ng-packagr` et lue
depuis `node_modules/` sortirait du périmètre de scan, et les `bae-*` arriveraient **sans style**.
Chaque `styles.css` porte donc un `@source '../../bae-ui/src'`.

### 34.2 Ce qui reste dans le dashboard, et pourquoi

`shared/components/modal/` **n'a pas été mutualisé** : `modal-container.ts` importe `RolesModal`
en dur et `modal.models.ts` dépend de `JobPeriod`. Les sortir demande de faire porter le composant
par `ModalConfig`. Le front public n'a aucune modale : à faire le jour où il en aura une.
Restent aussi `presence-lock.ts` (lié au store des affectations), `buyer-picker`, `my-qr-card`.

### 34.3 Trois pièges rencontrés, qui resserviront

- ⚠️ **Une suite de tests peut rétrécir en silence.** Après l'extraction, `pnpm test` affichait
  « 103 passed » en vert — au lieu de 139. Le champ `include` du builder `@angular/build:unit-test`
  est **relatif à la racine du projet**, et les specs de la bibliothèque étaient tombés hors
  périmètre : ils n'échouaient pas, ils n'existaient plus. **Toujours comparer le nombre**, jamais
  la seule couleur. Corrigé par une cible `test` propre à `bae-ui` — qui doit emprunter le
  `buildTarget` du dashboard, le builder exigeant une cible de build qu'une bibliothèque n'a pas.
- ⚠️ **`import packageInfo from 'package.json'` inline tout le fichier**, dépendances comprises,
  dans le paquet livré. Un front public n'a pas à publier cet inventaire. Utiliser l'import
  **nommé** (`import { version } from …`), qui se tree-shake. `bae-logo` reçoit désormais la
  version par `input()` au lieu de la lire.
- ⚠️ **Le build Docker était déjà cassé sur `main`**, indépendamment de ce lot : le `Dockerfile`
  préparait `pnpm@10.33.3` alors que `package.json` exige `>=11.0.0 <12.0.0`, et corepack refuse
  une **plage** dans `devEngines`. Il manquait par ailleurs `pnpm-workspace.yaml` dans le `COPY`,
  sans lequel pnpm 11 refuse les scripts de build. Les deux sont corrigés.

### 34.4 Correctif de production : le cookie était host-only

`session_cookie.ts` posait `bae_token` **sans attribut `domain`** — donc _host-only_, il ne repart
que vers l'hôte exact qui l'a posé. Invisible en développement, où tout tient sur `localhost` (le
port n'entre pas dans l'identité d'un cookie). En production, avec `api.` / `dashboard.` /
`order.bae.eirb.fr`, **aucun des deux fronts n'aurait renvoyé le cookie** : session muette, sans
la moindre erreur. Ajout de `COOKIE_DOMAIN` (optionnel, vide en local, `.bae.eirb.fr` en prod).

### 34.5 ⚠️ Le §4.4 se trompait : `/account/profile` ne casse pas

Le §4.4 de `HANDOFF.md` annonçait que `GET /v1/account/profile` **casserait** pour un client sans
ligne `members`, et recommandait un endpoint client distinct. **C'est faux, mesuré** : le corps de
`MemberTransformer` utilise `?.` partout et `transform(null)` propage `null`. Le §4.4 décrivait un
état du code antérieur au déplacement de `first_name`/`last_name` vers `users` (§0 undecies).

Le chemin était simplement **non testé** — les trois cas de `profile_permissions.spec.ts` partent
tous de `MemberFactory`. `tests/functional/profile_client.spec.ts` le couvre désormais.

**Conséquence : l'endpoint client distinct n'est pas nécessaire.** Le front public lit
`/account/profile` tel quel, avec `member: null` traité explicitement par son `SessionStore`.

### 34.6 Vérifié, pas supposé

- Boucle SSO publique complète contre le Keycloak local : `redirect?app=public` → PKCE S256 →
  formulaire → callback → **retour sur `:4201`** → cookie `bae_token` → `/account/profile` **200**
  avec `member: null`, et **ligne `clients` créée en JIT** (vérifiée en base).
- Paquet de production de `bae-public` inspecté : **ni `@ngrx`, ni `CaisseStore`, `StocksStore`,
  `CoordinationStore`, `EventsStore`, `OrdersStore`, `permissionGuard`, `AppShell`, `ModalService`**.
  **424 Ko contre 1,4 Mo** pour le dashboard. C'est la seule preuve qui vaille : aucun test
  unitaire ne verrait un store importé par mégarde.
- Image Docker `Dockerfile.public` construite et son contenu inspecté ; les deux pages rendues
  au navigateur, styles de la bibliothèque compris.

### 34.7 Ce que ce lot **n'a pas** fait

La page précommandes **reste une maquette statique**, et c'est assumé. Le back n'expose
**aucune route client** : `middleware.audience('client')` n'est utilisé nulle part, il n'existe ni
`POST /pre-orders` côté client, ni catalogue lisible sans permission staff. C'est le chantier
suivant, et il est côté back.

---

## 35. L'API ne joignait pas l'IdP en conteneur — ✅ corrigé le 2026-08-17

Trouvé juste après le §34 : le SSO fonctionnait avec `node ace serve` **sur l'hôte**, et échouait
dès que l'API tournait dans `bae-api-dev`. Back **460 tests**.

### 35.1 Le piège, qui n'est pas une erreur de configuration

**Une URL d'IdP sert deux consommateurs qui ne l'atteignent pas de la même façon.** Les métadonnées
OIDC portent `authorization_endpoint`, suivi par le **navigateur**, et `token_endpoint` /
`userinfo_endpoint`, appelés par le **serveur**. `openid-client` lit les deux dans le même jeu de
métadonnées, issu d'une seule `discovery()`.

Tant que les deux passent par la même adresse publique, la distinction ne se voit pas. Mesuré
depuis le réseau de l'API :

| Depuis `bae-back_bae-dev-network`       | Résultat                                                    |
| --------------------------------------- | ----------------------------------------------------------- |
| `localhost:8080` ← ce que `.env` disait | **échec** — dans un conteneur, `localhost` est le conteneur |
| `keycloak:8080`                         | **échec** — Keycloak est sur le réseau `keycloak_keycloak`  |
| `host.docker.internal:8080`             | 200                                                         |

⚠️ **Le réflexe — pointer `KEYCLOAK_ISSUER` sur l'adresse que le serveur sait joindre — déplace la
panne au lieu de la corriger.** La découverte repart, la redirection aussi, et c'est le
**navigateur** qui échoue sur un nom d'hôte interne qu'il ne résout pas : plus tard, et déguisé en
problème d'IdP.

⚠️ **Second piège, en amont :** sans attribut de realm `frontendUrl`, Keycloak dérive `issuer` et
**tous** ses endpoints de l'en-tête `Host` de l'appelant. Vérifié : le même realm annonce
`issuer: http://localhost:8080/...` vu de l'hôte et `http://host.docker.internal:8080/...` vu d'un
conteneur. C'est aussi **le mode d'échec classique de Keycloak derrière un proxy** — donc un risque
de production, pas seulement de développement.

### 35.2 La forme retenue

Séparer les deux adresses, ce que Keycloak appelle le _backchannel_ :

- `KEYCLOAK_ISSUER` — adresse **publique**. Celle du navigateur, et celle que le claim `iss` porte.
- `KEYCLOAK_INTERNAL_URL` — **optionnelle**, chemin serveur → IdP quand il diffère. Vide, tout se
  comporte comme avant.

`app/services/oidc_backchannel.ts` réécrit l'**origine** (jamais le chemin) des seules requêtes
sortantes du serveur ; `oidc_service.ts` la branche via `client.customFetch`, **aux deux
emplacements** — l'option de `discovery()` ne couvre que la requête de métadonnées, pas l'échange
du code ni `/userinfo`. `setup-dev-keycloak.sh` pose `frontendUrl` sur le realm, idempotent.
`docker-compose.dev.yml` transmettait par ailleurs **zéro variable `KEYCLOAK_*`** : l'app ne
démarrait que grâce au bind mount qui lui donnait le `.env`.

### 35.3 Vérifié par test de contrôle

API **en conteneur**, avec la base migrée :

| Configuration                | `redirect?app=public`                                                  |
| ---------------------------- | ---------------------------------------------------------------------- |
| sans `KEYCLOAK_INTERNAL_URL` | **HTTP 500**, erreur réseau dans les journaux                          |
| avec                         | **HTTP 302** vers `http://localhost:8080/...` — l'adresse **publique** |

Puis boucle complète depuis le conteneur : formulaire → callback → cookie → `/account/profile`
**200**. L'échange du code passe donc aussi, ce qui prouve que le `customFetch` posé sur la
`Configuration` sert bien au-delà de la découverte.

### 35.4 En production

EirbConnect est une URL publique joignable depuis le serveur : `KEYCLOAK_INTERNAL_URL` restera
**vide**, et le code se comporte comme avant. Ce qui compte pour la production est ailleurs — c'est
le §35.1 second point : **si EirbConnect est derrière un proxy qui n'honore pas `X-Forwarded-*`**,
ses métadonnées annonceront des hôtes internes et le flux cassera exactement de la même façon. Le
symptôme à reconnaître : une redirection vers un nom d'hôte que le navigateur ne résout pas, ou un
`iss` qui ne correspond pas à l'issuer configuré.
