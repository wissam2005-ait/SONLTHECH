#!/bin/sh
# ElectroPro - restauration : ./restaurer.sh sauvegardes/base_AAAA-MM-JJ_HH-MM.sql
cd "$(dirname "$0")" || exit 1
[ -f "$1" ] || { echo "Usage : ./restaurer.sh sauvegardes/base_....sql"; exit 1; }
printf "Toutes les donnees actuelles seront remplacees. Tapez OUI pour continuer : "; read -r OK
[ "$OK" = "OUI" ] || exit 0
docker compose stop backend
docker compose exec -T db psql -q -U electropro -d electropro < "$1"
docker compose start backend
echo "Restauration terminee."
