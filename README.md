# BAE — fronts web

Dépôt Angular 21 de **BAE** (gestion d'événements et de stocks pour une association).
Backend **AdonisJS** attendu sur `http://localhost:3333`.

Stack : Angular 21, NgRx Signals, Tailwind CSS 4, Lucide Icons, date-fns 4, RxJS 7.

## Trois projets

| Projet          | Rôle                                               | Préfixe | Port dev |
| --------------- | -------------------------------------------------- | ------- | -------- |
| `bae-dashboard` | console d'administration (`dashboard.bae.eirb.fr`) | `bfd-`  | 4200     |
| `bae-public`    | espace commandes ouvert au public (`order.bae…`)   | `bfp-`  | 4201     |
| `bae-ui`        | bibliothèque partagée : primitives, HTTP, thème    | `bae-`  | —        |

`bae-ui` n'est **pas** construite : les deux applications en consomment les sources via
l'alias `@bae/ui`, dont `projects/bae-ui/src/public-api.ts` définit la surface. Ce choix
évite qu'une bibliothèque compilée sorte du périmètre de scan de Tailwind 4 et arrive sans
styles.

> Le front public ne doit embarquer ni store d'administration, ni NgRx, ni garde de
> permission. C'est le sens de la séparation, et ça se vérifie sur le paquet produit —
> voir « Vérifier la séparation » plus bas.

---

## Prérequis

- **Node.js** ≥ 22
- **pnpm** 11.23.0 — version épinglée dans `devEngines.packageManager` ;
  toute pnpm 11 la récupère seule au premier `pnpm install` (`onFail: "download"`)
- **Docker** ≥ 24 + **Docker Compose** v2 (pour le déploiement conteneurisé)

---

## Installation

```bash
pnpm install
cp projects/bae-ui/src/environment/environment.example.ts \
   projects/bae-ui/src/environment/environment.ts
```

Un seul `environment.ts`, dans la bibliothèque : les deux applications lisent l'URL d'API
via le jeton `API_BASE_URL`.

---

## Serveur de développement

```bash
pnpm start          # dashboard, http://localhost:4200
pnpm start:public   # front public, http://localhost:4201
```

Le port 4201 n'est pas arbitraire : c'est la valeur de `PUBLIC_APP_URL` vers laquelle le
back redirige après un SSO `app=public`.

---

## Scaffolding

```bash
ng generate component <nom> --project=bae-dashboard
ng generate --help
```

---

## Build de production

```bash
pnpm build                                                # dashboard
pnpm exec ng build bae-public --configuration production  # front public
```

Les artefacts sont générés dans `dist/<projet>/browser/` et prêts à être servis par n'importe quel serveur de fichiers statiques (nginx, Caddy, S3 + CloudFront, …).

---

## Tests

```bash
pnpm test         # Vitest, les trois projets à la suite
pnpm exec ng test bae-public --watch=false   # un seul projet
```

`bae-ui` n'ayant pas de cible de build propre, sa cible de test emprunte celle du
dashboard — la bibliothèque est de toute façon compilée dans le graphe des applications
qui la consomment.

---

## Vérifier la séparation

L'objectif « le front public n'embarque pas la console d'administration » ne se vérifie
par aucun test unitaire : ils passeraient tout aussi bien si `bae-public` importait un
store par mégarde. Seul le paquet produit fait foi.

```bash
pnpm exec ng build bae-public --configuration production
grep -l 'CaisseStore\|StocksStore\|@ngrx' dist/bae-public/browser/*.js   # doit ne rien trouver
```

---

## Déploiement

### Option 1 — Serveur statique

1. `pnpm build` (ou `ng build bae-public --configuration production`)
2. Copier le contenu de `dist/<projet>/browser/` sur le serveur web.
3. Configurer le serveur pour rediriger toutes les routes vers `index.html` (SPA fallback).

> Les trois origines de production doivent rester sous `bae.eirb.fr` (`api.`, `dashboard.`,
> `order.`) : c'est la condition qui rend le cookie de session partageable. Déplacer le
> front public hors de ce domaine casserait l'authentification.

Exemple nginx minimal :

```nginx
server {
  listen 80;
  root /var/www/bae-front;
  index index.html;
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

### Option 2 — Docker (recommandé)

Le dépôt fournit **deux** `Dockerfile` multi-stage (build Node puis runtime nginx) et un
`docker-compose.yml` à deux services. Ils ne diffèrent que par le projet construit : le
workflow réutilisable Eirbware n'accepte pas de `build_args`, seulement un chemin de
`file`, d'où deux fichiers plutôt qu'un `ARG`.

**Build et démarrage :**

```bash
docker compose up -d
```

Le dashboard écoute sur `http://localhost:8080/`, le front public sur `http://localhost:8081/`.

**Arrêt :**

```bash
docker compose down
```

**Build manuel sans compose :**

```bash
docker build -f Dockerfile.public -t bae-front-public:latest .
docker run -d --name bae-front-public -p 8081:80 bae-front-public:latest
```

**Personnalisation :**

- Modifier le port hôte dans `docker-compose.yml` (`"8080:80"` → `"<port>:80"`).
- Ajuster les en-têtes / le cache via `nginx.conf`.
- Si `projects/bae-ui/src/environment/environment.ts` est ignoré par git, le build Docker se rabat automatiquement sur `environment.example.ts`. Pour un déploiement réel, créer le fichier `environment.ts` avant le build ou monter une configuration runtime.

---

## Ressources

- [Angular CLI](https://angular.dev/tools/cli)
- [NgRx Signals](https://ngrx.io/guide/signals)
- [Tailwind CSS](https://tailwindcss.com/)
