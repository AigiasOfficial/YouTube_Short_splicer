import os
import sys
import subprocess
import requests
import time
import json
import pytest

# Config
BACKEND_URL = "http://localhost:8000"
TEST_VIDEO_PATH = os.path.join(os.path.dirname(__file__), "synthetic_4k.mp4")
TEST_NO_AUDIO_PATH = os.path.join(os.path.dirname(__file__), "synthetic_no_audio.mp4")

# Determine FFmpeg path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if os.name == 'nt':
    FFMPEG_BIN = os.path.join(PROJECT_ROOT, "bin", "ffmpeg.exe")
else:
    FFMPEG_BIN = os.path.join(PROJECT_ROOT, "bin", "ffmpeg")

if not os.path.exists(FFMPEG_BIN):
    FFMPEG_BIN = "ffmpeg" # Fallback to PATH

def generate_test_video(filename, duration=30, audio=True):
    """Generates a synthetic 4K video using FFmpeg"""
    if os.path.exists(filename):
        return

    print(f"Generating synthetic video: {filename}...")
    
    # 4K resolution, color source
    cmd = [
        FFMPEG_BIN, "-y",
        "-f", "lavfi", "-i", f"testsrc=size=3840x2160:rate=30:duration={duration}",
    ]
    
    if audio:
        cmd.extend(["-f", "lavfi", "-i", f"sine=frequency=1000:duration={duration}"])
        cmd.extend(["-c:v", "libx264", "-c:a", "aac"])
    else:
        cmd.extend(["-c:v", "libx264"])
        
    cmd.extend(["-preset", "ultrafast", filename])
    
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("Video generated.")

@pytest.fixture(scope="session", autouse=True)
def setup_videos():
    generate_test_video(TEST_VIDEO_PATH, audio=True)
    generate_test_video(TEST_NO_AUDIO_PATH, audio=False)

def test_backend_health():
    """Check if backend is running"""
    try:
        response = requests.get(f"{BACKEND_URL}/")
        assert response.status_code == 200
    except requests.exceptions.ConnectionError:
        pytest.fail("Backend is not running. Please start it with 'start_app.bat' or 'uvicorn'.")

def test_process_video_standard():
    """Test standard splicing flow with audio"""
    segments = [
        {"start": 5.0, "end": 10.0, "cropOffset": 0.2}, # 5s
        {"start": 15.0, "end": 20.0, "cropOffset": 0.8} # 5s
    ]
    
    with open(TEST_VIDEO_PATH, "rb") as f:
        files = {"file": ("test_video.mp4", f, "video/mp4")}
        data = {"segments": json.dumps(segments)}
        
        start_time = time.time()
        response = requests.post(f"{BACKEND_URL}/process-video", files=files, data=data)
        duration = time.time() - start_time
        
    assert response.status_code == 200
    assert len(response.content) > 1000 # Should be substantial
    print(f"Standard processing took {duration:.2f}s")

def test_process_video_no_audio():
    """Test processing of video WITHOUT audio track (Crash fix verification)"""
    segments = [
        {"start": 2.0, "end": 5.0, "cropOffset": 0.5},
    ]
    
    with open(TEST_NO_AUDIO_PATH, "rb") as f:
        files = {"file": ("test_no_audio.mp4", f, "video/mp4")}
        data = {"segments": json.dumps(segments)}
        
        response = requests.post(f"{BACKEND_URL}/process-video", files=files, data=data)
        
    assert response.status_code == 200
    assert len(response.content) > 1000
    
    # Verify the output is valid? (Optional, requires saving and probing)

if __name__ == "__main__":
    # Manual run if executed directly
    setup_videos()
    test_backend_health()
    test_process_video_standard()
    test_process_video_no_audio()
    print("All manual tests passed!")
