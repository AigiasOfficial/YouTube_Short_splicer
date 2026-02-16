import { useState, useRef, useEffect, useCallback } from 'react';
import ReactPlayer from 'react-player';
import { Play, Pause, Scissors, Download, Plus, Clock, FileVideo, AlertCircle, Info, RefreshCw, Eye, EyeOff, Loader2, Crop } from 'lucide-react';
import clsx from 'clsx';
import { Timeline } from './components/Timeline';
import { SegmentItem } from './components/SegmentItem';

function App() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoSrc, setVideoSrc] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [segments, setSegments] = useState([]);
  const [markStart, setMarkStart] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0); // 0-100
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  
  // Default to native player
  const [useNativePlayer, setUseNativePlayer] = useState(true);
  
  // Features
  const [previewing, setPreviewing] = useState(false);
  const [loopingSegmentId, setLoopingSegmentId] = useState(null);
  const [activeSegmentId, setActiveSegmentId] = useState(null);
  
  // Crop UI
  const [displayedDimensions, setDisplayedDimensions] = useState({ width: 0, height: 0, top: 0, left: 0 }); // Rendered size
  // Temp crop offset for the "Marking" phase (before a segment is created)
  const [tempCropOffset, setTempCropOffset] = useState(0.5);

  const playerRef = useRef(null);
  const nativeVideoRef = useRef(null);
  const videoContainerRef = useRef(null);

  // Resize Observer to update overlay position
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
    updateDimensions();

    return () => {
        observer.disconnect();
        window.removeEventListener('resize', updateDimensions);
    };
  }, [videoSrc, useNativePlayer, duration]);


  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (videoSrc) URL.revokeObjectURL(videoSrc);
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
      setLoopingSegmentId(null);
      setTempCropOffset(0.5);
      
      setDebugInfo({
        name: file.name,
        type: file.type || "unknown",
        size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
        url: newSrc
      });
    }
  };

  const handleProgress = (state) => {
    // During preview, we STILL need to update currentTime so the marker moves.
    // But we avoid setting it if it would conflict with the loop logic seeking.
    // Since checkLoops reads from REF, updating state here is safe for UI visualization.
    if (!loopingSegmentId) {
        setCurrentTime(state.playedSeconds);
    }
  };

  const handleDuration = (d) => {
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
    }
    setError(msg);
  };

  const seekTo = useCallback((seconds) => {
    // Clamp
    let t = Math.max(0, Math.min(duration, seconds));
    if (useNativePlayer && nativeVideoRef.current) {
        nativeVideoRef.current.currentTime = t;
    } else if (playerRef.current) {
        playerRef.current.seekTo(t, 'seconds');
    }
    setCurrentTime(t);
  }, [useNativePlayer, duration]);

  const seekRelative = useCallback((seconds) => {
    seekTo(currentTime + seconds);
  }, [seekTo, currentTime]);

  const handleKeyDown = useCallback((e) => {
    if (!videoSrc) return;
    if (e.target.tagName === 'INPUT') return;

    if (e.key === 'ArrowRight') seekRelative(5);
    else if (e.key === 'ArrowLeft') seekRelative(-5);
    else if (e.key === ' ') {
        e.preventDefault();
        setPlaying(prev => !prev);
    }
  }, [videoSrc, seekRelative]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Sync play/pause
  useEffect(() => {
      if (useNativePlayer && nativeVideoRef.current) {
          if (playing) nativeVideoRef.current.play().catch(handleError);
          else nativeVideoRef.current.pause();
      }
  }, [playing, useNativePlayer]);

  // TRACK PLAYING SEGMENT
  const [playingSegmentId, setPlayingSegmentId] = useState(null);

  // LOOPS (Preview & Single Scene)
  useEffect(() => {
    let animationFrame;
    
    const checkLoops = () => {
        if (segments.length === 0) return;

        // Get precise time
        let realTime = currentTime;
        if (useNativePlayer && nativeVideoRef.current) realTime = nativeVideoRef.current.currentTime;
        else if (playerRef.current) realTime = playerRef.current.getCurrentTime();

        // Update active segment tracking for crop preview
        if (previewing) {
            const activeSeg = segments.find(s => realTime >= s.start && realTime < s.end);
            setPlayingSegmentId(activeSeg ? activeSeg.id : null);
        } else {
            setPlayingSegmentId(null);
        }

        // 1. Single Scene Loop
        if (loopingSegmentId) {
            const seg = segments.find(s => s.id === loopingSegmentId);
            if (seg) {
                if (realTime >= seg.end || realTime < seg.start - 0.5) {
                    seekTo(seg.start);
                }
            }
        }
        // 2. Full Preview Loop
        else if (previewing) {
            const currentSegIndex = segments.findIndex(s => realTime >= s.start && realTime < s.end);
            
            if (currentSegIndex === -1) {
                 // Jump to next or start
                 const nextSeg = segments.find(s => s.start > realTime);
                 seekTo(nextSeg ? nextSeg.start : segments[0].start);
            } else {
                // Check end of current segment
                const currentSeg = segments[currentSegIndex];
                if (realTime >= currentSeg.end - 0.2) { 
                    const nextSeg = segments[currentSegIndex + 1];
                    seekTo(nextSeg ? nextSeg.start : segments[0].start);
                }
            }
        }

        if (playing && (previewing || loopingSegmentId)) {
            animationFrame = requestAnimationFrame(checkLoops);
        }
    };

    if (playing && (previewing || loopingSegmentId)) {
        animationFrame = requestAnimationFrame(checkLoops);
    }
    return () => cancelAnimationFrame(animationFrame);
  }, [previewing, loopingSegmentId, playing, segments, useNativePlayer, seekTo]); // Removed currentTime to prevent thrashing


  const handleMarkIn = () => {
    setMarkStart(currentTime);
    // Inherit crop from last used if available, or center
    // We keep tempCropOffset in state
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
      cropOffset: tempCropOffset // Use the offset set during the marking phase
    };
    
    setSegments([...segments, newSegment]);
    setMarkStart(null);
    setActiveSegmentId(newSegment.id);
  };

  const deleteSegment = (id) => {
    setSegments(segments.filter(s => s.id !== id));
    if (activeSegmentId === id) setActiveSegmentId(null);
    if (loopingSegmentId === id) setLoopingSegmentId(null);
  };

  const updateSegment = (id, updates) => {
      setSegments(segments.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const toggleSceneLoop = (id) => {
      if (loopingSegmentId === id) {
          setLoopingSegmentId(null); // Stop looping
      } else {
          setLoopingSegmentId(id);
          setPlaying(true);
          const seg = segments.find(s => s.id === id);
          if (seg) seekTo(seg.start);
      }
      setPreviewing(false); // Disable global preview
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const date = new Date(seconds * 1000);
    const mm = date.getUTCMinutes();
    const ss = String(date.getUTCSeconds()).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  // Fake Progress Simulation
  useEffect(() => {
      let interval;
      if (processing) {
          setProgress(0);
          interval = setInterval(() => {
              setProgress(prev => {
                  if (prev < 30) return prev + 2; // Fast start
                  if (prev < 80) return prev + 0.5; // Slow middle
                  return prev; // Stall at 80% until done
              });
          }, 100);
      } else {
          setProgress(100);
      }
      return () => clearInterval(interval);
  }, [processing]);


  const handleGenerate = async () => {
    if (!videoFile || segments.length === 0) return;

    setProcessing(true);
    setError(null);
    setPreviewing(false);
    setLoopingSegmentId(null);
    setPlaying(false);

    const formData = new FormData();
    formData.append('file', videoFile);
    formData.append('segments', JSON.stringify(segments));

    try {
      const response = await fetch('http://localhost:8000/process-video', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Processing failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `short_${videoFile.name.split('.')[0]}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setProgress(100);
    } catch (err) {
      console.error(err);
      setError("Failed to generate video.");
    } finally {
      setProcessing(false);
    }
  };

  // Crop Drag Logic
  const isDragging = useRef(false);
  const handleCropDrag = useCallback((e) => {
      if (!videoContainerRef.current) return;
      
      const containerRect = videoContainerRef.current.getBoundingClientRect();
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      if (!clientX) return;

      const videoLeft = containerRect.left + displayedDimensions.left;
      const videoWidth = displayedDimensions.width;
      const cropWidth = displayedDimensions.height * (9/16);
      const maxOffsetPx = videoWidth - cropWidth;
      
      if (maxOffsetPx <= 0) return;

      let relativeX = clientX - videoLeft - (cropWidth / 2);
      relativeX = Math.max(0, Math.min(relativeX, maxOffsetPx));
      const newOffset = relativeX / maxOffsetPx;

      // Update appropriate state
      if (activeSegmentId) {
          updateSegment(activeSegmentId, { cropOffset: newOffset });
      } else if (markStart !== null) {
          setTempCropOffset(newOffset);
      }
  }, [activeSegmentId, markStart, displayedDimensions, tempCropOffset]); // Add dependencies

  const handleCropMouseUp = useCallback(() => {
      isDragging.current = false;
  }, []);

  useEffect(() => {
      if (isDragging.current) {
          window.addEventListener('mousemove', handleCropDrag);
          window.addEventListener('mouseup', handleCropMouseUp);
      }
      return () => {
          window.removeEventListener('mousemove', handleCropDrag);
          window.removeEventListener('mouseup', handleCropMouseUp);
      };
  }, [handleCropDrag, handleCropMouseUp]); // This effect might need to run when dragging starts, but isDragging is ref.
  // Better approach: Attach listeners on MouseDown, remove on MouseUp inside the handler.

  const startCropDrag = (e) => {
      e.stopPropagation(); 
      isDragging.current = true;
      
      const onMove = (moveEvent) => handleCropDrag(moveEvent);
      const onUp = () => {
          isDragging.current = false;
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
      };
      
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
  };

  // Identify visible offset
  const currentOffset = activeSegmentId 
      ? segments.find(s => s.id === activeSegmentId)?.cropOffset 
      : tempCropOffset;

  const showCropOverlay = (markStart !== null || activeSegmentId !== null) && !previewing && displayedDimensions.width > 0;

  // Determine active crop for PREVIEW mode
  const playingSegment = segments.find(s => s.id === playingSegmentId);
  const previewCropOffset = playingSegment ? playingSegment.cropOffset : 0.5;

  return (
    <div className="flex h-screen w-full bg-neutral-900 text-gray-100 overflow-hidden font-sans">
      
      {/* Processing Overlay */}
      {processing && (
          <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center backdrop-blur-md">
              <Loader2 className="w-16 h-16 text-red-500 animate-spin mb-6" />
              <h2 className="text-3xl font-bold text-white mb-2">Generating Short...</h2>
              <p className="text-neutral-400 mb-8">Stitching your clips together</p>
              
              <div className="w-96 h-2 bg-neutral-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-600 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
              </div>
              <p className="text-neutral-500 text-sm mt-2">{Math.round(progress)}%</p>
          </div>
      )}

      {/* Sidebar */}
      <div className="w-96 bg-neutral-800 border-r border-neutral-700 flex flex-col shrink-0 z-20 shadow-xl">
        <div className="p-4 border-b border-neutral-700 bg-neutral-800">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Scissors className="w-5 h-5 text-red-500" />
            Short Splicer
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {!videoSrc ? (
            <div className="text-center text-neutral-500 mt-20 flex flex-col items-center">
              <div className="w-16 h-16 bg-neutral-700 rounded-full flex items-center justify-center mb-4">
                  <FileVideo className="w-8 h-8 text-neutral-500" />
              </div>
              <p className="font-medium text-lg text-neutral-400">No Video Loaded</p>
              <p className="text-sm mt-1">Upload a file below to start</p>
            </div>
          ) : (
            <>
              {/* File Info Box */}
              <div className="bg-neutral-900/50 p-3 rounded-lg border border-neutral-700 text-xs">
                <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-neutral-300">File Info</span>
                    <Info className="w-3 h-3 text-neutral-500" />
                </div>
                {debugInfo && (
                    <div className="space-y-1 font-mono text-neutral-400">
                        <div className="truncate" title={debugInfo.name}>{debugInfo.name}</div>
                        <div>{debugInfo.type} • {debugInfo.size}</div>
                    </div>
                )}
                <div className="mt-3 pt-2 border-t border-neutral-700 flex items-center justify-between">
                    <span className="text-neutral-500">Engine:</span>
                    <button 
                        onClick={() => setUseNativePlayer(!useNativePlayer)}
                        className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 transition-colors"
                    >
                        <RefreshCw className="w-3 h-3" />
                        {useNativePlayer ? "Native (Fast)" : "ReactPlayer"}
                    </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-neutral-400 mt-4 mb-2">
                <span className="font-bold">Segments ({segments.length})</span>
                {previewing ? (
                    <span className="text-green-400 flex items-center gap-1 text-xs animate-pulse font-bold bg-green-900/20 px-2 py-0.5 rounded-full">
                        <Eye className="w-3 h-3" /> Previewing
                    </span>
                ) : markStart !== null ? (
                  <span className="text-amber-500 animate-pulse text-xs font-bold bg-amber-900/20 px-2 py-0.5 rounded-full">
                      ● Recording
                  </span>
                ) : null}
              </div>
              
              <div className="space-y-3">
                {segments.map((seg, idx) => (
                    <SegmentItem 
                        key={seg.id}
                        idx={idx}
                        segment={seg}
                        isActive={activeSegmentId === seg.id}
                        isLooping={loopingSegmentId === seg.id}
                        onSelect={(id, start) => {
                            setActiveSegmentId(id);
                            setLoopingSegmentId(null);
                            setPreviewing(false);
                            seekTo(start);
                            setPlaying(false);
                        }}
                        onDelete={deleteSegment}
                        onUpdate={updateSegment}
                        onResetCrop={(id) => updateSegment(id, { cropOffset: 0.5 })}
                        onLoop={toggleSceneLoop}
                    />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-neutral-700 bg-neutral-800 space-y-3">
             {error && (
                <div className="mb-3 p-3 bg-red-900/20 text-red-300 text-xs rounded border border-red-800/50 flex items-start gap-2 break-words">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                    <span>{error}</span>
                </div>
            )}
            
            <div className="grid grid-cols-2 gap-2">
                 <button
                    onClick={() => {
                        if (previewing) {
                            setPreviewing(false);
                            setPlaying(false);
                        } else {
                            setPreviewing(true);
                            setLoopingSegmentId(null);
                            setActiveSegmentId(null);
                            setPlaying(true);
                            if (segments.length > 0) seekTo(segments[0].start);
                        }
                    }}
                    disabled={segments.length === 0}
                    className={clsx(
                        "flex items-center justify-center gap-2 py-2 px-3 rounded font-medium transition-all text-xs border",
                        previewing 
                            ? "bg-green-900/30 text-green-400 border-green-800"
                            : segments.length === 0 
                                ? "bg-neutral-700 text-neutral-500 border-transparent cursor-not-allowed"
                                : "bg-neutral-700 hover:bg-neutral-600 text-neutral-300 border-neutral-600"
                    )}
                >
                    {previewing ? <><EyeOff className="w-3 h-3" /> Stop</> : <><Eye className="w-3 h-3" /> Preview All</>}
                </button>
                
                <label className={clsx(
                    "flex items-center justify-center gap-2 py-2 px-3 bg-neutral-700 hover:bg-neutral-600 rounded cursor-pointer transition-colors text-xs font-medium text-neutral-300 border border-neutral-600",
                    processing && "opacity-50 cursor-not-allowed"
                )}>
                    {videoSrc ? 'Change File' : 'Select Video'}
                    <input
                        type="file"
                        accept="video/mp4,video/quicktime,video/x-matroska,video/*"
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={processing}
                    />
                </label>
            </div>
            
            <button
                onClick={handleGenerate}
                disabled={processing || segments.length === 0}
                className={clsx(
                    "flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg font-bold text-sm transition-all shadow-lg",
                    processing || segments.length === 0
                        ? "bg-neutral-700 text-neutral-500 cursor-not-allowed shadow-none"
                        : "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-red-900/30 hover:scale-[1.02] active:scale-[0.98]"
                )}
            >
                {processing ? "Processing..." : <><Download className="w-4 h-4" /> Export Short</>}
            </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-black relative min-w-0">
        <div 
            ref={videoContainerRef}
            className="flex-1 relative bg-black overflow-hidden select-none flex items-center justify-center" 
            onClick={() => setPlaying(!playing)}
        >
            {/* Crop Overlay */}
            {showCropOverlay && (
                <div 
                    className="absolute z-10 pointer-events-auto cursor-ew-resize group"
                    style={{
                        top: displayedDimensions.top,
                        left: displayedDimensions.left,
                        width: displayedDimensions.width,
                        height: displayedDimensions.height,
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={startCropDrag}
                >
                    {/* The Crop Box */}
                    <div 
                        className="absolute h-full border-2 border-red-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]"
                        style={{
                            width: `${(displayedDimensions.height * (9/16))}px`,
                            left: `${(displayedDimensions.width - (displayedDimensions.height * (9/16))) * currentOffset}px`
                        }}
                    >
                        {/* Grid lines */}
                        <div className="absolute top-0 left-1/3 w-px h-full bg-white/30" />
                        <div className="absolute top-0 right-1/3 w-px h-full bg-white/30" />
                        <div className="absolute top-1/3 left-0 w-full h-px bg-white/30" />
                        <div className="absolute top-2/3 left-0 w-full h-px bg-white/30" />
                        
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-500/90 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-bold tracking-wide shadow-sm">
                            DRAG TO CROP
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
                        className={clsx(
                            "w-full h-full",
                            previewing ? "object-cover" : "object-contain"
                        )}
                        style={previewing ? {
                            // If previewing, we simulate the crop by adjusting object-position
                            // object-position: x% 50%
                            // where x is the crop offset (0 to 100)
                            objectPosition: `${previewCropOffset * 100}% 50%`,
                            // Also need to constrain width to aspect ratio 9/16
                            maxWidth: `${(videoContainerRef.current?.clientHeight || 0) * (9/16)}px`
                        } : {}}
                        onTimeUpdate={(e) => handleProgress({ playedSeconds: e.target.currentTime })}
                        onLoadedMetadata={(e) => {
                            handleDuration(e.target.duration);
                            if (videoContainerRef.current) videoContainerRef.current.dispatchEvent(new Event('resize'));
                        }}
                        onEnded={() => setPlaying(false)}
                        onError={handleError}
                        playsInline
                    />
                ) : (
                    // ReactPlayer logic (harder to style with object-fit)
                    <div className={clsx("w-full h-full flex justify-center items-center overflow-hidden")}>
                        <div style={previewing ? {
                            width: `${(videoContainerRef.current?.clientHeight || 0) * (9/16)}px`,
                            height: '100%',
                            overflow: 'hidden',
                            position: 'relative'
                        } : { width: '100%', height: '100%' }}>
                            <ReactPlayer
                                key={videoSrc}
                                ref={playerRef}
                                url={videoSrc}
                                width={previewing ? "auto" : "100%"}
                                height="100%"
                                playing={playing}
                                controls={false}
                                onProgress={handleProgress}
                                onDuration={handleDuration}
                                onError={handleError}
                                progressInterval={50}
                                playsinline={true}
                                style={previewing ? {
                                    position: 'absolute',
                                    left: `${previewCropOffset * 100}%`,
                                    transform: `translateX(-${previewCropOffset * 100}%)`,
                                    minWidth: '100vh', // Ensure it covers height
                                } : {}}
                                config={{ file: { attributes: { controlsList: 'nodownload' }, forceVideo: true } }}
                            />
                        </div>
                    </div>
                )
            ) : null}
        </div>

        {/* Timeline & Controls */}
        <div className="bg-neutral-900 shrink-0 z-20">
            <Timeline 
                videoSrc={videoSrc}
                duration={duration}
                segments={segments}
                currentTime={currentTime}
                onSeek={seekTo}
                onUpdateSegment={updateSegment}
                activeSegmentId={activeSegmentId}
                setActiveSegmentId={(id) => {
                    setActiveSegmentId(id);
                    setLoopingSegmentId(null);
                    setPreviewing(false);
                }}
            />
            
            <div className="h-16 border-t border-neutral-800 p-2 flex items-center justify-between px-6">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setPlaying(!playing)}
                        className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-neutral-200 transition-colors shadow-lg shadow-white/10"
                    >
                        {playing ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                    </button>
                    
                    <div className="text-sm font-mono text-neutral-400 bg-black/40 px-3 py-1 rounded border border-neutral-800">
                        <span className="text-white">{formatTime(currentTime)}</span>
                        <span className="mx-1 text-neutral-600">/</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleMarkIn}
                        disabled={markStart !== null || previewing}
                        className={clsx(
                            "flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold transition-all text-sm",
                            markStart !== null || previewing
                                ? "bg-neutral-800 text-neutral-500 cursor-not-allowed" 
                                : "bg-neutral-800 hover:bg-neutral-700 text-green-400 border border-green-500/20 hover:border-green-500/50 shadow-lg shadow-black/20"
                        )}
                    >
                        <Plus className="w-4 h-4" />
                        Mark In
                    </button>
                    
                    <button
                        onClick={handleMarkOut}
                        disabled={markStart === null || previewing}
                        className={clsx(
                            "flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold transition-all text-sm",
                            markStart === null || previewing
                                ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                                : "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/40"
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
