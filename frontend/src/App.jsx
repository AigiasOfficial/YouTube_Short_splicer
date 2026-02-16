import { useState, useRef, useEffect, useCallback } from 'react';
import ReactPlayer from 'react-player';
import { Play, Pause, Scissors, Trash2, Download, Plus, Clock, FileVideo, AlertCircle, Info, RefreshCw } from 'lucide-react';
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
  const [useNativePlayer, setUseNativePlayer] = useState(false);

  const playerRef = useRef(null);
  const nativeVideoRef = useRef(null);

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
    setCurrentTime(state.playedSeconds);
  };

  const handleDuration = (d) => {
    console.log("Video Duration Loaded:", d);
    setDuration(d);
    if (error) setError(null); // Clear error if duration loads successfully
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

  const seekRelative = useCallback((seconds) => {
    if (useNativePlayer && nativeVideoRef.current) {
        nativeVideoRef.current.currentTime += seconds;
    } else if (playerRef.current) {
      const current = playerRef.current.getCurrentTime();
      playerRef.current.seekTo(current + seconds, 'seconds');
    }
  }, [useNativePlayer]);

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
      end: currentTime
    };
    
    setSegments([...segments, newSegment]);
    setMarkStart(null);
  };

  const deleteSegment = (id) => {
    setSegments(segments.filter(s => s.id !== id));
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

  return (
    <div className="flex h-screen w-full bg-neutral-900 text-gray-100 overflow-hidden font-sans">
      {/* Sidebar: Segments & Actions */}
      <div className="w-80 bg-neutral-800 border-r border-neutral-700 flex flex-col shrink-0">
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
                        <div><span className="text-neutral-500">Name:</span> {debugInfo.name}</div>
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
                {markStart !== null && (
                  <span className="text-amber-500 animate-pulse text-xs">Marking In...</span>
                )}
              </div>
              
              <div className="space-y-2">
                {segments.map((seg, idx) => (
                  <div key={seg.id} className="bg-neutral-700/50 p-3 rounded-lg flex items-center justify-between group hover:bg-neutral-700 transition-colors">
                    <div className="flex flex-col">
                        <span className="text-xs text-neutral-400 font-mono">Scene {idx + 1}</span>
                        <div className="font-mono text-sm">
                            <span className="text-green-400">{formatTime(seg.start)}</span>
                            <span className="text-neutral-500 mx-1">→</span>
                            <span className="text-red-400">{formatTime(seg.end)}</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => deleteSegment(seg.id)}
                        className="text-neutral-500 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-neutral-700 bg-neutral-800">
             {error && (
                <div className="mb-3 p-2 bg-red-900/30 text-red-200 text-xs rounded border border-red-800 flex items-start gap-2 break-words">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                    <span>{error}</span>
                </div>
            )}
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
        {videoSrc ? (
            <>
                <div className="flex-1 flex items-center justify-center p-4 relative bg-black" onClick={() => setPlaying(!playing)}>
                    {useNativePlayer ? (
                        <video
                            ref={nativeVideoRef}
                            src={videoSrc}
                            className="w-full h-full object-contain"
                            onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                            onLoadedMetadata={(e) => handleDuration(e.target.duration)}
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
                            progressInterval={100}
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
                    )}
                </div>
                
                {/* Custom Controls Bar */}
                <div className="h-24 bg-neutral-900 border-t border-neutral-800 p-4 flex flex-col gap-2 shrink-0">
                    {/* Progress Bar (Interactive) */}
                    <input
                        type="range"
                        min={0}
                        max={duration || 100} // Fallback to avoid weird range
                        value={currentTime}
                        onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setCurrentTime(val);
                            if (useNativePlayer && nativeVideoRef.current) {
                                nativeVideoRef.current.currentTime = val;
                            } else if (playerRef.current) {
                                playerRef.current.seekTo(val);
                            }
                        }}
                        className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-red-600"
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
                                disabled={markStart !== null}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors",
                                    markStart !== null 
                                        ? "bg-neutral-800 text-neutral-500 cursor-not-allowed" 
                                        : "bg-neutral-800 hover:bg-neutral-700 text-green-400 border border-green-900/30"
                                )}
                            >
                                <Plus className="w-4 h-4" />
                                Mark In
                            </button>
                            
                            <button
                                onClick={handleMarkOut}
                                disabled={markStart === null}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors",
                                    markStart === null
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
            </>
        ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-neutral-500">
                <div className="w-24 h-24 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
                    <Play className="w-10 h-10 ml-2 opacity-50" />
                </div>
                <h2 className="text-2xl font-bold text-neutral-300">No Video Selected</h2>
                <p className="mt-2">Upload a video from the sidebar to get started.</p>
            </div>
        )}
      </div>
    </div>
  );
}

export default App;
