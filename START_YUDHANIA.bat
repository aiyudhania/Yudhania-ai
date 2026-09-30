@echo off
setlocal
cd /d "%~dp0"
if "%OPENAI_API_KEY%"=="" (
  echo.
  echo YUDHANIA.AI - Setup API Key
  echo Masukkan OpenAI API key untuk sesi ini.
  set /p OPENAI_API_KEY=OPENAI_API_KEY: 
)
if "%OPENAI_API_KEY%"=="" (
  echo API key kosong. Aplikasi tidak dijalankan.
  pause
  exit /b 1
)
start "YUDHANIA.AI" cmd /c "node server.js"
timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:8787
