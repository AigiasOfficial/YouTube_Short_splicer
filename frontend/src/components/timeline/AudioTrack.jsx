import clsx from 'clsx';
import { Volume2 } from 'lucide-react';
import { Slider } from '../ui';

const WAVEFORM_BARS = 50;

export function AudioTrack({
  track,
  duration,
  contentWidth,
  timeToPx,
  onUpdate,
  isActive,
  onSelect,
}) {
  const left = timeToPx(track.startTime || 0);
  const trackDuration = track.duration || 10;
  const width = (trackDuration / duration) * contentWidth;

  return (
    <div
      className={clsx(
        'absolute top-1 bottom-1 rounded-[var(--radius-md)] cursor-move group transition-all',
        isActive
          ? 'bg-[var(--accent-success)]/30 border border-[var(--accent-success)]'
          : 'bg-[var(--accent-secondary)]/20 border border-[var(--accent-secondary)]/30 hover:bg-[var(--accent-secondary)]/30'
      )}
      style={{ left: `${left}px`, width: `${width}px` }}
      onClick={() => onSelect?.(track.id)}
    >
      <div className="flex items-center h-full px-2 gap-2">
        <Volume2 className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
        <div className="flex-1 h-4 bg-black/20 rounded overflow-hidden">
          <div className="h-full flex items-center gap-px px-1">
            {Array.from({ length: WAVEFORM_BARS }).map((_, i) => (
              <div
                key={i}
                className="w-0.5 bg-[var(--accent-success)]/60"
                style={{
                  height: `${30 + (i % 7) * 10}%`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {isActive && (
        <div className="absolute -bottom-6 left-0 right-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Slider
            value={track.volume}
            onChange={(v) => onUpdate?.(track.id, { volume: v })}
            min={0}
            max={1}
            step={0.1}
            showValue
            className="w-24"
          />
        </div>
      )}
    </div>
  );
}

export function AudioTrackLane({
  tracks,
  duration,
  contentWidth,
  timeToPx,
  onUpdateTrack,
  onSelectTrack,
  selectedTrackId,
}) {
  return (
    <div className="relative h-12 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
      {tracks.map((track) => (
        <AudioTrack
          key={track.id}
          track={track}
          duration={duration}
          contentWidth={contentWidth}
          timeToPx={timeToPx}
          onUpdate={onUpdateTrack}
          isActive={selectedTrackId === track.id}
          onSelect={onSelectTrack}
        />
      ))}
    </div>
  );
}
