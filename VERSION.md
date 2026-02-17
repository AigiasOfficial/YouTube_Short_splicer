# YouTube Short Splicer - Version History

## v2.1.0 (Current)
**Released:** February 17, 2026

This release brings all major features to life with full backend integration.

### Live Features

#### Speed Modifier
*   **Per-Scene Speed Control:** Each segment can have its own playback speed with presets: 0.5x, 1x, 1.5x, 2x, 3x.
*   **Audio Tempo Adjustment:** Audio automatically adjusts tempo to match video speed using FFmpeg's atempo filter (with chaining for extreme values).
*   **Output Duration Calculation:** Real-time preview of adjusted output duration.

#### Title System
*   **Title Overlays:** Add text titles that display on the final video at specified times.
*   **Core Animations:** Four animation presets:
    *   **Fade:** Simple fade in/out
    *   **Slide Up:** Slides up from below
    *   **Pop:** Bouncy scale effect
    *   **Typewriter:** Character-by-character reveal
*   **Customization:** Font size (24-120px), position (top/center/bottom).
*   **Timeline Integration:** Titles appear on dedicated track in Studio view.

#### Audio Track System
*   **Multi-Track Audio:** Upload additional audio files to mix with the original soundtrack.
*   **Audio Positioning:** Drag audio clips to position them on the timeline.
*   **Volume Control:** Per-track volume adjustment.
*   **Mute/Solo:** Quick controls for each audio track.

### Backend Improvements
*   **Enhanced FFmpeg Pipeline:** Complex filter chains for speed, titles, and audio mixing.
*   **Multi-File Upload:** Support for video + multiple audio files in single request.
*   **Output Timeline Calculation:** Accurate timestamp mapping for title positioning.

---

## v2.0.0
**Released:** February 17, 2026

This is a major UI overhaul with a dark cinematic design, restructured architecture, and mockups for upcoming features.

### New Design System
*   **Dark Cinematic Theme:** Deep blacks (#0a0a0a), red accents (#ef4444), and subtle highlights inspired by professional video editors like DaVinci Resolve.
*   **CSS Variables:** Centralized theming with custom properties for colors, shadows, and transitions.
*   **Component Library:** New UI primitives (Button, Input, Panel, Slider, Badge, IconButton, Tabs) for consistent styling.

### Architecture Refactor
*   **Modular Components:** Extracted VideoPlayer, CropOverlay, PlaybackControls, and Timeline into separate modules.
*   **Custom Hooks:** Created useSegments, useVideoPlayer, useAudioTracks, useKeyboardShortcuts, useTitles for cleaner state management.
*   **Tab-Based Navigation:** Switch between "Clip Editor" and "Studio" views.

---

## v1.1.0
**Released:** February 16, 2026

This release introduces significant UI/UX improvements, stability fixes for raw footage, and a new visual editing workflow.

### New Features
*   **Visual Timeline:** A scrollable filmstrip at the bottom of the screen generates thumbnails for your video, allowing you to see exactly where you are cutting.
    *   **Zoom & Pan:** Use the new Zoom controls to get frame-perfect accuracy. Right-click and drag on the timeline to pan.
*   **Advanced Crop Editor:**
    *   **Drag-to-Crop:** A red overlay box allows you to visually select the 9:16 vertical area for your Short.
    *   **Real-time Preview:** The "Preview Loop" mode now accurately simulates the final vertical crop, showing you exactly what the output will look like.
*   **Precision Editing:**
    *   **Sidebar Inputs:** You can now type exact values for Start Time, End Time, and Duration in the sidebar for precise adjustments.
    *   **Scene Loop:** A new "Loop Scene" button allows you to watch a single segment repeatedly to fine-tune the cut.
*   **Smart Progress Bar:** A visual progress bar appears during video generation to provide feedback on the rendering status.

### Bug Fixes & Improvements
*   **Audio Stability:** Fixed a critical bug where videos without an audio track (e.g., raw 4K drone footage) would cause the backend to crash. The system now automatically detects and handles audio-less files.
*   **Storage Management:** Implemented automatic cleanup of temporary files to prevent disk space usage from growing over time.
*   **Native Player Default:** Switched the default video engine to the browser's native player for significantly better performance with 4K/HEVC files.

---

## v1.0.0
**Released:** Initial Release

*   Basic splitting functionality.
*   FastAPI backend with FFmpeg integration.
*   React frontend.
*   Support for Windows deployment.
