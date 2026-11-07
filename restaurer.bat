@echo off
rem ElectroPro - restauration d'une sauvegarde de la base
rem Utilisation : glissez un fichier sauvegardes\base_....sql sur ce fichier
cd /d "%~dp0"
if "%~1"=="" (
  echo Glissez-deposez un fichier de sauvegarde ^(sauvegardes\base_....sql^) sur restaurer.bat.
  pause
  exit /b 1
)
echo ATTENTION : toutes les donnees actuelles vont etre remplacees par celles de :
echo %~1
set /p OK=Tapez OUI pour continuer : 
if /i not "%OK%"=="OUI" exit /b 0
docker compose stop backend
docker compose exec -T db psql -q -U electropro -d electropro < "%~1"
docker compose start backend
echo Restauration terminee.
pause
