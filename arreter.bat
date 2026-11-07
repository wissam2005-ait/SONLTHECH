@echo off
rem ElectroPro - arret (les donnees sont conservees)
cd /d "%~dp0"
docker compose stop
echo ElectroPro est arrete. Vos donnees sont conservees.
pause
