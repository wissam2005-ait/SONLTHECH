@echo off
rem ElectroPro - demarrage (double-cliquez sur ce fichier)
cd /d "%~dp0"
docker info >nul 2>&1
if errorlevel 1 (
  echo Docker Desktop n'est pas lance. Ouvrez Docker Desktop, attendez qu'il soit pret, puis relancez ce fichier.
  pause
  exit /b 1
)
if not exist .env (
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\creer-env.ps1
  echo.
  echo Premiere installation : le fichier .env vient d'etre cree.
  echo Verifiez l'e-mail ADMIN_EMAIL et NOTEZ le mot de passe ADMIN_PASSWORD : ce sont vos identifiants de connexion.
  echo Fermez le Bloc-notes puis relancez demarrer.bat.
  notepad .env
  pause
  exit /b 0
)
echo Demarrage d'ElectroPro (la premiere fois, cela peut prendre plusieurs minutes)...
docker compose up -d --build
if errorlevel 1 (
  echo Le demarrage a echoue. Voir les messages ci-dessus.
  pause
  exit /b 1
)
echo Attente du serveur...
timeout /t 20 /nobreak >nul
start "" http://localhost
echo ElectroPro est demarre : http://localhost
pause
