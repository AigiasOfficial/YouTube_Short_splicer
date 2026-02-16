# YouTube Short Splicer - Version History

## v1.1.0 (Current)
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
