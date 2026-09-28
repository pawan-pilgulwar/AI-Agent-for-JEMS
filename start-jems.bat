@echo off
setlocal

REM Windows version of start-jems.sh. Run from Command Prompt or PowerShell:
REM   start-jems.bat
REM or double-click it in Explorer.

cd /d "%~dp0"

docker info >nul 2>&1
if errorlevel 1 (
    echo [!] Docker is not running. Start Docker Desktop and run this script again.
    pause
    exit /b 1
)

REM Model the API container will ask Ollama for (read from .env, default llama3.2:1b)
if not exist .env (
    copy .env.example .env >nul
    echo [!] Created .env from .env.example -- set MONGODB_URI in it, then run this script again.
    pause
    exit /b 1
)
set "OLLAMA_MODEL="
for /f "tokens=1,* delims==" %%A in ('findstr /b /c:"OLLAMA_MODEL=" .env') do set "OLLAMA_MODEL=%%B"
if not defined OLLAMA_MODEL set "OLLAMA_MODEL=llama3.2:1b"
set OLLAMA_MODEL=%OLLAMA_MODEL:"=%

REM Use the GPU for Ollama only if this machine has an NVIDIA one
set "GPU_FLAG="
nvidia-smi >nul 2>&1
if not errorlevel 1 set "GPU_FLAG=--gpus all"

echo [*] Building Docker images...

docker build -t jems-agent .
if errorlevel 1 (
    echo [!] Image build failed. If it was a network timeout, just run this script again.
    pause
    exit /b 1
)
docker pull ollama/ollama:latest

echo.
echo [*] Removing old containers (if any)...

docker rm -f jems-agent >nul 2>&1
docker rm -f jems-ollama >nul 2>&1

echo.
echo [*] Creating network...

docker network create jems-net >nul 2>&1

echo.
echo [*] Starting services...

REM --network-alias ollama matches OLLAMA_BASE_URL=http://ollama:11434 in .env
docker run -d -p 11434:11434 ^
--name jems-ollama ^
--network jems-net ^
--network-alias ollama ^
-v jems_ollama_data:/root/.ollama ^
--restart unless-stopped ^
%GPU_FLAG% ^
ollama/ollama:latest

echo.
echo [*] Waiting for Ollama...

:wait_ollama
docker exec jems-ollama ollama list >nul 2>&1
if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    goto wait_ollama
)

echo [*] Pulling model %OLLAMA_MODEL% (skipped if already downloaded)...

docker exec jems-ollama ollama pull "%OLLAMA_MODEL%"

docker run -d -p 8000:8000 ^
--name jems-agent ^
--network jems-net ^
--env-file .env ^
--restart unless-stopped ^
jems-agent

echo.
echo [*] Waiting for the API...

:wait_api
curl -fsS http://localhost:8000/health >nul 2>&1
if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    goto wait_api
)

echo.
echo ===============================================
echo   JEMS Agent Service Started
echo ===============================================
echo.
echo API:
echo http://localhost:8000
echo.
echo Services:
echo 8000  -^> JEMS Agent API (docs: http://localhost:8000/docs)
echo 11434 -^> Ollama LLM (%OLLAMA_MODEL%)
echo.
echo Stop with: docker rm -f jems-agent jems-ollama
echo ===============================================

pause
endlocal
