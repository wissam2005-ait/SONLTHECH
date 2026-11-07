@echo off
rem ElectroPro - sauvegarde de la base et des photos dans le dossier "sauvegardes"
cd /d "%~dp0"
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm"') do set TS=%%i
if not exist sauvegardes mkdir sauvegardes
docker compose exec -T db pg_dump -U electropro -d electropro --clean --if-exists > "sauvegardes\base_%TS%.sql"
if errorlevel 1 (
  echo La sauvegarde de la base a echoue : ElectroPro est-il demarre ?
  pause
  exit /b 1
)
docker compose cp backend:/data/uploads "sauvegardes\photos_%TS%" >nul
echo Sauvegarde terminee : sauvegardes\base_%TS%.sql et sauvegardes\photos_%TS%
echo Copiez le dossier "sauvegardes" sur une cle USB ou un disque externe.
pause
