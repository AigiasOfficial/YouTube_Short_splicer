@echo off
setlocal

echo ==========================================
echo    Starting YouTube Short Splicer
echo ==========================================

:: Check paths
if not exist "backend\venv\Scripts\activate.bat" (
    echo [ERROR] Virtual environment not found. Please run setup.bat first.
    pause
    exit /b 1
)

:: Start Backend
echo Starting Backend Server...
start "Backend (FastAPI)" cmd /k "cd backend && venv\Scripts\activate && uvicorn main:app --reload --port 8000"

:: Start Frontend
echo Starting Frontend Server...
start "Frontend (Vite)" cmd /k "cd frontend && npm run dev -- --port 5173 --host"

echo.
echo ==========================================
echo Application is running!
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:8000
echo.
echo Close the opened command windows to stop the servers.
echo ==========================================
echo.

:: Open Browser
timeout /t 3 >nul
start http://localhost:5173
