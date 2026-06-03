@echo off
REM Reservation Safari - Deployment Verification Script (Windows)

setlocal enabledelayedexpansion

echo.
echo ════════════════════════════════════════════════════════════
echo   Reservation Safari - Deployment Verification
echo ════════════════════════════════════════════════════════════
echo.

set MISSING=0

echo Checking Docker configuration...
for %%f in (Dockerfile.frontend Dockerfile.backend docker-compose.yml .dockerignore) do (
    if exist "%%f" (
        echo   ✓ %%f
    ) else (
        echo   ✗ MISSING: %%f
        set /a MISSING=!MISSING!+1
    )
)

echo.
echo Checking environment templates...
for %%f in (.env.example server\.env.example) do (
    if exist "%%f" (
        echo   ✓ %%f
    ) else (
        echo   ✗ MISSING: %%f
        set /a MISSING=!MISSING!+1
    )
)

echo.
echo Checking deployment scripts...
for %%f in (scripts\deploy.bat scripts\setup.bat scripts\health-check.bat) do (
    if exist "%%f" (
        echo   ✓ %%f
    ) else (
        echo   ✗ MISSING: %%f
        set /a MISSING=!MISSING!+1
    )
)

echo.
echo Checking documentation...
for %%f in (DEPLOYMENT.md QUICKSTART.md DEPLOYMENT_CHECKLIST.md) do (
    if exist "%%f" (
        echo   ✓ %%f
    ) else (
        echo   ✗ MISSING: %%f
        set /a MISSING=!MISSING!+1
    )
)

echo.
echo Checking CI/CD...
if exist ".github\workflows\deploy.yml" (
    echo   ✓ .github\workflows\deploy.yml
) else (
    echo   ✗ MISSING: .github\workflows\deploy.yml
    set /a MISSING=!MISSING!+1
)

echo.
echo Checking application files...
if exist "package.json" (
    echo   ✓ package.json
) else (
    echo   ✗ MISSING: package.json
    set /a MISSING=!MISSING!+1
)

if exist "server\package.json" (
    echo   ✓ server\package.json
) else (
    echo   ✗ MISSING: server\package.json
    set /a MISSING=!MISSING!+1
)

if exist "src" (
    echo   ✓ src\ directory
) else (
    echo   ✗ MISSING: src\ directory
    set /a MISSING=!MISSING!+1
)

if exist "server" (
    echo   ✓ server\ directory
) else (
    echo   ✗ MISSING: server\ directory
    set /a MISSING=!MISSING!+1
)

echo.
echo ════════════════════════════════════════════════════════════

if %MISSING% equ 0 (
    echo ✓ All deployment files are present!
    echo.
    echo Next steps:
    echo   1. Read QUICKSTART.md for 5-minute setup
    echo   2. Configure .env.production with your secrets
    echo   3. Run: .\scripts\deploy.bat production
    echo   4. Verify: .\scripts\health-check.bat
    echo.
    echo Full documentation: See DEPLOYMENT.md
    exit /b 0
) else (
    echo ✗ Found %MISSING% missing files!
    echo.
    echo Please ensure all deployment files are created.
    exit /b 1
)
