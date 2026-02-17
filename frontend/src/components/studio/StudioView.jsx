import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import {
  Video,
  Music,
  Type,
  Plus,
  Upload,
  Play,
  Pause,
  Download,
  Volume2,
  VolumeX,
  Gauge,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button, IconButton, Panel, Slider, Badge } from '../ui';
import { TrackHeader, VideoTrackHeader, TitleTrackHeader } from '../timeline';
import { TitleTrack } from '../timeline/TitleTrack';
import { titleAnimations } from '../../constants/animations';

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function StudioView({
  videoSrc,
  segments,
  onExport,
  processing,
  titles,
  onAddTitle,
  onUpdateTitle,
  onDeleteTitle,
  onToggleTitleVisibility,
  selectedTitleId,
  onSelectTitle,
  audioTracks,
  onAddAudioTrack,
  onUpdateAudioTrack,
  onRemoveAudioTrack,
  onToggleMute,
  onToggleSolo,
}) {
  const [playing, setPlaying] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [timelineWidth, setTimelineWidth] = useState(1000);
  const [editingTitle, setEditingTitle] = useState(null);
  const [outputTime, setOutputTime] = useState(0);
  const [draggingTrack, setDraggingTrack] = useState(null);
  const [dragType, setDragType] = useState(null);
  const videoRef = useRef(null);
  const timelineRef = useRef(null);

  useEffect(() => {
    if (timelineRef.current) {
      setTimelineWidth(timelineRef.current.clientWidth);
    }
  }, []);

  const totalDuration = segments.reduce((acc, seg) => {
    return acc + (seg.end - seg.start) / (seg.speed || 1);
  }, 0);

  const contentWidth = Math.max(1000, timelineWidth) * zoomLevel;

  const timeToPx = (time) => {
    if (!totalDuration) return 0;
    return (time / totalDuration) * contentWidth;
  };

  const pxToTime = (px) => {
    if (!contentWidth) return 0;
    return (px / contentWidth) * totalDuration;
  };

  const getSegmentAtOutputTime = (outTime) => {
    let elapsed = 0;
    for (const seg of segments) {
      const segDuration = (seg.end - seg.start) / (seg.speed || 1);
      if (elapsed + segDuration > outTime) {
        return { segment: seg, sourceTime: seg.start + (outTime - elapsed) * (seg.speed || 1) };
      }
      elapsed += segDuration;
    }
    return { segment: null, sourceTime: 0 };
  };

  const getElapsedBeforeSegment = (segId) => {
    let elapsed = 0;
    for (const seg of segments) {
      if (seg.id === segId) break;
      elapsed += (seg.end - seg.start) / (seg.speed || 1);
    }
    return elapsed;
  };

  const handleDragStart = (trackId, type, e) => {
    e.preventDefault();
    setDraggingTrack(trackId);
    setDragType(type);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!draggingTrack || !timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const scrollLeft = timelineRef.current.scrollLeft;
      const x = e.clientX - rect.left + scrollLeft;
      const time = pxToTime(x);
      
      const track = audioTracks.find(t => t.id === draggingTrack);
      if (!track) return;

      if (dragType === 'move') {
        const newStartTime = Math.max(0, time - (track.duration || 10) / 2);
        onUpdateAudioTrack(draggingTrack, { startTime: newStartTime });
      } else if (dragType === 'resize-left') {
        const newDuration = (track.startTime + (track.duration || 10)) - time;
        const newStartTime = Math.max(0, time);
        if (newDuration > 0.5) {
          onUpdateAudioTrack(draggingTrack, { startTime: newStartTime, duration: newDuration });
        }
      } else if (dragType === 'resize-right') {
        const newDuration = Math.max(0.5, time - track.startTime);
        onUpdateAudioTrack(draggingTrack, { duration: newDuration });
      }
    };

    const handleMouseUp = () => {
      setDraggingTrack(null);
      setDragType(null);
    };

    if (draggingTrack) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingTrack, dragType, contentWidth, totalDuration, audioTracks, onUpdateAudioTrack]);

  const handleAddTitle = () => {
    const newTitle = onAddTitle({
      startTime: outputTime,
      duration: 2,
    });
    setEditingTitle(newTitle.id);
  };

  const handleAddAudio = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const audioDuration = audioBuffer.duration;
        onAddAudioTrack(file, audioDuration);
      }
    };
    input.click();
  };

  const customTracks = audioTracks.filter((t) => t.type === 'custom');
  const originalTrack = audioTracks.find((t) => t.type === 'original');

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-primary)] min-h-0">
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex items-center justify-center bg-black relative">
            <div className="aspect-[9/16] h-full max-h-[80vh] bg-[var(--bg-tertiary)] rounded-lg overflow-hidden flex items-center justify-center border border-[var(--border-subtle)]">
              {videoSrc ? (
                <video
                  ref={videoRef}
                  src={videoSrc}
                  className="w-full h-full object-cover"
                  style={{ objectPosition: `${(getSegmentAtOutputTime(outputTime).segment?.cropOffset ?? 0.5) * 100}% 50%` }}
                  onTimeUpdate={(e) => {
                    const srcTime = e.target.currentTime;
                    let elapsed = 0;
                    for (let i = 0; i < segments.length; i++) {
                      const seg = segments[i];
                      const segDuration = (seg.end - seg.start) / (seg.speed || 1);
                      if (srcTime >= seg.start && srcTime < seg.end) {
                        const offsetInSegment = srcTime - seg.start;
                        setOutputTime(elapsed + offsetInSegment * (seg.speed || 1));
                        return;
                      }
                      elapsed += segDuration;
                    }
                  }}
                  onEnded={() => setPlaying(false)}
                  playsInline
                />
              ) : (
                <div className="text-center text-[var(--text-muted)]">
                  <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">Preview</p>
                  <p className="text-xs mt-1 opacity-70">Play to see your short</p>
                </div>
              )}
            </div>
          </div>

          <div className="h-12 bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)] px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <IconButton
                icon={playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                onClick={() => {
                  if (videoRef.current) {
                    if (playing) {
                      videoRef.current.pause();
                    } else {
                      const { segment } = getSegmentAtOutputTime(outputTime);
                      const srcTime = segment ? segment.start + (outputTime - getElapsedBeforeSegment(segment.id)) / (segment.speed || 1) : 0;
                      videoRef.current.currentTime = srcTime;
                      videoRef.current.playbackRate = segment?.speed || 1;
                      videoRef.current.play();
                    }
                  }
                  setPlaying(!playing);
                }}
                size="md"
                variant="default"
                className="bg-[var(--accent-success)] text-white hover:bg-green-600"
              />
              <span className="font-mono text-sm text-[var(--text-secondary)]">
                {formatTime(outputTime)} / {formatTime(totalDuration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="default">{segments.length} scenes</Badge>
              <Badge variant="success">{formatTime(totalDuration)} total</Badge>
            </div>
          </div>
        </div>

        <div className="w-72 bg-[var(--bg-secondary)] border-l border-[var(--border-subtle)] flex flex-col">
          <div className="p-3 border-b border-[var(--border-subtle)]">
            <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
              Studio Tools
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            <Panel title="Titles" noBorder padding="sm">
              <div className="space-y-2">
                {titles.map((title) => (
                  <div
                    key={title.id}
                    onClick={() => onSelectTitle(title.id)}
                    className={clsx(
                      'p-2 rounded-[var(--radius-md)] cursor-pointer transition-all border',
                      selectedTitleId === title.id
                        ? 'bg-[var(--accent-purple)]/20 border-[var(--accent-purple)]'
                        : 'bg-[var(--bg-tertiary)] border-transparent hover:border-[var(--border-subtle)]'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Type className="w-3 h-3 text-[var(--accent-purple)]" />
                      <span className="text-xs text-[var(--text-primary)] truncate flex-1">
                        {title.text}
                      </span>
                      <IconButton
                        icon={title.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleTitleVisibility(title.id);
                        }}
                      />
                      <IconButton
                        icon={<Trash2 className="w-3 h-3" />}
                        size="sm"
                        variant="danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTitle(title.id);
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-1">
                      {formatTime(title.startTime)} - {formatTime(title.startTime + title.duration)}
                    </div>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Plus className="w-3 h-3" />}
                  onClick={handleAddTitle}
                  className="w-full"
                >
                  Add Title
                </Button>
              </div>
            </Panel>

            {editingTitle && (
              <TitleEditorPanel
                title={titles.find((t) => t.id === editingTitle)}
                onUpdate={(updates) => onUpdateTitle(editingTitle, updates)}
                onClose={() => setEditingTitle(null)}
              />
            )}

            <Panel title="Audio Tracks" noBorder padding="sm">
              <div className="space-y-2">
                {originalTrack && (
                  <div className="p-2 bg-[var(--bg-tertiary)] rounded-[var(--radius-md)]">
                    <div className="flex items-center gap-2 mb-2">
                      <Music className="w-3 h-3 text-[var(--accent-success)]" />
                      <span className="text-xs text-[var(--text-primary)] truncate flex-1">
                        Original Audio
                      </span>
                    </div>
                  </div>
                )}
                {customTracks.map((track) => (
                  <div key={track.id} className="p-2 bg-[var(--bg-tertiary)] rounded-[var(--radius-md)]">
                    <div className="flex items-center gap-2 mb-2">
                      <Music className="w-3 h-3 text-[var(--accent-secondary)]" />
                      <span className="text-xs text-[var(--text-primary)] truncate flex-1">
                        {track.name}
                      </span>
                      <IconButton
                        icon={track.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                        size="sm"
                        variant={track.muted ? 'danger' : 'ghost'}
                        onClick={() => onToggleMute(track.id)}
                      />
                      <IconButton
                        icon={<Trash2 className="w-3 h-3" />}
                        size="sm"
                        variant="danger"
                        onClick={() => onRemoveAudioTrack(track.id)}
                      />
                    </div>
                    <Slider
                      value={track.volume}
                      onChange={(v) => onUpdateAudioTrack(track.id, { volume: v })}
                      min={0}
                      max={1}
                      step={0.1}
                    />
                    <div className="text-[10px] text-[var(--text-muted)] mt-1">
                      Start: {formatTime(track.startTime)} | Duration: {formatTime(track.duration || 0)}
                    </div>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Upload className="w-3 h-3" />}
                  onClick={handleAddAudio}
                  className="w-full"
                >
                  Add Audio
                </Button>
              </div>
            </Panel>

            <Panel title="Export Settings" noBorder padding="sm">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)]">Format</span>
                  <span className="text-[var(--text-secondary)]">MP4 (H.264)</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)]">Resolution</span>
                  <span className="text-[var(--text-secondary)]">1080x1920</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)]">FPS</span>
                  <span className="text-[var(--text-secondary)]">30</span>
                </div>
              </div>
            </Panel>
          </div>

          <div className="p-3 border-t border-[var(--border-subtle)]">
            <Button
              variant="primary"
              size="lg"
              icon={<Download className="w-4 h-4" />}
              onClick={onExport}
              disabled={processing || segments.length === 0}
              className="w-full"
            >
              {processing ? 'Processing...' : 'Export Short'}
            </Button>
          </div>
        </div>
      </div>

      <div className="h-64 bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)] flex flex-col shrink-0">
        <div className="h-10 bg-[var(--bg-tertiary)] border-b border-[var(--border-subtle)] flex items-center px-4 gap-4">
          <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            Timeline
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Badge variant="default" size="sm">
              Zoom: {Math.round(zoomLevel * 100)}%
            </Badge>
            <IconButton
              icon={<Gauge className="w-3 h-3" />}
              size="sm"
              variant="ghost"
              onClick={() => setZoomLevel(zoomLevel === 1 ? 2 : 1)}
              tooltip="Toggle Zoom"
            />
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-48 shrink-0 border-r border-[var(--border-subtle)]">
            <VideoTrackHeader name="Video Track" sceneCount={segments.length} />
            <TitleTrackHeader name="Titles" titleCount={titles.length} />
            <TrackHeader
              type="audio"
              name="Original Audio"
              muted={originalTrack?.muted || false}
              onToggleMute={() => onToggleMute('original')}
            />
            {customTracks.map((track) => (
              <TrackHeader
                key={track.id}
                type="audio"
                name={track.name}
                muted={track.muted}
                solo={track.solo}
                onToggleMute={() => onToggleMute(track.id)}
                onToggleSolo={() => onToggleSolo(track.id)}
              />
            ))}
          </div>

          <div className="flex-1 overflow-x-auto" ref={timelineRef}>
            <div
              className="relative"
              style={{ width: `${contentWidth}px`, minWidth: '100%' }}
            >
              <div className="h-12 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] relative">
                {segments.map((seg, idx) => {
                  const segDuration = (seg.end - seg.start) / (seg.speed || 1);
                  const outputStart = segments
                    .slice(0, idx)
                    .reduce((acc, s) => acc + (s.end - s.start) / (s.speed || 1), 0);
                  const left = timeToPx(outputStart);
                  const width = timeToPx(segDuration);
                  return (
                    <div
                      key={seg.id}
                      className="absolute top-1 bottom-1 rounded-[var(--radius-sm)] bg-[var(--accent-primary)]/30 border border-[var(--accent-primary)]/50"
                      style={{ left: `${left}px`, width: `${width}px` }}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] text-[var(--text-primary)] font-mono">
                        Scene {idx + 1}
                        {seg.speed !== 1 && <span className="ml-1 text-[var(--accent-warning)]">({seg.speed}x)</span>}
                      </span>
                    </div>
                  );
                })}
              </div>

              <TitleTrack
                titles={titles}
                timeToPx={timeToPx}
                selectedId={selectedTitleId}
                onSelect={onSelectTitle}
              />

              <div className="h-12 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] relative">
                <div className="absolute inset-2 bg-[var(--accent-success)]/10 rounded-[var(--radius-sm)] border border-[var(--accent-success)]/20">
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] text-[var(--accent-success)]">
                    Original Audio
                  </span>
                </div>
              </div>

              {customTracks.map((track) => (
                <div
                  key={track.id}
                  className="h-12 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] relative"
                >
                  <div
                    className="absolute top-1 bottom-1 rounded-[var(--radius-sm)] bg-[var(--accent-secondary)]/20 border border-[var(--accent-secondary)]/30 cursor-move"
                    style={{
                      left: `${timeToPx(track.startTime)}px`,
                      width: `${timeToPx(track.duration || 10)}px`,
                    }}
                    onMouseDown={(e) => handleDragStart(track.id, 'move', e)}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-[var(--accent-secondary)] rounded-l-sm" onMouseDown={(e) => { e.stopPropagation(); handleDragStart(track.id, 'resize-left', e); }} />
                    <div className="h-full flex items-center px-2">
                      <span className="text-[10px] text-[var(--accent-secondary)] truncate">
                        {track.name}
                      </span>
                    </div>
                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-[var(--accent-secondary)] rounded-r-sm" onMouseDown={(e) => { e.stopPropagation(); handleDragStart(track.id, 'resize-right', e); }} />
                  </div>
                </div>
              ))}

              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white z-30 pointer-events-none shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                style={{ left: `${timeToPx(outputTime)}px` }}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TitleEditorPanel({ title, onUpdate, onClose }) {
  const [text, setText] = useState(title?.text || '');
  const [animation, setAnimation] = useState(title?.animation || 'fade');
  const [fontSize, setFontSize] = useState(title?.fontSize || 48);
  const [position, setPosition] = useState(title?.position || 'center');
  const [duration, setDuration] = useState(title?.duration || 2);

  const handleSave = () => {
    onUpdate({
      text,
      animation,
      fontSize,
      position,
      duration,
    });
    onClose();
  };

  return (
    <Panel title="Edit Title" noBorder padding="sm" className="bg-[var(--bg-tertiary)]">
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">
            Text
          </label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter title..."
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">
            Animation
          </label>
          <div className="grid grid-cols-2 gap-1">
            {titleAnimations.map((anim) => (
              <button
                key={anim.id}
                onClick={() => setAnimation(anim.id)}
                className={clsx(
                  'px-2 py-1 text-[10px] rounded-[var(--radius-sm)] border transition-all text-left',
                  animation === anim.id
                    ? 'bg-[var(--accent-purple)]/20 border-[var(--accent-purple)] text-[var(--accent-purple)]'
                    : 'bg-[var(--bg-primary)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                )}
              >
                {anim.name}
              </button>
            ))}
          </div>
        </div>

        <Slider
          label="Font Size"
          value={fontSize}
          onChange={setFontSize}
          min={24}
          max={120}
          step={4}
          unit="px"
        />

        <Slider
          label="Duration"
          value={duration}
          onChange={setDuration}
          min={0.5}
          max={10}
          step={0.5}
          unit="s"
        />

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">
            Position
          </label>
          <div className="grid grid-cols-3 gap-1">
            {['top', 'center', 'bottom'].map((pos) => (
              <button
                key={pos}
                onClick={() => setPosition(pos)}
                className={clsx(
                  'px-2 py-1 text-[10px] rounded-[var(--radius-sm)] border transition-all capitalize',
                  position === pos
                    ? 'bg-[var(--accent-primary)]/20 border-[var(--accent-primary)] text-[var(--accent-primary)]'
                    : 'bg-[var(--bg-primary)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                )}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-[var(--border-subtle)]">
          <Button variant="secondary" size="sm" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} className="flex-1">
            Save
          </Button>
        </div>
      </div>
    </Panel>
  );
}
