#!/bin/sh
# Cree le fichier .env a partir de .env.example avec des secrets generes au hasard.
cd "$(dirname "$0")/.." || exit 1
[ -f .env ] && { echo ".env existe deja."; exit 0; }
secret() { LC_ALL=C tr -dc 'a-km-zA-HJ-NP-Z2-9' </dev/urandom | head -c "$1"; }
sed -e "s|^DB_PASSWORD=.*|DB_PASSWORD=$(secret 24)|" \
    -e "s|^JWT_SECRET=.*|JWT_SECRET=$(secret 48)|" \
    -e "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=$(secret 14)|" .env.example > .env
chmod 600 .env
echo "Fichier .env cree."
