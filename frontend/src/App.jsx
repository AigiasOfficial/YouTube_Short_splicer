import { useState, useRef, useEffect, useCallback } from 'react';
import ReactPlayer from 'react-player';
import {
  Play,
  Pause,
  Scissors,
  Download,
  Plus,
  Clock,
  FileVideo,
  AlertCircle,
  Info,
  RefreshCw,
  Eye,
  EyeOff,
  Loader2,
  Crop,
  Upload,
} from 'lucide-react';
import clsx from 'clsx';
import { Timeline } from './components/timeline';
import { SegmentList } from './components/segments';
import { VideoPlayer, CropOverlay, PlaybackControls } from './components/player';
import { Header, Sidebar, SidebarHeader, SidebarContent, SidebarFooter } from './components/layout';
import { Button, IconButton, Badge, Panel, Input, Slider } from './components/ui';
import { StudioView } from './components/studio';
import { useSegments, useKeyboardShortcuts, useTitles, useAudioTracks } from './hooks';
import './styles/theme.css';

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function App() {
  const [activeTab, setActiveTab] = useState('clip');
  const [videoFile, setVideoFile] = useState(null);
  const [videoSrc, setVideoSrc] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [useNativePlayer, setUseNativePlayer] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [loopingSegmentId, setLoopingSegmentId] = useState(null);
  const [markStart, setMarkStart] = useState(null);
  const [tempCropOffset, setTempCropOffset] = useState(0.5);
  const [displayedDimensions, setDisplayedDimensions] = useState({ width: 0, height: 0, top: 0, left: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const playerRef = useRef(null);
  const nativeVideoRef = useRef(null);
  const videoContainerRef = useRef(null);

  const {
    segments,
    activeSegmentId,
    setActiveSegmentId,
    addSegment,
    updateSegment,
    deleteSegment,
    clearSegments,
  } = useSegments();

  const {
    titles,
    addTitle,
    updateTitle,
    deleteTitle,
    toggleTitleVisibility,
    selectedTitleId,
    setSelectedTitleId,
  } = useTitles();

  const {
    audioTracks,
    addAudioTrack,
    updateAudioTrack,
    removeAudioTrack,
    toggleMute,
    toggleSolo,
    getAudioFilesForUpload,
    getAudioConfig,
  } = useAudioTracks();

  useEffect(() => {
    if (!videoContainerRef.current) return;

    const updateDimensions = () => {
      if (!videoContainerRef.current) return;
      const videoElement = nativeVideoRef.current || (playerRef.current && playerRef.current.getInternalPlayer());

      if (videoElement && (videoElement.videoWidth || videoElement.videoWidth === 0)) {
        const container = videoContainerRef.current;
        const containerRatio = container.clientWidth / container.clientHeight;
        setContainerSize({ width: container.clientWidth, height: container.clientHeight });

        const videoRatio = (videoElement.videoWidth || 16) / (videoElement.videoHeight || 9);

        let width, height, top, left;

        if (containerRatio > videoRatio) {
          height = container.clientHeight;
          width = height * videoRatio;
          top = 0;
          left = (container.clientWidth - width) / 2;
        } else {
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
      clearSegments();
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
        type: file.type || 'unknown',
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        url: newSrc,
      });
    }
  };

  const handleProgress = (state) => {
    if (!loopingSegmentId) {
      setCurrentTime(state.playedSeconds);
    }
  };

  const handleDuration = (d) => {
    setDuration(d);
    if (error) setError(null);
  };

  const handleError = (e) => {
    console.error('Video Error:', e);
    let msg = 'Failed to load video.';
    if (e && e.target && e.target.error) {
      const code = e.target.error.code;
      const message = e.target.error.message;
      msg += ` Code: ${code} (${message})`;
      if (code === 3) msg += ' (Decoding Error - Codec issue?)';
      if (code === 4) msg += ' (Not Supported - Format issue?)';
    }
    setError(msg);
  };

  const seekTo = useCallback(
    (seconds) => {
      let t = Math.max(0, Math.min(duration, seconds));
      if (useNativePlayer && nativeVideoRef.current) {
        nativeVideoRef.current.currentTime = t;
      } else if (playerRef.current) {
        playerRef.current.seekTo(t, 'seconds');
      }
      setCurrentTime(t);
    },
    [useNativePlayer, duration]
  );

  const seekRelative = useCallback(
    (delta) => {
      seekTo(currentTime + delta);
    },
    [seekTo, currentTime]
  );

  const handleMarkIn = () => {
    setMarkStart(currentTime);
  };

  const handleMarkOut = () => {
    if (markStart === null) return;
    if (currentTime <= markStart) {
      setError('End time must be after start time');
      return;
    }

    addSegment(markStart, currentTime, tempCropOffset);
    setMarkStart(null);
  };

  const handleDeleteSegment = (id) => {
    deleteSegment(id);
    if (loopingSegmentId === id) setLoopingSegmentId(null);
  };

  const handleResetCrop = (id) => {
    updateSegment(id, { cropOffset: 0.5 });
  };

  const toggleSceneLoop = (id) => {
    if (loopingSegmentId === id) {
      setLoopingSegmentId(null);
    } else {
      setLoopingSegmentId(id);
      setPlaying(true);
      const seg = segments.find((s) => s.id === id);
      if (seg) seekTo(seg.start);
    }
    setPreviewing(false);
  };

  const handleSelectSegment = (id, start) => {
    setActiveSegmentId(id);
    setLoopingSegmentId(null);
    setPreviewing(false);
    seekTo(start);
    setPlaying(false);
  };

  const handleCropChange = (newOffset) => {
    if (activeSegmentId) {
      updateSegment(activeSegmentId, { cropOffset: newOffset });
    } else if (markStart !== null) {
      setTempCropOffset(newOffset);
    }
  };

  const [playingSegmentId, setPlayingSegmentId] = useState(null);

  useEffect(() => {
    let animationFrame;

    const checkLoops = () => {
      if (segments.length === 0) return;

      let realTime = currentTime;
      if (useNativePlayer && nativeVideoRef.current) realTime = nativeVideoRef.current.currentTime;
      else if (playerRef.current) realTime = playerRef.current.getCurrentTime();

      if (previewing) {
        const activeSeg = segments.find((s) => realTime >= s.start && realTime < s.end);
        setPlayingSegmentId(activeSeg ? activeSeg.id : null);
      } else {
        setPlayingSegmentId(null);
      }

      if (loopingSegmentId) {
        const seg = segments.find((s) => s.id === loopingSegmentId);
        if (seg) {
          if (realTime >= seg.end || realTime < seg.start - 0.5) {
            seekTo(seg.start);
          }
        }
      } else if (previewing) {
        const currentSegIndex = segments.findIndex((s) => realTime >= s.start && realTime < s.end);

        if (currentSegIndex === -1) {
          const nextSeg = segments.find((s) => s.start > realTime);
          seekTo(nextSeg ? nextSeg.start : segments[0].start);
        } else {
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
  }, [previewing, loopingSegmentId, playing, segments, useNativePlayer, seekTo]);

  useEffect(() => {
    if (useNativePlayer && nativeVideoRef.current) {
      if (playing) nativeVideoRef.current.play().catch(handleError);
      else nativeVideoRef.current.pause();
    }
  }, [playing, useNativePlayer]);

  useKeyboardShortcuts({
    onPlayPause: () => setPlaying((prev) => !prev),
    onSeek: (delta) => seekRelative(delta),
    onMarkIn: handleMarkIn,
    onMarkOut: handleMarkOut,
    onDelete: () => activeSegmentId && handleDeleteSegment(activeSegmentId),
    onEscape: () => {
      setMarkStart(null);
      setActiveSegmentId(null);
      setPreviewing(false);
      setLoopingSegmentId(null);
    },
  }, !!videoSrc);

  useEffect(() => {
    let interval;
    if (processing) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 30) return prev + 2;
          if (prev < 80) return prev + 0.5;
          return prev;
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
    formData.append('titles', JSON.stringify(titles));
    
    const audioFiles = getAudioFilesForUpload();
    audioFiles.forEach((track) => {
      formData.append('audio_files', track.file);
    });
    formData.append('audio_config', JSON.stringify(getAudioConfig()));

    try {
      const response = await fetch('http://localhost:8000/process-video', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Processing failed');
      }

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
      setError(err.message || 'Failed to generate video.');
    } finally {
      setProcessing(false);
    }
  };

  const currentOffset = activeSegmentId
    ? segments.find((s) => s.id === activeSegmentId)?.cropOffset
    : tempCropOffset;

  const showCropOverlay =
    (markStart !== null || activeSegmentId !== null) && !previewing && displayedDimensions.width > 0;

  const playingSegment = segments.find((s) => s.id === playingSegmentId);
  const previewCropOffset = playingSegment ? playingSegment.cropOffset : 0.5;

  const totalAdjustedDuration = segments.reduce((acc, seg) => {
    return acc + (seg.end - seg.start) / (seg.speed || 1);
  }, 0);

  return (
    <div className="flex flex-col h-screen w-full bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden font-sans">
      {processing && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center backdrop-blur-md">
          <Loader2 className="w-16 h-16 text-[var(--accent-primary)] animate-spin mb-6" />
          <h2 className="text-3xl font-bold text-white mb-2">Generating Short...</h2>
          <p className="text-[var(--text-muted)] mb-8">Stitching your clips together</p>

          <div className="w-96 h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent-primary)] transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[var(--text-muted)] text-sm mt-2">{Math.round(progress)}%</p>
        </div>
      )}

      <Header activeTab={activeTab} onTabChange={setActiveTab}>
        {videoSrc && (
          <div className="flex items-center gap-2">
            <Badge variant="success" dot>
              {formatTime(duration)}
            </Badge>
            <Badge variant="primary">
              {segments.length} scenes
            </Badge>
            {segments.length > 0 && (
              <Badge variant="warning">
                {formatTime(totalAdjustedDuration)} output
              </Badge>
            )}
          </div>
        )}

        <label className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] rounded-[var(--radius-md)] cursor-pointer transition-colors text-sm">
          <Upload className="w-4 h-4" />
          {videoSrc ? 'Change' : 'Select Video'}
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/x-matroska,video/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={processing}
          />
        </label>
      </Header>

      <div className="flex-1 flex min-h-0">
        {activeTab === 'clip' ? (
          <>
            <Sidebar>
              <SidebarHeader title="Scenes">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-muted)]">
                    {segments.length} scene{segments.length !== 1 ? 's' : ''}
                  </span>
                  {previewing && (
                    <Badge variant="success" size="sm" dot>
                      Preview
                    </Badge>
                  )}
                  {markStart !== null && (
                    <Badge variant="warning" size="sm" dot>
                      Recording
                    </Badge>
                  )}
                </div>
              </SidebarHeader>

              <SidebarContent>
                {!videoSrc ? (
                  <div className="text-center text-[var(--text-muted)] mt-16 flex flex-col items-center">
                    <div className="w-16 h-16 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center mb-4">
                      <FileVideo className="w-8 h-8 text-[var(--text-muted)]" />
                    </div>
                    <p className="font-medium text-lg text-[var(--text-secondary)]">No Video Loaded</p>
                    <p className="text-sm mt-1">Upload a file to start</p>
                  </div>
                ) : (
                  <>
                    {debugInfo && (
                      <div className="bg-[var(--bg-tertiary)] p-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] text-xs mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-[var(--text-secondary)]">File Info</span>
                          <Info className="w-3 h-3 text-[var(--text-muted)]" />
                        </div>
                        <div className="space-y-1 font-mono text-[var(--text-muted)]">
                          <div className="truncate" title={debugInfo.name}>
                            {debugInfo.name}
                          </div>
                          <div>
                            {debugInfo.type} • {debugInfo.size}
                          </div>
                        </div>
                        <div className="mt-3 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
                          <span className="text-[var(--text-muted)]">Engine:</span>
                          <button
                            onClick={() => setUseNativePlayer(!useNativePlayer)}
                            className="text-[var(--accent-secondary)] hover:text-[var(--accent-secondary-hover)] flex items-center gap-1 transition-colors"
                          >
                            <RefreshCw className="w-3 h-3" />
                            {useNativePlayer ? 'Native' : 'ReactPlayer'}
                          </button>
                        </div>
                      </div>
                    )}

                    <SegmentList
                      segments={segments}
                      activeSegmentId={activeSegmentId}
                      onSelect={handleSelectSegment}
                      onDelete={handleDeleteSegment}
                      onUpdate={updateSegment}
                      onResetCrop={handleResetCrop}
                      onLoop={toggleSceneLoop}
                      loopingSegmentId={loopingSegmentId}
                    />
                  </>
                )}
              </SidebarContent>

              <SidebarFooter>
                {error && (
                  <div className="mb-3 p-3 bg-red-900/20 text-red-300 text-xs rounded-[var(--radius-md)] border border-red-800/50 flex items-start gap-2 break-words">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={previewing ? 'success' : 'secondary'}
                    size="sm"
                    icon={previewing ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
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
                    className="w-full"
                  >
                    {previewing ? 'Stop' : 'Preview'}
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Download className="w-3 h-3" />}
                    onClick={handleGenerate}
                    disabled={processing || segments.length === 0}
                    className="w-full"
                  >
                    Export
                  </Button>
                </div>
              </SidebarFooter>
            </Sidebar>

            <div className="flex-1 flex flex-col bg-black relative min-w-0">
              <div
                ref={videoContainerRef}
                className="flex-1 relative bg-black overflow-hidden select-none flex items-center justify-center"
                onClick={() => setPlaying(!playing)}
              >
                <CropOverlay
                  displayedSize={displayedDimensions}
                  cropOffset={currentOffset}
                  onCropChange={handleCropChange}
                  visible={showCropOverlay}
                  active
                />

                {videoSrc ? (
                  useNativePlayer ? (
                    <video
                      ref={nativeVideoRef}
                      src={videoSrc}
                      className={clsx(
                        'w-full h-full',
                        previewing ? 'object-cover' : 'object-contain'
                      )}
                      style={
                        previewing
                          ? {
                              objectPosition: `${previewCropOffset * 100}% 50%`,
                              maxWidth: `${containerSize.height * (9 / 16)}px`,
                            }
                          : {}
                      }
                      onTimeUpdate={(e) => handleProgress({ playedSeconds: e.target.currentTime })}
                      onLoadedMetadata={(e) => {
                        handleDuration(e.target.duration);
                        if (videoContainerRef.current)
                          videoContainerRef.current.dispatchEvent(new Event('resize'));
                      }}
                      onEnded={() => setPlaying(false)}
                      onError={handleError}
                      playsInline
                    />
                  ) : (
                    <div className={clsx('w-full h-full flex justify-center items-center overflow-hidden')}>
                      <div
                        style={
                          previewing
                            ? {
                                width: `${(videoContainerRef.current?.clientHeight || 0) * (9 / 16)}px`,
                                height: '100%',
                                overflow: 'hidden',
                                position: 'relative',
                              }
                            : { width: '100%', height: '100%' }
                        }
                      >
                        <ReactPlayer
                          key={videoSrc}
                          ref={playerRef}
                          url={videoSrc}
                          width={previewing ? 'auto' : '100%'}
                          height="100%"
                          playing={playing}
                          controls={false}
                          onProgress={handleProgress}
                          onDuration={handleDuration}
                          onError={handleError}
                          progressInterval={50}
                          playsinline={true}
                          style={
                            previewing
                              ? {
                                  position: 'absolute',
                                  left: `${previewCropOffset * 100}%`,
                                  transform: `translateX(-${previewCropOffset * 100}%)`,
                                  minWidth: '100vh',
                                }
                              : {}
                          }
                          config={{
                            file: { attributes: { controlsList: 'nodownload' }, forceVideo: true },
                          }}
                        />
                      </div>
                    </div>
                  )
                ) : (
                  <div className="text-center text-[var(--text-muted)]">
                    <FileVideo className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">No video loaded</p>
                    <p className="text-sm mt-1 opacity-70">Select a video file to begin</p>
                  </div>
                )}
              </div>

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

              <PlaybackControls
                playing={playing}
                currentTime={currentTime}
                duration={duration}
                onPlayPause={() => setPlaying(!playing)}
                onMarkIn={handleMarkIn}
                onMarkOut={handleMarkOut}
                markStart={markStart}
                previewing={previewing}
                disabled={!videoSrc}
              />
            </div>
          </>
        ) : (
          <StudioView
            videoSrc={videoSrc}
            segments={segments}
            currentTime={currentTime}
            onExport={handleGenerate}
            processing={processing}
            titles={titles}
            onAddTitle={addTitle}
            onUpdateTitle={updateTitle}
            onDeleteTitle={deleteTitle}
            onToggleTitleVisibility={toggleTitleVisibility}
            selectedTitleId={selectedTitleId}
            onSelectTitle={setSelectedTitleId}
            audioTracks={audioTracks}
            onAddAudioTrack={addAudioTrack}
            onUpdateAudioTrack={updateAudioTrack}
            onRemoveAudioTrack={removeAudioTrack}
            onToggleMute={toggleMute}
            onToggleSolo={toggleSolo}
          />
        )}
      </div>
    </div>
  );
}

export default App;
