# Mise en ligne gratuite — Render + Neon

L'application tourne sur **un seul service Render** (le serveur Java sert l'API *et* le site) relié à une base
**PostgreSQL Neon**. Les deux offres sont gratuites et ne demandent pas de carte bancaire.

> Les photos des réalisations sont enregistrées **dans la base** (migration V7) : elles ne sont pas perdues
> quand Render redémarre le serveur.

## 1. Base de données — Neon (5 min)

1. Créez un compte sur https://neon.tech (« Sign up with GitHub »).
2. **Create project** : nom `electropro`, version PostgreSQL 16, région **AWS Europe (Frankfurt)** (la plus proche de l'Algérie).
3. Sur la page du projet, cliquez **Connect**. Décochez **Connection pooling**, puis notez les trois valeurs :
   - l'**hôte** (ex. `ep-cool-name-123456.eu-central-1.aws.neon.tech`)
   - l'**utilisateur** (ex. `neondb_owner`)
   - le **mot de passe**

   La base s'appelle `neondb`.

## 2. Serveur + site — Render (10 min)

1. Créez un compte sur https://render.com (« GitHub »).
2. **New → Blueprint**, choisissez ce dépôt GitHub. Render lit `render.yaml` et prépare le service `electropro` (offre *Free*).
3. Remplissez les valeurs demandées :

   | Variable | Valeur |
   |---|---|
   | `DB_URL` | `jdbc:postgresql://HÔTE-NEON/neondb?sslmode=require` |
   | `DB_USER` | l'utilisateur Neon |
   | `DB_PASSWORD` | le mot de passe Neon |
   | `ADMIN_EMAIL` | l'e-mail de connexion du dirigeant |
   | `ADMIN_PASSWORD` | un mot de passe provisoire (à changer ensuite dans « Mon compte ») |

   `JWT_SECRET` est généré automatiquement.
4. **Apply**. La première construction prend 5 à 10 minutes. Le site est ensuite sur `https://electropro-xxxx.onrender.com`.

## 3. Premiers réglages (par le client)

1. `https://…onrender.com/admin/login` avec `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
2. **Réglages → Mon compte** : choisir un mot de passe définitif.
3. **Réglages → Paramètres** : nom, adresse, ville, **téléphone, e-mail**, logo… Ils apparaissent aussitôt sur le site
   (en-tête, pied de page, page Contact, bouton d'appel sur mobile) et sur les devis et factures.
4. **Réalisations** : publier quelques chantiers avec photos pour remplir la galerie du site.

## Mise en veille de l'offre gratuite

Render endort le service après 15 minutes sans visite ; la visite suivante attend environ une minute.
Pour l'éviter, créez une tâche gratuite sur https://cron-job.org qui ouvre
`https://…onrender.com/api/public/company` **toutes les 10 minutes**. (Un seul service gratuit reste ainsi
allumé en permanence : l'offre gratuite inclut 750 heures par mois.)

## Nom de domaine (optionnel)

Render → service → **Settings → Custom Domains** : ajoutez par ex. `www.electropro.dz` et créez chez votre
registraire l'enregistrement DNS indiqué. Le certificat HTTPS est fourni gratuitement.

## Sauvegardes

Neon conserve un historique de la base (restauration à un instant donné, 1 jour sur l'offre gratuite).
Pour une copie complète, depuis un ordinateur avec PostgreSQL :
`pg_dump "postgresql://UTILISATEUR:MOT_DE_PASSE@HÔTE/neondb?sslmode=require" > sauvegarde.sql`

## Contenu du site vitrine

- Coordonnées : **Réglages → Paramètres** dans l'application (aucune modification de code).
- Textes, services, étapes, questions fréquentes, horaires : `frontend/src/lib/site.ts`.
  Après modification, poussez sur GitHub : Render redéploie automatiquement.
