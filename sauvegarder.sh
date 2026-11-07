#!/bin/sh
# ElectroPro - sauvegarde de la base et des photos (a planifier chaque nuit avec cron)
cd "$(dirname "$0")" || exit 1
TS=$(date +%Y-%m-%d_%H-%M)
mkdir -p sauvegardes
docker compose exec -T db pg_dump -U electropro -d electropro --clean --if-exists > "sauvegardes/base_$TS.sql" || exit 1
docker compose cp backend:/data/uploads "sauvegardes/photos_$TS" >/dev/null
# On garde les 30 dernieres sauvegardes
ls -1t sauvegardes/base_*.sql 2>/dev/null | tail -n +31 | xargs -r rm -f
echo "Sauvegarde terminee : sauvegardes/base_$TS.sql"
