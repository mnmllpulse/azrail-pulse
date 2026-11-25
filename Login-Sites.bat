@echo off
chcp 65001 >nul
cd /d "%~dp0"
title AZRAIL: вход в сайты
where node >nul 2>nul
if errorlevel 1 (
  echo Не найден Node.js. Установи его с https://nodejs.org и запусти этот файл снова.
  pause
  exit /b 1
)
if not exist "node_modules\playwright\" call npm install
echo Откроется обычный Chrome. Войди в нужные сайты и закрой окно.
node scripts\local-agent\azrail-agent.mjs --browser-login
if errorlevel 1 pause
