@echo off
setlocal

REM Windows version of stop-jems.sh. Run from Command Prompt or PowerShell:
REM   stop-jems.bat
REM or double-click it in Explorer.

docker info >nul 2>&1
if errorlevel 1 (
    echo [!] Docker is not running. Start Docker Desktop and run this script again.
    pause
    exit /b 1
)

echo [*] Stopping containers...

docker stop jems-agent >nul 2>&1
docker stop jems-ollama >nul 2>&1

echo.
echo [*] Removing containers...

docker rm -f jems-agent >nul 2>&1
docker rm -f jems-ollama >nul 2>&1

echo.
echo [*] Removing network...

docker network rm jems-net >nul 2>&1

echo.
echo ===============================================
echo   JEMS Agent Service Stopped
echo ===============================================
echo.
echo Removed containers: jems-agent, jems-ollama
echo Removed network:    jems-net
echo.
echo Kept (so the next start is fast):
echo   Image  jems-agent
echo   Volume jems_ollama_data (downloaded LLM model)
echo.
echo Start again with: start-jems.bat
echo ===============================================

pause
endlocal
