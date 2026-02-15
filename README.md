# YouTube Short Splicer

A locally hosted application to create YouTube Shorts from standard MP4 videos. 
It allows you to select multiple scenes, trims them, crops them to 9:16 portrait mode (center crop), and stitches them together with hard cuts.

## Prerequisites

Before running the setup, ensure you have the following installed:
1.  **Python 3.8+**: [Download Python](https://www.python.org/downloads/) (Make sure to check "Add Python to PATH" during installation).
2.  **Node.js 18+**: [Download Node.js](https://nodejs.org/) (LTS version recommended).

**Note:** FFmpeg is required for video processing, but the **setup script handles downloading and installing it automatically** for you.

---

## Windows Installation & Usage

This project includes specific Batch (`.bat`) files optimized for Windows. You do **not** need to use the `.sh` files (which are for Linux/macOS).

### 1. Setup (`setup.bat`)

Double-click `setup.bat` to initialize the project. Here is exactly what it does:

1.  **Environment Check:** Verifies that Python and Node.js are installed and accessible in your system path.
2.  **FFmpeg Installation:** 
    - Downloads the latest Windows static build of FFmpeg (from gyan.dev).
    - Extracts the `ffmpeg.exe` and `ffprobe.exe` binaries.
    - Places them in a local `bin/` folder within the project. This keeps your system clean and ensures the app has exactly what it needs.
3.  **Backend Setup:**
    - Creates a Python virtual environment (`backend/venv`).
    - Activates it and installs required libraries: `fastapi` (web server), `uvicorn` (server runner), and `ffmpeg-python` (video wrapper).
4.  **Frontend Setup:**
    - Navigates to the `frontend` folder.
    - Runs `npm install` to download all React and interface dependencies.

### 2. Running the App (`start_app.bat`)

Double-click `start_app.bat` to launch the application. Here is what it does:

1.  **Starts Backend:** Opens a new command window, activates the Python virtual environment, and starts the FastAPI server on port `8000`.
2.  **Starts Frontend:** Opens a second command window and starts the React development server on port `5173`.
3.  **Opens Browser:** Automatically launches your default web browser to `http://localhost:5173`.

**To Stop:** Simply close the two command windows that opened.

---

## How to Use

1.  **Select Video:** Click "Select Video File" to load an MP4 from your computer.
2.  **Navigate:**
    - **Spacebar:** Play/Pause.
    - **Timeline:** Click to seek.
    - **Arrow Keys:** `Left` / `Right` to jump backward/forward by 10 seconds.
3.  **Mark Scenes:**
    - **Mark In:** Sets the start time of a scene.
    - **Mark Out:** Sets the end time and adds the segment to your list.
    - You can delete segments if you make a mistake.
4.  **Generate:**
    - Click **Generate Short**.
    - The app processes the video locally:
        - **Trims** the selected segments.
        - **Crops** the center of the video to 9:16 (Portrait).
        - **Stitches** them together.
    - The final video (`short_....mp4`) will automatically download.

## Running Tests

To verify the application logic, you can run the automated test suite.

### Windows
1.  Double-click `run_tests.bat`.
    - This will run the Python backend tests (using `pytest`) and the React frontend tests (using `vitest`).
    - Note: It will install `pytest` and `httpx` in your virtual environment if they are missing.

## Troubleshooting

- **"Python not found":** Ensure you added Python to your system PATH during installation. You might need to reinstall Python and check that box.
- **"FFmpeg failed":** If the generated video is 0 bytes or errors occur, check the "Backend" command window for detailed error logs.
- **Browser doesn't open:** Manually navigate to `http://localhost:5173`.
