@echo off
REM Reservation Safari - Health Check Script (Windows)

setlocal enabledelayedexpansion

set BACKEND_URL=http://localhost:3001
set FRONTEND_URL=http://localhost:3000

echo Checking Reservation Safari Health...
echo.

echo Checking backend... 
curl -sf "%BACKEND_URL%/health" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Backend OK
) else (
    echo ✗ Backend FAILED
    exit /b 1
)

echo Checking frontend...
curl -sf "%FRONTEND_URL%" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Frontend OK
) else (
    echo ✗ Frontend FAILED
    exit /b 1
)

if command -v docker >nul 2>&1 (
    echo Checking Docker containers...
    for /f "tokens=*" %%i in ('docker ps --filter "name=safari-backend" --filter "status=running" --format "{{.ID}}"') do set backend_status=%%i
    for /f "tokens=*" %%i in ('docker ps --filter "name=safari-frontend" --filter "status=running" --format "{{.ID}}"') do set frontend_status=%%i
    
    if defined backend_status if defined frontend_status (
        echo ✓ Docker containers OK
    ) else (
        echo ✗ Docker containers FAILED
        exit /b 1
    )
)

echo.
echo ✓ All health checks passed!
