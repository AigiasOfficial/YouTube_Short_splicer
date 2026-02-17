import os
import shutil
import subprocess
import uuid
import tempfile
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_DIR = "temp"
os.makedirs(TEMP_DIR, exist_ok=True)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)

if os.name == 'nt':
    FFMPEG_BIN = os.path.join(PROJECT_ROOT, "bin", "ffmpeg.exe")
    FFPROBE_BIN = os.path.join(PROJECT_ROOT, "bin", "ffprobe.exe")
else:
    FFMPEG_BIN = os.path.join(PROJECT_ROOT, "bin", "ffmpeg")
    FFPROBE_BIN = os.path.join(PROJECT_ROOT, "bin", "ffprobe")

if not os.path.exists(FFMPEG_BIN):
    FFMPEG_BIN = os.path.abspath(os.path.join("bin", "ffmpeg.exe" if os.name == 'nt' else "ffmpeg"))
if not os.path.exists(FFPROBE_BIN):
    FFPROBE_BIN = os.path.abspath(os.path.join("bin", "ffprobe.exe" if os.name == 'nt' else "ffprobe"))

if not os.path.exists(FFMPEG_BIN):
    FFMPEG_BIN = "ffmpeg"
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
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return len(result.stdout.strip()) > 0
    except Exception as e:
        print(f"Warning: FFprobe failed to detect audio: {e}")
        return False


def get_audio_duration(file_path: str) -> float:
    try:
        cmd = [
            str(FFPROBE_BIN),
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            file_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return float(result.stdout.strip())
    except Exception as e:
        print(f"Warning: FFprobe failed to get duration: {e}")
        return 0.0


def build_atempo_filter(speed: float) -> str:
    """
    Build atempo filter chain for any speed value.
    atempo only accepts 0.5 to 2.0, so we chain multiple filters.
    """
    if 0.5 <= speed <= 2.0:
        return f"atempo={speed}"
    
    factors = []
    remaining = speed
    
    while remaining > 2.0:
        factors.append(2.0)
        remaining /= 2.0
    while remaining < 0.5:
        factors.append(0.5)
        remaining /= 0.5
    
    if remaining != 1.0:
        factors.append(remaining)
    
    if not factors:
        return "atempo=1.0"
    
    return ",".join([f"atempo={f}" for f in factors])


def escape_text_for_drawtext(text: str) -> str:
    """Escape special characters for FFmpeg drawtext filter."""
    replacements = [
        ("'", "'\\''"),
        (":", "\\:"),
        ("'", "'\\''"),
    ]
    result = text
    for old, new in replacements:
        result = result.replace(old, new)
    return result


def build_title_filter(titles: List[dict], output_width: int = 1080, output_height: int = 1920) -> str:
    """
    Build drawtext filter for title overlays.
    Titles are positioned on the OUTPUT timeline (after speed adjustments).
    """
    if not titles:
        return ""
    
    filters = []
    
    for title in titles:
        if not title.get('visible', True):
            continue
            
        text = title.get('text', '')
        if not text:
            continue
            
        start_time = title.get('startTime', 0)
        duration = title.get('duration', 2)
        end_time = start_time + duration
        font_size = title.get('fontSize', 48)
        position = title.get('position', 'center')
        animation = title.get('animation', 'fade')
        
        escaped_text = escape_text_for_drawtext(text)
        
        # Y position based on position setting
        if position == 'top':
            y_base = f"h*0.15"
        elif position == 'bottom':
            y_base = f"h*0.85-text_h"
        else:  # center
            y_base = f"(h-text_h)/2"
        
        # Build animation-specific expressions
        if animation == 'fade':
            fade_in = min(0.3, duration / 4)
            fade_out = min(0.3, duration / 4)
            alpha = f"'if(lt(t,{start_time}),0,if(lt(t,{start_time + fade_in}),(t-{start_time})/{fade_in},if(gt(t,{end_time - fade_out}),({end_time}-t)/{fade_out},1)))'"
            y = y_base
        elif animation == 'slide-up':
            slide_duration = 0.4
            y = f"'if(lt(t,{start_time}),{output_height},if(lt(t,{start_time + slide_duration}),{output_height}-(t-{start_time})*({output_height}-({y_base}))/{slide_duration},{y_base}))'"
            alpha = f"'if(lt(t,{start_time}),0,1)'"
        elif animation == 'pop':
            pop_duration = 0.25
            scale = f"'if(lt(t,{start_time}),0,if(lt(t,{start_time + pop_duration}),1+0.3*sin((t-{start_time})/{pop_duration}*3.14159),1))'"
            alpha = f"'if(lt(t,{start_time}),0,1)'"
            y = y_base
        elif animation == 'typewriter':
            char_count = len(text)
            type_duration = min(duration * 0.7, 1.5)
            alpha = f"'if(lt(t,{start_time}),0,if(gt(t,{end_time}),0,1))'"
            y = y_base
        else:
            alpha = f"'if(lt(t,{start_time}),0,if(gt(t,{end_time}),0,1))'"
            y = y_base
        
        # Base drawtext filter
        drawtext = f"drawtext=text='{escaped_text}':fontsize={font_size}:fontcolor=white:x=(w-text_w)/2:y={y}:alpha={alpha}:shadowcolor=black:shadowx=2:shadowy=2:enable='between(t,{start_time},{end_time})'"
        
        filters.append(drawtext)
    
    return ",".join(filters)


def cleanup_files(file_paths: List[str]):
    """Background task to remove temporary files"""
    for path in file_paths:
        try:
            if os.path.exists(path):
                os.remove(path)
                print(f"Cleaned up: {path}")
        except Exception as e:
            print(f"Error cleaning up {path}: {e}")


@app.post("/process-video")
async def process_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    segments: str = Form(...),
    titles: str = Form(default="[]"),
    audio_files: List[UploadFile] = File(default=[]),
    audio_config: str = Form(default="[]"),
):
    """
    Process video with segments, speed modifications, titles, and additional audio tracks.
    
    Args:
        file: Main video file
        segments: JSON string - [{"start", "end", "cropOffset", "speed"}, ...]
        titles: JSON string - [{"text", "startTime", "duration", "animation", "fontSize", "position"}, ...]
        audio_files: Additional audio files to mix
        audio_config: JSON string - [{"id", "startTime", "volume", "muted"}, ...]
    """
    files_to_cleanup = []
    
    try:
        file_id = str(uuid.uuid4())
        input_path = os.path.join(TEMP_DIR, f"{file_id}_input.mp4")
        output_path = os.path.join(TEMP_DIR, f"{file_id}_output.mp4")
        files_to_cleanup.extend([input_path, output_path])
        
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        has_audio = has_audio_stream(input_path)
        print(f"Audio stream detected: {has_audio}")
        
        segment_list = json.loads(segments)
        titles_list = json.loads(titles)
        audio_config_list = json.loads(audio_config)
        
        if not segment_list:
            return JSONResponse(status_code=400, content={"error": "No segments provided"})
        
        # Save uploaded audio files
        audio_file_paths = {}
        for i, audio_file in enumerate(audio_files):
            if audio_file.filename:
                audio_id = audio_config_list[i].get('id', f'audio_{i}') if i < len(audio_config_list) else f'audio_{i}'
                audio_path = os.path.join(TEMP_DIR, f"{file_id}_{audio_id}.mp3")
                with open(audio_path, "wb") as buffer:
                    shutil.copyfileobj(audio_file.file, buffer)
                audio_file_paths[audio_id] = audio_path
                files_to_cleanup.append(audio_path)
                print(f"Saved audio file: {audio_id} -> {audio_path}")
        
        # Calculate output timeline mapping
        # Each segment contributes (end - start) / speed seconds to output
        output_time = 0.0
        segment_output_times = []  # [(start, end, output_start, output_end), ...]
        
        for seg in segment_list:
            start = seg['start']
            end = seg['end']
            speed = float(seg.get('speed', 1.0))
            duration = (end - start) / speed
            
            segment_output_times.append({
                'input_start': start,
                'input_end': end,
                'output_start': output_time,
                'output_end': output_time + duration,
                'speed': speed
            })
            output_time += duration
        
        total_output_duration = output_time
        
        # Build FFmpeg filter complex
        filter_parts = []
        video_inputs = []
        audio_inputs = []
        
        for i, seg in enumerate(segment_list):
            start = seg['start']
            end = seg['end']
            crop_offset = float(seg.get('cropOffset', 0.5))
            speed = float(seg.get('speed', 1.0))
            
            crop_offset = max(0.0, min(1.0, crop_offset))
            
            # Video filter: trim -> setpts -> crop -> setpts for speed
            video_filter = (
                f"[0:v]trim=start={start}:end={end},setpts=PTS-STARTPTS,"
                f"crop=trunc(ih*9/16/2)*2:ih:(iw-ow)*{crop_offset}:0,"
                f"setpts=PTS/{speed}[v{i}]"
            )
            filter_parts.append(video_filter)
            video_inputs.append(f"[v{i}]")
            
            if has_audio:
                # Audio filter: trim -> asetpts -> atempo for speed
                atempo = build_atempo_filter(speed)
                audio_filter = (
                    f"[0:a]atrim=start={start}:end={end},asetpts=PTS-STARTPTS,"
                    f"{atempo}[a{i}]"
                )
                filter_parts.append(audio_filter)
                audio_inputs.append(f"[a{i}]")
        
        # Concat video segments
        video_concat_input = "".join(video_inputs)
        filter_parts.append(f"{video_concat_input}concat=n={len(segment_list)}:v=1:a=0[concatv]")
        
        # Handle audio
        if has_audio or audio_file_paths:
            audio_mix_inputs = []
            
            if has_audio:
                # Concat original audio segments
                audio_concat_input = "".join(audio_inputs)
                filter_parts.append(f"{audio_concat_input}concat=n={len(segment_list)}:v=0:a=1[concata]")
                audio_mix_inputs.append("[concata]")
            
            # Add additional audio tracks
            for idx, (audio_id, audio_path) in enumerate(audio_file_paths.items()):
                config = next((c for c in audio_config_list if c.get('id') == audio_id), {})
                start_time = float(config.get('startTime', 0))
                volume = float(config.get('volume', 1.0))
                muted = config.get('muted', False)
                
                if muted:
                    continue
                
                # Calculate delay in milliseconds
                delay_ms = int(start_time * 1000)
                
                # Input index for this audio file (video is input 0, so audio files start at 1)
                input_idx = list(audio_file_paths.keys()).index(audio_id) + 1
                
                audio_filter = f"[{input_idx}:a]adelay={delay_ms}|{delay_ms},volume={volume}[audio{idx}]"
                filter_parts.append(audio_filter)
                audio_mix_inputs.append(f"[audio{idx}]")
            
            # Mix all audio
            if len(audio_mix_inputs) == 1:
                filter_parts.append(f"{audio_mix_inputs[0]}anull[outa]")
            else:
                mix_inputs = "".join(audio_mix_inputs)
                filter_parts.append(f"{mix_inputs}amix=inputs={len(audio_mix_inputs)}:duration=longest[outa]")
        
        # Apply titles overlay
        title_filter = build_title_filter(titles_list)
        if title_filter:
            filter_parts.append(f"[concatv]{title_filter}[outv]")
        else:
            filter_parts.append("[concatv]null[outv]")
        
        full_filter = ";".join(filter_parts)
        
        # Build FFmpeg command
        cmd = [
            str(FFMPEG_BIN),
            "-y",
            "-i", input_path,
        ]
        
        # Add audio file inputs
        for audio_id, audio_path in audio_file_paths.items():
            cmd.extend(["-i", audio_path])
        
        cmd.extend([
            "-filter_complex", full_filter,
            "-map", "[outv]",
        ])
        
        if has_audio or audio_file_paths:
            cmd.extend(["-map", "[outa]", "-c:a", "aac"])
        
        cmd.extend([
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-t", str(total_output_duration),
            output_path
        ])
        
        print(f"Running FFmpeg command...")
        print(f"Filter: {full_filter[:500]}...")
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"FFmpeg stderr: {result.stderr}")
            return JSONResponse(status_code=500, content={"error": f"Video processing failed: {result.stderr[:500]}"})
        
        background_tasks.add_task(cleanup_files, files_to_cleanup)
        
        return FileResponse(output_path, filename="youtube_short.mp4")
        
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg failed: {e}")
        return JSONResponse(status_code=500, content={"error": "Video processing failed"})
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/")
def read_root():
    return {"message": "YouTube Short Splicer API is running"}


@app.get("/health")
def health_check():
    return {"status": "ok", "ffmpeg": FFMPEG_BIN}
