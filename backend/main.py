import os
import shutil
import subprocess
import uuid
from typing import List
from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import json

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_DIR = "temp"
os.makedirs(TEMP_DIR, exist_ok=True)

# Determine FFmpeg binary path based on OS
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)

if os.name == 'nt':
    FFMPEG_BIN = os.path.join(PROJECT_ROOT, "bin", "ffmpeg.exe")
else:
    FFMPEG_BIN = os.path.join(PROJECT_ROOT, "bin", "ffmpeg")

# Fallback: check if it's in the local bin directory (relative to CWD) if the above failed
if not os.path.exists(FFMPEG_BIN):
     FFMPEG_BIN = os.path.abspath(os.path.join("bin", "ffmpeg.exe" if os.name == 'nt' else "ffmpeg"))

# Final Fallback: use system ffmpeg
if not os.path.exists(FFMPEG_BIN):
    FFMPEG_BIN = "ffmpeg"

# Determine FFprobe binary path based on OS
if os.name == 'nt':
    FFPROBE_BIN = os.path.join(PROJECT_ROOT, "bin", "ffprobe.exe")
else:
    FFPROBE_BIN = os.path.join(PROJECT_ROOT, "bin", "ffprobe")

# Fallback: check if it's in the local bin directory (relative to CWD) if the above failed
if not os.path.exists(FFPROBE_BIN):
     FFPROBE_BIN = os.path.abspath(os.path.join("bin", "ffprobe.exe" if os.name == 'nt' else "ffprobe"))

# Final Fallback: use system ffprobe
if not os.path.exists(FFPROBE_BIN):
    FFPROBE_BIN = "ffprobe"

def has_audio_stream(file_path: str) -> bool:
    try:
        cmd = [
            str(FFPROBE_BIN),
            "-v", "error",
            "-select_streams", "a",
            "-show_entries", "stream=index",
            "-of", "csv=p=0",
            file_path
        ]
        # Run probe
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        # If output contains anything, we have audio streams
        return len(result.stdout.strip()) > 0
    except Exception as e:
        print(f"Warning: FFprobe failed to detect audio: {e}")
        return False

@app.post("/process-video")
async def process_video(
    file: UploadFile = File(...),
    segments: str = Form(...)  # JSON string of segments
):
    try:
        # 1. Save uploaded file
        file_id = str(uuid.uuid4())
        input_path = os.path.join(TEMP_DIR, f"{file_id}_input.mp4")
        output_path = os.path.join(TEMP_DIR, f"{file_id}_output.mp4")
        
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Check for audio stream
        has_audio = has_audio_stream(input_path)
        print(f"Audio stream detected: {has_audio}")
            
        # 2. Parse segments
        # Format: [{"start": 10.5, "end": 20.0}, ...]
        segment_list = json.loads(segments)
        
        if not segment_list:
            return {"error": "No segments provided"}
            
        # 3. Construct FFmpeg command
        
        filter_complex_parts = []
        inputs = []
        
        for i, seg in enumerate(segment_list):
            start = seg['start']
            end = seg['end']
            
            # Default to center (0.5) if not specified
            # crop_offset is a float 0.0 (left) to 1.0 (right)
            crop_offset = float(seg.get('cropOffset', 0.5))
            
            # Clamp offset between 0 and 1
            crop_offset = max(0.0, min(1.0, crop_offset))
            
            # Video filter: trim -> reset timestamps -> crop to 9:16
            # Crop width: w = ih * (9/16)
            # Ensure width is divisible by 2 for libx264: trunc(w/2)*2
            # Crop x: (iw - ow) * crop_offset
            
            video_filter = (
                f"[0:v]trim=start={start}:end={end},setpts=PTS-STARTPTS,"
                f"crop=trunc(ih*9/16/2)*2:ih:(iw-ow)*{crop_offset}:0[v{i}]"
            )
            
            if has_audio:
                audio_filter = f"[0:a]atrim=start={start}:end={end},asetpts=PTS-STARTPTS[a{i}]"
                filter_complex_parts.append(f"{video_filter};{audio_filter}")
                inputs.extend([f"[v{i}]", f"[a{i}]"])
            else:
                filter_complex_parts.append(video_filter)
                inputs.extend([f"[v{i}]"])
            
        # Concat part
        concat_inputs = "".join(inputs)
        
        if has_audio:
            concat_part = f"{concat_inputs}concat=n={len(segment_list)}:v=1:a=1[outv][outa]"
        else:
            concat_part = f"{concat_inputs}concat=n={len(segment_list)}:v=1:a=0[outv]"
        
        full_filter = ";".join(filter_complex_parts) + ";" + concat_part
        
        # Build command list
        cmd = [
            str(FFMPEG_BIN), # Ensure path is string
            "-y",
            "-i", input_path,
            "-filter_complex", full_filter,
            "-map", "[outv]",
        ]
        
        if has_audio:
            cmd.extend(["-map", "[outa]", "-c:a", "aac"])
            
        cmd.extend([
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            output_path
        ])
        
        # Join command for debugging (be careful with spaces in paths)
        print(f"Running command: {cmd}")
        subprocess.run(cmd, check=True)
        
        return FileResponse(output_path, filename="youtube_short.mp4")
        
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg failed: {e}")
        return {"error": "Video processing failed"}
    except Exception as e:
        print(f"Error: {e}")
        return {"error": str(e)}

@app.get("/")
def read_root():
    return {"message": "YouTube Short Splicer API is running"}
