@echo off
setlocal

echo ==========================================
echo    Running YouTube Short Splicer Tests
echo ==========================================

:: 1. Backend Tests
echo.
echo [INFO] Running Backend Tests...
cd backend
if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] Virtual environment not found. Please run setup.bat first.
    exit /b 1
)

call venv\Scripts\activate.bat

:: Install test dependencies if needed (quietly)
pip install pytest httpx >nul 2>&1

:: Run Tests
pytest tests/
if %errorlevel% neq 0 (
    echo [ERROR] Backend tests failed!
    call venv\Scripts\deactivate.bat
    exit /b 1
)
call venv\Scripts\deactivate.bat
echo [OK] Backend tests passed.

:: 2. Frontend Tests
echo.
echo [INFO] Running Frontend Tests...
cd ../frontend

:: Run Vitest (headless)
call npx vitest run
if %errorlevel% neq 0 (
    echo [ERROR] Frontend tests failed!
    exit /b 1
)
echo [OK] Frontend tests passed.

echo.
echo ==========================================
echo        All Tests Passed Successfully!
echo ==========================================
pause
