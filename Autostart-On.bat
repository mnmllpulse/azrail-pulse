@echo off
chcp 65001 >nul
set "TARGET=%~dp0Start-Azrail-Agent.bat"
powershell -NoProfile -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Startup')+'\Azrail Agent.lnk'); $s.TargetPath=$env:TARGET; $s.WorkingDirectory='%~dp0'; $s.WindowStyle=7; $s.Save()"
if errorlevel 1 (
  echo Не удалось включить автозапуск.
) else (
  echo Готово: агент будет запускаться вместе с Windows в свёрнутом окне.
)
pause
