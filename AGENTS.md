# YouTube Short Splicer - Developer Guide

This repository contains a full-stack application for splicing YouTube Shorts. It consists of a FastAPI backend and a React/Vite frontend.

## Project Structure

- **backend/**: Python FastAPI application handling video processing (ffmpeg).
- **frontend/**: React 19 + Vite application for the user interface.
- **tests/**: Automated integration tests.

## Backend (Python/FastAPI)

### Build & Run
- **Install Dependencies:**
  ```bash
  pip install -r backend/requirements.txt
  ```
- **Run Development Server:**
  ```bash
  cd backend && uvicorn main:app --reload --port 8000
  ```
  *(Ensure `ffmpeg` and `ffprobe` are installed and accessible in the system PATH or `bin/` directory)*

### Testing
- **Run Unit Tests:**
  ```bash
  cd backend && pytest
  ```
- **Run Integration Pipeline Tests:**
  This suite generates synthetic 4K videos and tests the full splicing pipeline, including "No Audio" edge cases.
  ```bash
  pytest tests/test_pipeline.py
  ```

### Code Style & Conventions
- **Formatting:** Use 4 spaces for indentation. Follow PEP 8 guidelines.
- **Type Hinting:** Strictly use type hints for function arguments and return values (e.g., `def func(a: int) -> str:`).
- **Imports:** Group imports: standard library, third-party, then local.
- **Error Handling:**
  - Use `try...except` blocks for external operations (filesystem, subprocesses).
  - Catch specific exceptions (e.g., `subprocess.CalledProcessError`) before generic `Exception`.
  - Return meaningful HTTP errors (e.g., JSON response or `HTTPException`).
- **File Handling:** Use `os.path.join` for cross-platform compatibility. Always use absolute paths when possible.

## Frontend (React/Vite)

### Build & Run
- **Install Dependencies:**
  ```bash
  cd frontend && npm install
  ```
- **Run Development Server:**
  ```bash
  cd frontend && npm run dev
  ```
- **Build for Production:**
  ```bash
  cd frontend && npm run build
  ```
- **Linting:**
  ```bash
  cd frontend && npm run lint
  ```

### Testing
- **Run All Tests:**
  ```bash
  cd frontend && npm test
  ```
  *(This runs `vitest` in watch mode by default)*
- **Run Single Test File:**
  ```bash
  cd frontend && npx vitest src/test/App.test.jsx
  ```

### Code Style & Conventions
- **Framework:** React 19 with Hooks. Avoid class components.
- **Styling:** Use TailwindCSS utility classes.
  - Use `clsx` and `tailwind-merge` for conditional class names.
  - Example: `className={clsx("p-4 rounded", isActive && "bg-blue-500")}`
- **State Management:** Use `useState` for local state. Use `useRef` for DOM manipulation (e.g., video player).
- **Naming:**
  - Components: `PascalCase` (e.g., `VideoPlayer.jsx`).
  - Functions/Variables: `camelCase`.
  - Constants: `UPPER_SNAKE_CASE`.
- **Formatting:** Use 2 spaces for indentation. Semicolons are preferred.
- **Icons:** Use `lucide-react` for icons.

## General Guidelines

- **Path Construction:** When using file system tools, always construct full absolute paths.
- **Comments:** Explain *why* complex logic exists, not *what* the code does.
- **Safety:** Verify file existence before reading/writing. Check for `ffmpeg` availability in backend code.
- **Git:** Do not commit `temp/` directories, `venv/`, `node_modules/`, or `dist/`.
