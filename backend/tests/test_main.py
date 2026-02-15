import os
import sys
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

# Add backend to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)

@pytest.fixture
def mock_subprocess():
    with patch("subprocess.run") as mock:
        yield mock

@pytest.fixture
def dummy_video(tmp_path):
    # Create a dummy file that simulates an mp4
    video_path = tmp_path / "test.mp4"
    video_path.write_bytes(b"fake video content")
    return video_path

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "YouTube Short Splicer API is running"}

def test_process_video_no_file():
    response = client.post("/process-video", data={"segments": "[]"})
    assert response.status_code == 422 # Validation error for missing file

def test_process_video_no_segments(dummy_video):
    with open(dummy_video, "rb") as f:
        response = client.post(
            "/process-video", 
            files={"file": ("test.mp4", f, "video/mp4")},
            data={} # Missing segments
        )
    assert response.status_code == 422

def test_process_video_empty_segments(dummy_video):
    with open(dummy_video, "rb") as f:
        response = client.post(
            "/process-video",
            files={"file": ("test.mp4", f, "video/mp4")},
            data={"segments": "[]"}
        )
    # The app returns {"error": "No segments provided"} (based on my memory of the code)
    # Let's verify status code - likely 200 with error key, or 400?
    # Checking code... `if not segment_list: return {"error": "No segments provided"}`
    # FastAPI returns 200 by default for returned dicts unless Response is modified.
    assert response.status_code == 200
    assert response.json() == {"error": "No segments provided"}

def test_process_video_success_mocked(dummy_video, mock_subprocess):
    segments = '[{"start": 10, "end": 20}, {"start": 30, "end": 40}]'
    
    # We need to ensure the output file exists for FileResponse to work, 
    # even if we mock subprocess. 
    # The app code: 
    # subprocess.run(...)
    # return FileResponse(output_path)
    
    # So we must patch shutil.copyfileobj too? No, that's for input.
    # We must patch FileResponse? Or just create the output file manually in the test.
    # But we don't know the exact UUID filename.
    # Wait, the app calculates output_path inside the function. 
    # We can't easily intercept the path unless we mock uuid or the entire process logic.
    
    # Better approach: 
    # 1. Mock subprocess.run to do nothing.
    # 2. Mock `uuid.uuid4` to return a known ID so we can pre-create the "output" file.
    
    with patch("uuid.uuid4", return_value="test-uuid"):
        # Pre-create the expected output file so FileResponse finds it
        os.makedirs("temp", exist_ok=True)
        with open("temp/test-uuid_output.mp4", "wb") as f:
            f.write(b"fake output content")
            
        with open(dummy_video, "rb") as f:
            response = client.post(
                "/process-video",
                files={"file": ("test.mp4", f, "video/mp4")},
                data={"segments": segments}
            )
            
    assert response.status_code == 200
    # Check if subprocess was called with correct args
    assert mock_subprocess.called
    
    cmd_args = mock_subprocess.call_args[0][0]
    # Verify command structure
    # cmd[0] is ffmpeg binary path
    assert "-filter_complex" in cmd_args
    
    # Check filter content
    filter_idx = cmd_args.index("-filter_complex") + 1
    filter_complex = cmd_args[filter_idx]
    
    # Check for trim and crop
    assert "trim=start=10:end=20" in filter_complex
    assert "trim=start=30:end=40" in filter_complex
    assert "crop=trunc(ih*9/16/2)*2:ih:(iw-ow)/2:0" in filter_complex
    assert "concat=n=2" in filter_complex

    # Cleanup temp files
    try:
        os.remove("temp/test-uuid_input.mp4")
        os.remove("temp/test-uuid_output.mp4")
    except:
        pass
