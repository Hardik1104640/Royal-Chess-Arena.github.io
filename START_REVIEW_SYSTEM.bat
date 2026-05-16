@echo off
REM Start WintrChess Review System on Windows

cd /d "%~dp0"

echo.
echo =========================================
echo  WintrChess Review System Startup
echo =========================================
echo.

REM Check if Docker is available
where docker >nul 2>nul
if %ERRORLEVEL% == 0 (
    echo Docker found! Starting with Docker Compose...
    echo.
    cd public\review-system
    docker compose up
) else (
    echo Docker not found. Starting with Node.js...
    echo.
    echo Making sure you have:
    echo  - Node.js 22+
    echo  - MongoDB running
    echo.
    
    cd public\review-system
    
    echo Installing dependencies...
    call npm install
    
    echo.
    echo Building application...
    call npm run build
    
    echo.
    echo Starting server on port 8080...
    echo Open: http://localhost:8080
    echo.
    
    call npm start
)

pause
