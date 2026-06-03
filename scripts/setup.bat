@echo off
REM Reservation Safari - Local Development Setup (Windows)

echo.
echo Setting up Reservation Safari for local development...
echo.

echo Installing frontend dependencies...
call npm install
if %errorlevel% neq 0 exit /b 1

echo.
echo Installing backend dependencies...
call npm install --prefix server
if %errorlevel% neq 0 exit /b 1

REM Create .env files if they don't exist
if not exist ".env.local" (
    echo Creating .env.local...
    copy .env.example .env.local
)

if not exist "server\.env" (
    echo Creating server\.env...
    copy server\.env.example server\.env
)

if not exist "server\uploads" (
    mkdir server\uploads
)

echo.
echo ✓ Setup complete!
echo.
echo Next steps:
echo   1. Update .env.local with your Base44 credentials
echo   2. Update server\.env with your configuration
echo   3. Start backend:  npm run server
echo   4. Start frontend: npm run dev
echo   5. Open http://localhost:5173
echo.
