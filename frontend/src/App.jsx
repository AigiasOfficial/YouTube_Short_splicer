import { useState, useRef, useEffect, useCallback } from 'react';
import ReactPlayer from 'react-player';
import { Play, Pause, Scissors, Trash2, Download, Plus, Clock, FileVideo, AlertCircle, Info, RefreshCw, Eye, EyeOff, Loader2, Crop, X } from 'lucide-react';
import clsx from 'clsx';

function App() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoSrc, setVideoSrc] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [segments, setSegments] = useState([]);
  const [markStart, setMarkStart] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  
  // Default to native player
  const [useNativePlayer, setUseNativePlayer] = useState(true);
  
  // New features
  const [previewing, setPreviewing] = useState(false);
  const [activeSegmentId, setActiveSegmentId] = useState(null);
  const [displayedDimensions, setDisplayedDimensions] = useState({ width: 0, height: 0, top: 0, left: 0 }); // Rendered size

  const playerRef = useRef(null);
  const nativeVideoRef = useRef(null);
  const videoContainerRef = useRef(null);

  // Resize Observer to update overlay position on window resize
  useEffect(() => {
    if (!videoContainerRef.current) return;
    
    const updateDimensions = () => {
        if (!videoContainerRef.current) return;
        const videoElement = nativeVideoRef.current || (playerRef.current && playerRef.current.getInternalPlayer());
        
        // Native video element logic
        if (videoElement && (videoElement.videoWidth || videoElement.videoWidth === 0)) {
            const container = videoContainerRef.current;
            const containerRatio = container.clientWidth / container.clientHeight;
            // Default to 16:9 if metadata not loaded yet
            const videoRatio = (videoElement.videoWidth || 16) / (videoElement.videoHeight || 9);
            
            let width, height, top, left;

            if (containerRatio > videoRatio) {
                // Limited by height (black bars on sides)
                height = container.clientHeight;
                width = height * videoRatio;
                top = 0;
                left = (container.clientWidth - width) / 2;
            } else {
                // Limited by width (black bars on top/bottom)
                width = container.clientWidth;
                height = width / videoRatio;
                left = 0;
                top = (container.clientHeight - height) / 2;
            }

            setDisplayedDimensions({ width, height, top, left });
        }
    };

    const observer = new ResizeObserver(updateDimensions);
    observer.observe(videoContainerRef.current);
    window.addEventListener('resize', updateDimensions);
    
    // Initial check
    updateDimensions();

    return () => {
        observer.disconnect();
        window.removeEventListener('resize', updateDimensions);
    };
  }, [videoSrc, useNativePlayer, duration]); // Re-run when duration changes (metadata loaded)


  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      console.log("Selected file:", file.name, file.type, file.size);
      
      if (videoSrc) {
        URL.revokeObjectURL(videoSrc);
      }

      const newSrc = URL.createObjectURL(file);
      setVideoFile(file);
      setVideoSrc(newSrc);
      setSegments([]);
      setMarkStart(null);
      setError(null);
      setPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setPreviewing(false);
      setActiveSegmentId(null);
      
      // Detailed Debug Info
      setDebugInfo({
        name: file.name,
        type: file.type || "unknown",
        size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
        url: newSrc
      });
    }
  };

  const handleProgress = (state) => {
    // Only update if not previewing (preview loop handles its own seeking)
    if (!previewing) {
        setCurrentTime(state.playedSeconds);
    }
  };

  const handleDuration = (d) => {
    console.log("Video Duration Loaded:", d);
    setDuration(d);
    if (error) setError(null);
  };

  const handleError = (e) => {
    console.error("Video Error:", e);
    
    let msg = "Failed to load video.";
    if (e && e.target && e.target.error) {
        const code = e.target.error.code;
        const message = e.target.error.message;
        msg += ` Code: ${code} (${message})`;
        
        if (code === 3) msg += " (Decoding Error - Codec issue?)";
        if (code === 4) msg += " (Not Supported - Format issue?)";
    } else {
        msg += " The format (e.g., MKV, HEVC/H.265) might not be supported by your browser.";
    }
    setError(msg);
  };

  const seekTo = useCallback((seconds) => {
    if (useNativePlayer && nativeVideoRef.current) {
        nativeVideoRef.current.currentTime = seconds;
    } else if (playerRef.current) {
        playerRef.current.seekTo(seconds, 'seconds');
    }
    setCurrentTime(seconds);
  }, [useNativePlayer]);

  const seekRelative = useCallback((seconds) => {
    let newTime = currentTime + seconds;
    // Clamp
    if (newTime < 0) newTime = 0;
    if (newTime > duration) newTime = duration;

    if (useNativePlayer && nativeVideoRef.current) {
        nativeVideoRef.current.currentTime = newTime;
    } else if (playerRef.current) {
        playerRef.current.seekTo(newTime, 'seconds');
    }
    setCurrentTime(newTime);
  }, [useNativePlayer, currentTime, duration]);

  const handleKeyDown = useCallback((e) => {
    if (!videoSrc) return;
    if (e.target.tagName === 'INPUT') return;

    if (e.key === 'ArrowRight') {
      seekRelative(10);
    } else if (e.key === 'ArrowLeft') {
      seekRelative(-10);
    } else if (e.key === ' ') {
        e.preventDefault();
        setPlaying(prev => !prev);
    }
  }, [videoSrc, seekRelative]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Sync native player play/pause
  useEffect(() => {
      if (useNativePlayer && nativeVideoRef.current) {
          if (playing) nativeVideoRef.current.play().catch(handleError);
          else nativeVideoRef.current.pause();
      }
  }, [playing, useNativePlayer]);

  // Preview Loop Logic
  useEffect(() => {
    let animationFrame;
    
    const checkPreviewLoop = () => {
        if (!previewing || segments.length === 0) return;

        // Current real time from player
        let currentRealTime = currentTime;
        if (useNativePlayer && nativeVideoRef.current) {
            currentRealTime = nativeVideoRef.current.currentTime;
        } else if (playerRef.current) {
            currentRealTime = playerRef.current.getCurrentTime();
        }

        // Find which segment we are currently in
        let currentSegIndex = segments.findIndex(s => currentRealTime >= s.start && currentRealTime < s.end);
        
        // If not in any segment, jump to next closest segment start
        if (currentSegIndex === -1) {
             // Find next segment
             const nextSeg = segments.find(s => s.start > currentRealTime);
             if (nextSeg) {
                 seekTo(nextSeg.start);
             } else {
                 // Loop back to start
                 seekTo(segments[0].start);
             }
        } else {
            // We are in a segment, check if we reached the end (with small buffer)
            const currentSeg = segments[currentSegIndex];
            if (currentRealTime >= currentSeg.end - 0.2) { // 200ms buffer for smoother loop
                const nextSeg = segments[currentSegIndex + 1];
                if (nextSeg) {
                    seekTo(nextSeg.start);
                } else {
                    // Loop back to start
                    seekTo(segments[0].start);
                }
            }
        }
        
        if (previewing && playing) {
            animationFrame = requestAnimationFrame(checkPreviewLoop);
        }
    };

    if (previewing && playing) {
        animationFrame = requestAnimationFrame(checkPreviewLoop);
    }

    return () => cancelAnimationFrame(animationFrame);
  }, [previewing, playing, currentTime, segments, useNativePlayer, seekTo]);


  const handleMarkIn = () => {
    setMarkStart(currentTime);
  };

  const handleMarkOut = () => {
    if (markStart === null) return;
    if (currentTime <= markStart) {
        alert("End time must be after start time");
        return;
    }
    
    const newSegment = {
      id: Date.now(),
      start: markStart,
      end: currentTime,
      cropOffset: 0.5 // Default center
    };
    
    setSegments([...segments, newSegment]);
    setMarkStart(null);
    setActiveSegmentId(newSegment.id); // Select new segment
  };

  const deleteSegment = (id) => {
    setSegments(segments.filter(s => s.id !== id));
    if (activeSegmentId === id) setActiveSegmentId(null);
  };

  const updateSegmentCrop = (id, newOffset) => {
      setSegments(segments.map(s => s.id === id ? { ...s, cropOffset: newOffset } : s));
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const date = new Date(seconds * 1000);
    const hh = date.getUTCHours();
    const mm = date.getUTCMinutes();
    const ss = String(date.getUTCSeconds()).padStart(2, '0');
    if (hh) {
      return `${hh}:${String(mm).padStart(2, '0')}:${ss}`;
    }
    return `${mm}:${ss}`;
  };

  const handleGenerate = async () => {
    if (!videoFile || segments.length === 0) return;

    setProcessing(true);
    setError(null);
    setPreviewing(false); // Stop preview
    setPlaying(false);

    const formData = new FormData();
    formData.append('file', videoFile);
    formData.append('segments', JSON.stringify(segments));

    try {
      const response = await fetch('http://localhost:8000/process-video', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Processing failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `short_${videoFile.name.split('.')[0]}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
      setError("Failed to generate video. Ensure backend is running.");
    } finally {
      setProcessing(false);
    }
  };

  // Crop Overlay Logic
  const activeSegment = segments.find(s => s.id === activeSegmentId);
  const isDragging = useRef(false);
  
  const handleCropDrag = (e) => {
      if (!activeSegment || !videoContainerRef.current) return;
      
      const containerRect = videoContainerRef.current.getBoundingClientRect();
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      
      if (!clientX) return;

      // Calculate displayed video bounds
      const videoLeft = containerRect.left + displayedDimensions.left;
      const videoWidth = displayedDimensions.width;
      
      // Calculate 9:16 crop width in pixels relative to displayed video
      const cropWidth = displayedDimensions.height * (9/16);
      const maxOffsetPx = videoWidth - cropWidth;
      
      if (maxOffsetPx <= 0) return; // Video is narrower than crop box (unlikely if 16:9)

      // Mouse position relative to video start
      let relativeX = clientX - videoLeft;
      
      // Center the crop box on mouse
      relativeX -= (cropWidth / 2);
      
      // Clamp
      relativeX = Math.max(0, Math.min(relativeX, maxOffsetPx));
      
      // Convert to 0.0 - 1.0 offset
      const newOffset = relativeX / maxOffsetPx;
      updateSegmentCrop(activeSegment.id, newOffset);
  };
  

  return (
    <div className="flex h-screen w-full bg-neutral-900 text-gray-100 overflow-hidden font-sans">
      
      {/* Processing Overlay */}
      {processing && (
          <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm">
              <Loader2 className="w-16 h-16 text-red-500 animate-spin mb-4" />
              <h2 className="text-2xl font-bold text-white">Processing Video...</h2>
              <p className="text-neutral-400 mt-2">Please wait while we stitch your clips.</p>
          </div>
      )}

      {/* Sidebar: Segments & Actions */}
      <div className="w-80 bg-neutral-800 border-r border-neutral-700 flex flex-col shrink-0 z-20">
        <div className="p-4 border-b border-neutral-700">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Scissors className="w-5 h-5 text-red-500" />
            Short Splicer
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!videoSrc ? (
            <div className="text-center text-neutral-500 mt-10">
              <FileVideo className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Load a video to start splicing</p>
            </div>
          ) : (
            <>
              <div className="bg-neutral-900/50 p-3 rounded text-xs font-mono text-neutral-400 mb-4 border border-neutral-700">
                <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-neutral-300">File Info</span>
                    <Info className="w-3 h-3" />
                </div>
                {debugInfo && (
                    <div className="space-y-1">
                        <div className="truncate" title={debugInfo.name}><span className="text-neutral-500">Name:</span> {debugInfo.name}</div>
                        <div><span className="text-neutral-500">Type:</span> {debugInfo.type}</div>
                        <div><span className="text-neutral-500">Size:</span> {debugInfo.size}</div>
                    </div>
                )}
                <div className="mt-3 pt-2 border-t border-neutral-700 flex items-center gap-2">
                    <span className="text-neutral-500">Player:</span>
                    <button 
                        onClick={() => setUseNativePlayer(!useNativePlayer)}
                        className="text-blue-400 hover:underline flex items-center gap-1"
                    >
                        <RefreshCw className="w-3 h-3" />
                        {useNativePlayer ? "Native Video" : "ReactPlayer"}
                    </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-neutral-400 mb-2">
                <span>Segments ({segments.length})</span>
                {previewing ? (
                    <span className="text-green-400 flex items-center gap-1 text-xs animate-pulse">
                        <Eye className="w-3 h-3" /> Previewing Loop
                    </span>
                ) : markStart !== null && (
                  <span className="text-amber-500 animate-pulse text-xs">Marking In...</span>
                )}
              </div>
              
              <div className="space-y-2">
                {segments.map((seg, idx) => (
                  <div 
                    key={seg.id} 
                    onClick={() => {
                        setActiveSegmentId(seg.id);
                        seekTo(seg.start);
                        if (!playing) setPlaying(false); // Don't auto-play
                    }}
                    className={clsx(
                        "p-3 rounded-lg flex flex-col gap-2 cursor-pointer transition-all border",
                        activeSegmentId === seg.id 
                            ? "bg-neutral-700 border-red-500/50 shadow-md shadow-black/20" 
                            : "bg-neutral-700/50 border-transparent hover:bg-neutral-700 hover:border-neutral-600"
                    )}
                  >
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className={clsx("text-xs font-mono", activeSegmentId === seg.id ? "text-red-400" : "text-neutral-400")}>
                                Scene {idx + 1}
                            </span>
                            <div className="font-mono text-sm">
                                <span className="text-green-400">{formatTime(seg.start)}</span>
                                <span className="text-neutral-500 mx-1">→</span>
                                <span className="text-red-400">{formatTime(seg.end)}</span>
                            </div>
                        </div>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                deleteSegment(seg.id);
                            }}
                            className="text-neutral-500 hover:text-red-500 p-1 rounded hover:bg-neutral-600 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                    
                    {/* Crop indicator */}
                    {activeSegmentId === seg.id && (
                        <div className="flex items-center gap-2 text-xs text-neutral-400 bg-black/20 p-1 rounded">
                            <Crop className="w-3 h-3" />
                            <span>Offset: {(seg.cropOffset * 100).toFixed(0)}%</span>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    updateSegmentCrop(seg.id, 0.5); // Reset to center
                                }}
                                className="ml-auto text-blue-400 hover:text-blue-300 text-[10px] underline"
                            >
                                Reset Center
                            </button>
                        </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-neutral-700 bg-neutral-800 space-y-3">
             {error && (
                <div className="mb-3 p-2 bg-red-900/30 text-red-200 text-xs rounded border border-red-800 flex items-start gap-2 break-words">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                    <span>{error}</span>
                </div>
            )}
            
            {/* Preview Toggle */}
             <button
                onClick={() => {
                    if (previewing) {
                        setPreviewing(false);
                        setPlaying(false);
                    } else {
                        setPreviewing(true);
                        setPlaying(true);
                        // Jump to start of first segment
                        if (segments.length > 0) seekTo(segments[0].start);
                    }
                }}
                disabled={segments.length === 0}
                className={clsx(
                    "flex items-center justify-center gap-2 w-full py-2 px-4 rounded font-medium transition-all text-sm border",
                    previewing 
                        ? "bg-green-900/30 text-green-400 border-green-800"
                        : segments.length === 0 
                            ? "bg-neutral-700 text-neutral-500 border-transparent cursor-not-allowed"
                            : "bg-neutral-700 hover:bg-neutral-600 text-neutral-300 border-neutral-600"
                )}
            >
                {previewing ? (
                    <>
                        <EyeOff className="w-4 h-4" /> Stop Preview
                    </>
                ) : (
                    <>
                        <Eye className="w-4 h-4" /> Preview Loop
                    </>
                )}
            </button>

          <input
            type="file"
            accept="video/mp4,video/quicktime,video/x-matroska,video/*"
            onChange={handleFileChange}
            className="hidden"
            id="video-upload"
          />
          <div className="grid gap-2">
            <label 
                htmlFor="video-upload" 
                className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-neutral-700 hover:bg-neutral-600 rounded cursor-pointer transition-colors text-sm font-medium"
            >
                {videoSrc ? 'Change Video' : 'Select Video File'}
            </label>
            
            <button
                onClick={handleGenerate}
                disabled={processing || segments.length === 0}
                className={clsx(
                    "flex items-center justify-center gap-2 w-full py-3 px-4 rounded font-bold transition-all",
                    processing || segments.length === 0
                        ? "bg-neutral-700 text-neutral-500 cursor-not-allowed"
                        : "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20"
                )}
            >
                {processing ? (
                    <>Processing...</>
                ) : (
                    <>
                        <Download className="w-4 h-4" />
                        Generate Short
                    </>
                )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Player */}
      <div className="flex-1 flex flex-col bg-black relative">
        <div 
            ref={videoContainerRef}
            className="flex-1 flex items-center justify-center p-4 relative bg-black overflow-hidden select-none" 
            onClick={() => setPlaying(!playing)}
        >
            {/* Crop Overlay */}
            {activeSegment && !previewing && displayedDimensions.width > 0 && (
                <div 
                    className="absolute z-10 pointer-events-auto cursor-ew-resize group"
                    style={{
                        top: displayedDimensions.top,
                        left: displayedDimensions.left,
                        width: displayedDimensions.width,
                        height: displayedDimensions.height,
                    }}
                    onClick={(e) => e.stopPropagation()} // Prevent play/pause
                    onMouseDown={() => { isDragging.current = true; }}
                    onMouseUp={() => { isDragging.current = false; }}
                    onMouseLeave={() => { isDragging.current = false; }}
                    onMouseMove={(e) => {
                        if (isDragging.current) handleCropDrag(e);
                    }}
                    onTouchStart={() => { isDragging.current = true; }}
                    onTouchEnd={() => { isDragging.current = false; }}
                    onTouchMove={(e) => {
                        if (isDragging.current) handleCropDrag(e);
                    }}
                >
                    {/* The Crop Box */}
                    <div 
                        className="absolute h-full border-2 border-red-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]"
                        style={{
                            width: `${(displayedDimensions.height * (9/16))}px`,
                            left: `${(displayedDimensions.width - (displayedDimensions.height * (9/16))) * activeSegment.cropOffset}px`
                        }}
                    >
                        {/* Grid lines for rule of thirds */}
                        <div className="absolute top-0 left-1/3 w-px h-full bg-white/30"></div>
                        <div className="absolute top-0 right-1/3 w-px h-full bg-white/30"></div>
                        <div className="absolute top-1/3 left-0 w-full h-px bg-white/30"></div>
                        <div className="absolute top-2/3 left-0 w-full h-px bg-white/30"></div>
                        
                        {/* Drag Handle hint */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-500/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            Drag to Crop
                        </div>
                    </div>
                </div>
            )}

            {/* Video Player */}
            {videoSrc ? (
                 useNativePlayer ? (
                    <video
                        ref={nativeVideoRef}
                        src={videoSrc}
                        className="w-full h-full object-contain"
                        onTimeUpdate={(e) => {
                            if (!previewing) setCurrentTime(e.target.currentTime);
                        }}
                        onLoadedMetadata={(e) => {
                            handleDuration(e.target.duration);
                            // Trigger resize observer manually
                            if (videoContainerRef.current) {
                                videoContainerRef.current.dispatchEvent(new Event('resize'));
                            }
                        }}
                        onEnded={() => setPlaying(false)}
                        onError={handleError}
                        playsInline
                    />
                ) : (
                    <ReactPlayer
                        key={videoSrc}
                        ref={playerRef}
                        url={videoSrc}
                        width="100%"
                        height="100%"
                        playing={playing}
                        controls={false}
                        onProgress={handleProgress}
                        onDuration={handleDuration}
                        onError={handleError}
                        progressInterval={50} // Faster updates for smoother preview
                        playsinline={true}
                        config={{
                            file: {
                                attributes: {
                                    controlsList: 'nodownload'
                                },
                                forceVideo: true,
                            }
                        }}
                    />
                )
            ) : (
                 <div className="flex flex-col items-center justify-center text-neutral-500">
                    <div className="w-24 h-24 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
                        <Play className="w-10 h-10 ml-2 opacity-50" />
                    </div>
                    <h2 className="text-2xl font-bold text-neutral-300">No Video Selected</h2>
                    <p className="mt-2">Upload a video from the sidebar to get started.</p>
                </div>
            )}
        </div>
        
        {/* Custom Controls Bar */}
        <div className="h-24 bg-neutral-900 border-t border-neutral-800 p-4 flex flex-col gap-2 shrink-0 z-20">
            {/* Progress Bar (Interactive) */}
            <input
                type="range"
                min={0}
                max={duration || 100} // Fallback to avoid weird range
                value={currentTime}
                onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    seekTo(val);
                }}
                disabled={previewing}
                className={clsx(
                    "w-full h-2 rounded-lg appearance-none cursor-pointer",
                    previewing ? "bg-neutral-800 accent-green-500 cursor-not-allowed" : "bg-neutral-700 accent-red-600"
                )}
            />
            
            <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setPlaying(!playing)}
                        className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-neutral-200 transition-colors"
                    >
                        {playing ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                    </button>
                    
                    <div className="text-sm font-mono text-neutral-400">
                        <span className="text-white">{formatTime(currentTime)}</span>
                        <span className="mx-1">/</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="mr-4 text-xs text-neutral-500 hidden md:block">
                        <span className="bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-700 mx-1">←</span>
                        <span className="bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-700 mx-1">→</span>
                        <span className="ml-1">seek 10s</span>
                    </div>
                    
                    <button
                        onClick={handleMarkIn}
                        disabled={markStart !== null || previewing}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors",
                            markStart !== null || previewing
                                ? "bg-neutral-800 text-neutral-500 cursor-not-allowed" 
                                : "bg-neutral-800 hover:bg-neutral-700 text-green-400 border border-green-900/30"
                        )}
                    >
                        <Plus className="w-4 h-4" />
                        Mark In
                    </button>
                    
                    <button
                        onClick={handleMarkOut}
                        disabled={markStart === null || previewing}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors",
                            markStart === null || previewing
                                ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                                : "bg-neutral-800 hover:bg-neutral-700 text-red-400 border border-red-900/30"
                        )}
                    >
                        <Clock className="w-4 h-4" />
                        Mark Out
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

export default App;
