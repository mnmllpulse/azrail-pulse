@echo off
chcp 65001 >nul
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Azrail Agent.lnk" >nul 2>nul
echo Автозапуск выключен.
pause
