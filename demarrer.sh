#!/bin/sh
# ElectroPro - demarrage sur un serveur Linux
cd "$(dirname "$0")" || exit 1
if [ ! -f .env ]; then
  sh scripts/creer-env.sh
  echo "Premiere installation : verifiez ADMIN_EMAIL et notez ADMIN_PASSWORD dans le fichier .env, puis relancez ./demarrer.sh"
  exit 0
fi
docker compose up -d --build && echo "ElectroPro est demarre."
