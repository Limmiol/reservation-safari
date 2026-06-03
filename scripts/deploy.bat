@echo off
REM Reservation Safari - Docker Deployment Script (Windows)
REM Usage: deploy.bat [production|staging|development]

setlocal enabledelayedexpansion

set ENVIRONMENT=%1
if "%ENVIRONMENT%"=="" set ENVIRONMENT=development

set ENV_FILE=.env.%ENVIRONMENT%

echo.
echo ════════════════════════════════════════════════════════════
echo   Reservation Safari - Docker Deployment (Windows)
echo   Environment: %ENVIRONMENT%
echo ════════════════════════════════════════════════════════════
echo.

if not exist "%ENV_FILE%" (
    echo Error: Environment file '%ENV_FILE%' not found!
    echo Please create the file using: copy .env.example %ENV_FILE%
    exit /b 1
)

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Docker is not running!
    exit /b 1
)

echo ✓ Docker is running
echo.

echo Building Docker images...
docker-compose build --no-cache
if %errorlevel% neq 0 exit /b 1

echo.
echo Starting containers...
docker-compose up -d
if %errorlevel% neq 0 exit /b 1

echo.
echo Waiting for services to start...
timeout /t 5 /nobreak

echo.
echo Checking backend health...
docker-compose exec -T backend curl -f http://localhost:3001/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Backend is healthy
) else (
    echo ✗ Backend health check failed
    docker-compose logs backend
    exit /b 1
)

echo.
echo Checking frontend health...
docker-compose exec -T frontend curl -f http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Frontend is healthy
) else (
    echo ✗ Frontend health check failed
    docker-compose logs frontend
    exit /b 1
)

echo.
echo ════════════════════════════════════════════════════════════
echo ✓ Deployment successful!
echo ════════════════════════════════════════════════════════════
echo.
echo Service URLs:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:3001
echo.
echo Useful commands:
echo   View logs:     docker-compose logs -f
echo   Stop services: docker-compose down
echo   Restart:       docker-compose restart
echo   View status:   docker-compose ps
echo.
