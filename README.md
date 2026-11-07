# ElectroPro

Application de gestion pour une entreprise d'électricité en Algérie, qui remplace les tableurs Excel :
**devis quantitatifs et estimatifs, factures, chantiers, matériel, équipe (salaires, absences)**, plus un site vitrine.

- Montants en dinars (DA), **sans TVA** (entreprise non assujettie). Les anciens documents avec TVA restent affichés correctement.
- Devis et factures au format **DQE** : lots, articles à sous-lignes a/ b/ c/, total par lot, somme en lettres,
  impression PDF et **export Excel** (avec formules) pour les maîtres d'ouvrage.
- Guide pour l'utilisateur final : [GUIDE_UTILISATION.md](GUIDE_UTILISATION.md)

---

## 1. Installation (ordinateur Windows ou serveur Linux)

Seul prérequis : **Docker** ([Docker Desktop](https://www.docker.com/products/docker-desktop/) sous Windows).
Java, Node.js et PostgreSQL ne sont pas nécessaires : tout tourne dans Docker.

### Windows
1. Installer et lancer Docker Desktop.
2. Double-cliquer sur **`demarrer.bat`**.
   - Au premier lancement, le fichier `.env` est créé avec des secrets aléatoires et s'ouvre dans le Bloc-notes :
     mettez votre e-mail dans `ADMIN_EMAIL` et **notez `ADMIN_PASSWORD`** (ce sont vos identifiants). Fermez, puis relancez `demarrer.bat`.
3. Le navigateur s'ouvre sur http://localhost. La première construction prend quelques minutes.
4. Connexion : http://localhost/admin/login avec `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
5. Aller dans **Réglages → Mon compte** pour choisir votre propre mot de passe, puis **Réglages → Paramètres**
   pour saisir le nom, le RC, le NIF, le NIS, l'article d'imposition, le RIB/CCP et le logo de l'entreprise.

### Serveur Linux
```sh
./demarrer.sh          # 1er lancement : crée .env ; vérifiez-le puis relancez
./demarrer.sh          # construit et démarre (base + serveur + site)
```
Pour un accès depuis Internet, placez un reverse proxy HTTPS (Caddy, Nginx + Let's Encrypt) devant le port 80
et mettez l'adresse publique dans `SITE_URL`.

### Accès depuis les téléphones de l'équipe (même réseau Wi-Fi)
Remplacez `localhost` par l'adresse IP de l'ordinateur (ex. http://192.168.1.20). Pour un accès hors du bureau,
installez l'application sur un serveur (VPS) avec un nom de domaine en HTTPS.

## 2. Utilisation au quotidien

| Action | Windows | Linux |
|---|---|---|
| Démarrer | `demarrer.bat` | `./demarrer.sh` |
| Arrêter (données conservées) | `arreter.bat` | `docker compose stop` |
| Sauvegarder base + photos | `sauvegarder.bat` | `./sauvegarder.sh` |
| Restaurer une sauvegarde | glisser le fichier `.sql` sur `restaurer.bat` | `./restaurer.sh sauvegardes/base_….sql` |

Les sauvegardes vont dans le dossier `sauvegardes/`. **Copiez-le régulièrement sur une clé USB ou un disque externe.**
Sous Linux, planifiez une sauvegarde chaque nuit : `0 2 * * * /chemin/electropro/sauvegarder.sh` (crontab ; les 30 dernières sont gardées).

Les données sont dans des volumes Docker (`db-data`, `uploads`) : elles survivent aux arrêts, redémarrages et mises à jour.
Ne lancez jamais `docker compose down -v` (le `-v` efface les données).

## 3. Mise à jour vers une nouvelle version
1. Faire une sauvegarde (`sauvegarder.bat`).
2. Remplacer les fichiers du dossier par ceux de la nouvelle version **en gardant `.env` et `sauvegardes/`**.
3. Relancer `demarrer.bat`. Les migrations de la base (Flyway) s'appliquent automatiquement.

## 4. Fonctionnalités

| Module | Dirigeant | Employé / stagiaire |
|---|---|---|
| Tableau de bord | Facturé du mois, à encaisser, factures en retard, salaires restant à verser, chantiers en cours, absents du jour | — |
| Devis | Format DQE (lots, articles à sous-lignes, total par lot, somme en lettres, « Le soumissionnaire »), numérotation DE-AAAA-0001, accepté / refusé / expiré, impression PDF, export Excel, transformation en facture en un clic | — |
| Factures | Libres, depuis un chantier (matériel + marge) ou depuis un devis ; brouillon modifiable ; numérotation FA-AAAA-0001 sans trou ; acomptes et reste à payer ; retards ; PDF et Excel | — |
| Chantiers | Création, modification, équipe, budget, avancement en %, journal, finances | Ses chantiers, déclarer l'avancement |
| Matériel / Catalogue | Pièces, quantités, prix unitaires ; catalogue des prix pré-rempli à la saisie | Saisir le matériel (sans les prix) |
| Tâches | Créer, attribuer | Ses tâches |
| Employés / Absences / Salaires | Fiches, contrats, planning des absences (week-end vendredi-samedi), salaires dus / versés | — |
| Clients / Demandes | Fiches clients (RC, NIF), demandes reçues du site | — |
| Réalisations | Publier sur le site vitrine | Ajouter les siennes avec photos |
| Paramètres / Mon compte | Coordonnées et logo de l'entreprise ; mot de passe | Mot de passe |

## 5. Architecture (pour les développeurs)

```
navigateur ──► frontend (Nginx : React compilé + relais /api) ──► backend (Spring Boot 3, Java 17) ──► PostgreSQL 16
```
- `backend/` : API REST sécurisée par jeton JWT, migrations Flyway (`src/main/resources/db/migration`, V1 à V6).
- `frontend/` : React 18 + TypeScript + Tailwind, construit par Vite ; servi par Nginx (`nginx.conf`).
- `docker-compose.yml` : installation complète. `docker-compose.dev.yml` : base seule pour le développement.

### Développement local
```sh
docker compose -f docker-compose.dev.yml up -d     # base sur le port 5433
cd backend && mvn spring-boot:run                  # API sur http://localhost:8081 (compte : admin@electropro.local / ChangeMe-Dev-2026!)
cd frontend && npm install && npm run dev          # interface sur http://localhost:5173
```

### Variables d'environnement (fichier `.env`)
`DB_PASSWORD`, `JWT_SECRET` (32 caractères min.), `ADMIN_EMAIL`, `ADMIN_PASSWORD` (compte créé au premier démarrage
seulement), `SITE_URL`, `HTTP_PORT`.

### Personnaliser le site vitrine
Textes : `frontend/src/pages/Home.tsx`, `Services.tsx`, `components/Layout.tsx`, `index.html` (ville : « Alger »).
