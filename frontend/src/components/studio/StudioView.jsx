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
  Settings,
  Volume2,
  Gauge,
} from 'lucide-react';
import { Button, IconButton, Panel, Slider, Badge } from '../ui';
import {
  TrackHeader,
  VideoTrackHeader,
  TitleTrackHeader,
  AudioTrackLane,
  TitleTrack,
} from '../timeline';

const MOCK_TITLES = [
  {
    id: 1,
    text: 'My Awesome Video',
    animation: 'fade',
    fontSize: 48,
    position: 'center',
    startTime: 0,
    duration: 3,
    visible: true,
  },
  {
    id: 2,
    text: 'Part 2: The Adventure',
    animation: 'slide-up',
    fontSize: 36,
    position: 'bottom',
    startTime: 8,
    duration: 2,
    visible: true,
  },
];

const MOCK_AUDIO_TRACKS = [
  {
    id: 'bgm',
    name: 'Background Music.mp3',
    startTime: 0,
    duration: 30,
    volume: 0.7,
    muted: false,
    solo: false,
  },
];

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function StudioView({
  segments,
  duration,
  currentTime,
  onExport,
  processing,
}) {
  const [titles, setTitles] = useState(MOCK_TITLES);
  const [audioTracks, setAudioTracks] = useState(MOCK_AUDIO_TRACKS);
  const [selectedTitleId, setSelectedTitleId] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [timelineWidth, setTimelineWidth] = useState(1000);
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
    if (!duration) return 0;
    return (time / duration) * contentWidth;
  };

  const handleAddTitle = () => {
    const newTitle = {
      id: Date.now(),
      text: 'New Title',
      animation: 'fade',
      fontSize: 48,
      position: 'center',
      startTime: currentTime,
      duration: 2,
      visible: true,
    };
    setTitles([...titles, newTitle]);
  };

  const handleAddAudioTrack = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        setAudioTracks([
          ...audioTracks,
          {
            id: Date.now(),
            name: file.name,
            startTime: 0,
            duration: 30,
            volume: 1,
            muted: false,
            solo: false,
          },
        ]);
      }
    };
    input.click();
  };

  const handleToggleMute = (trackId) => {
    setAudioTracks(
      audioTracks.map((t) =>
        t.id === trackId ? { ...t, muted: !t.muted } : t
      )
    );
  };

  const handleToggleSolo = (trackId) => {
    setAudioTracks(
      audioTracks.map((t) =>
        t.id === trackId ? { ...t, solo: !t.solo } : t
      )
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-primary)] min-h-0">
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex items-center justify-center bg-black relative">
            <div className="aspect-[9/16] h-full max-h-[80vh] bg-[var(--bg-tertiary)] rounded-lg overflow-hidden flex items-center justify-center border border-[var(--border-subtle)]">
              <div className="text-center text-[var(--text-muted)]">
                <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">Preview</p>
                <p className="text-xs mt-1 opacity-70">Play to see your short</p>
              </div>
            </div>
          </div>

          <div className="h-12 bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)] px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <IconButton
                icon={playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                onClick={() => setPlaying(!playing)}
                size="md"
                variant="default"
                className="bg-[var(--accent-success)] text-white hover:bg-green-600"
              />
              <span className="font-mono text-sm text-[var(--text-secondary)]">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="default">
                {segments.length} scenes
              </Badge>
              <Badge variant="success">
                {formatTime(totalDuration)} total
              </Badge>
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
                    onClick={() => setSelectedTitleId(title.id)}
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

            <Panel title="Audio Tracks" noBorder padding="sm">
              <div className="space-y-2">
                {audioTracks.map((track) => (
                  <div
                    key={track.id}
                    className="p-2 bg-[var(--bg-tertiary)] rounded-[var(--radius-md)]"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Music className="w-3 h-3 text-[var(--accent-success)]" />
                      <span className="text-xs text-[var(--text-primary)] truncate flex-1">
                        {track.name}
                      </span>
                      <IconButton
                        icon={track.muted ? <Volume2 className="w-3 h-3 opacity-50" /> : <Volume2 className="w-3 h-3" />}
                        size="sm"
                        variant={track.muted ? 'danger' : 'ghost'}
                        onClick={() => handleToggleMute(track.id)}
                      />
                    </div>
                    <Slider
                      value={track.volume}
                      onChange={(v) => {
                        setAudioTracks(
                          audioTracks.map((t) =>
                            t.id === track.id ? { ...t, volume: v } : t
                          )
                        );
                      }}
                      min={0}
                      max={1}
                      step={0.1}
                      size="sm"
                    />
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Upload className="w-3 h-3" />}
                  onClick={handleAddAudioTrack}
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
              muted={false}
              onToggleMute={() => {}}
            />
            {audioTracks.map((track) => (
              <TrackHeader
                key={track.id}
                type="audio"
                name={track.name}
                muted={track.muted}
                solo={track.solo}
                onToggleMute={() => handleToggleMute(track.id)}
                onToggleSolo={() => handleToggleSolo(track.id)}
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
                  const left = timeToPx(seg.start);
                  const width = timeToPx(seg.end) - left;
                  return (
                    <div
                      key={seg.id}
                      className="absolute top-1 bottom-1 rounded-[var(--radius-sm)] bg-[var(--accent-primary)]/30 border border-[var(--accent-primary)]/50"
                      style={{ left: `${left}px`, width: `${width}px` }}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] text-[var(--text-primary)] font-mono">
                        Scene {idx + 1}
                      </span>
                    </div>
                  );
                })}
              </div>

              <TitleTrack
                titles={titles}
                duration={duration}
                contentWidth={contentWidth}
                timeToPx={timeToPx}
                selectedId={selectedTitleId}
                onSelect={setSelectedTitleId}
              />

              <div className="h-12 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] relative">
                <div className="absolute inset-2 bg-[var(--accent-success)]/10 rounded-[var(--radius-sm)] border border-[var(--accent-success)]/20">
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] text-[var(--accent-success)]">
                    Original Audio
                  </span>
                </div>
              </div>

              {audioTracks.map((track) => (
                <div
                  key={track.id}
                  className="h-12 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] relative"
                >
                  <div
                    className="absolute top-1 bottom-1 rounded-[var(--radius-sm)] bg-[var(--accent-secondary)]/20 border border-[var(--accent-secondary)]/30"
                    style={{
                      left: `${timeToPx(track.startTime)}px`,
                      width: `${timeToPx(track.startTime + track.duration)}px`,
                    }}
                  >
                    <div className="h-full flex items-center px-2">
                      <span className="text-[10px] text-[var(--accent-secondary)] truncate">
                        {track.name}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white z-30 pointer-events-none shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                style={{ left: `${timeToPx(currentTime)}px` }}
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
