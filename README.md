# BAEFront

Frontend Angular 21 de **BAE** (gestion d'événements et de stocks pour une association). Backend Express attendu sur `http://localhost:3000`.

Stack : Angular 21, NgRx Signals, Tailwind CSS 4, Lucide Icons, date-fns 4, RxJS 7.

---

## Prérequis

- **Node.js** ≥ 22
- **pnpm** 10.33.3 (activable via `corepack enable`)
- **Docker** ≥ 24 + **Docker Compose** v2 (pour le déploiement conteneurisé)

---

## Installation

```bash
corepack enable
pnpm install
cp src/environment/environment.example.ts src/environment/environment.ts
```

Adapter `src/environment/environment.ts` à votre backend (par défaut `http://localhost:8080`).

---

## Serveur de développement

```bash
pnpm start
```

L'application est servie sur `http://localhost:4200/` avec rechargement automatique. Le `proxy.conf.json` redirige les routes API vers `http://localhost:3000`.

---

## Scaffolding

```bash
ng generate component component-name
ng generate --help
```

---

## Build de production

```bash
pnpm build
```

Les artefacts sont générés dans `dist/BAE-Front/browser/` et prêts à être servis par n'importe quel serveur de fichiers statiques (nginx, Caddy, S3 + CloudFront, …).

---

## Tests

```bash
pnpm test         # Vitest (unit)
```

---

## Déploiement

### Option 1 — Serveur statique

1. `pnpm build`
2. Copier le contenu de `dist/BAE-Front/browser/` sur le serveur web.
3. Configurer le serveur pour rediriger toutes les routes vers `index.html` (SPA fallback).

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

Le projet fournit un `Dockerfile` multi-stage (build Node puis runtime nginx) et un `docker-compose.yml`.

**Build et démarrage :**

```bash
docker compose up -d --build
```

L'application est alors disponible sur `http://localhost:8080/`.

**Arrêt :**

```bash
docker compose down
```

**Build manuel sans compose :**

```bash
docker build -t bae-front:latest .
docker run -d --name bae-front -p 8080:80 bae-front:latest
```

**Personnalisation :**

- Modifier le port hôte dans `docker-compose.yml` (`"8080:80"` → `"<port>:80"`).
- Ajuster les en-têtes / le cache via `nginx.conf`.
- Si `src/environment/environment.ts` est ignoré par git, le build Docker se rabat automatiquement sur `environment.example.ts`. Pour un déploiement réel, créer le fichier `environment.ts` avant le build ou monter une configuration runtime.

---

## Ressources

- [Angular CLI](https://angular.dev/tools/cli)
- [NgRx Signals](https://ngrx.io/guide/signals)
- [Tailwind CSS](https://tailwindcss.com/)
