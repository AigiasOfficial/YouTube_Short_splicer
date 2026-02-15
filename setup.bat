@echo off
setlocal

echo ==========================================
echo       YouTube Short Splicer Setup
echo ==========================================

:: 1. Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    echo Please install Python from https://www.python.org/
    pause
    exit /b 1
) else (
    echo [OK] Python found.
)

:: 2. Check for Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
) else (
    echo [OK] Node.js found.
)

:: 3. Download FFmpeg if missing
if not exist "bin\ffmpeg.exe" (
    echo [INFO] Downloading FFmpeg for Windows...
    if not exist "bin" mkdir bin
    
    :: Use PowerShell to download
    powershell -Command "Invoke-WebRequest -Uri 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip' -OutFile 'ffmpeg.zip' -UseBasicParsing"
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to download FFmpeg.
        pause
        exit /b 1
    )
    
    echo [INFO] Extracting FFmpeg...
    powershell -Command "Expand-Archive -Path 'ffmpeg.zip' -DestinationPath 'temp_ffmpeg' -Force"
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to extract FFmpeg.
        pause
        exit /b 1
    )
    
    echo [INFO] Installing FFmpeg binary...
    :: Move ffmpeg.exe to bin folder. The structure inside zip usually has a subfolder.
    cd temp_ffmpeg
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to enter temp directory.
        pause
        exit /b 1
    )
    for /d %%D in (*) do (
        if exist "%%D\bin\ffmpeg.exe" (
            move /y "%%D\bin\ffmpeg.exe" "..\bin\"
            move /y "%%D\bin\ffprobe.exe" "..\bin\"
        )
    )
    cd ..
    
    :: Cleanup
    rmdir /s /q temp_ffmpeg
    del ffmpeg.zip
    
    if exist "bin\ffmpeg.exe" (
        echo [OK] FFmpeg installed successfully.
    ) else (
        echo [ERROR] Failed to install FFmpeg. You may need to download it manually and place ffmpeg.exe in the 'bin' folder.
    )
) else (
    echo [OK] FFmpeg already exists in bin folder.
)

:: 4. Backend Setup
echo [INFO] Setting up Backend...
cd backend
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

echo Installing dependencies...
call venv\Scripts\activate.bat
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install Python dependencies.
    pause
    exit /b 1
)
call venv\Scripts\deactivate.bat
cd ..

:: 5. Frontend Setup
echo [INFO] Setting up Frontend...
cd frontend
echo Installing Node modules...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install Node dependencies.
    pause
    exit /b 1
)
cd ..

echo.
echo ==========================================
echo        Setup Complete!
echo ==========================================
echo You can now run 'start_app.bat' to launch the application.
pause
