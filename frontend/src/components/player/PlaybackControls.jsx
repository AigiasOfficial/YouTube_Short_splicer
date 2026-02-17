import { Play, Pause, Plus, Clock } from 'lucide-react';
import { Button, IconButton } from '../ui';

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function PlaybackControls({
  playing,
  currentTime,
  duration,
  onPlayPause,
  onMarkIn,
  onMarkOut,
  markStart,
  previewing,
  disabled = false,
}) {
  const canMarkOut = markStart !== null && !previewing;
  const canMarkIn = markStart === null && !previewing;

  return (
    <div className="h-16 bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)] px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <IconButton
          icon={playing ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          onClick={onPlayPause}
          size="lg"
          variant="default"
          className="bg-white text-black hover:bg-neutral-200 shadow-lg shadow-white/10"
          disabled={disabled}
        />

        <div className="flex items-center gap-2 text-sm font-mono bg-[var(--bg-tertiary)] px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
          <span className="text-[var(--text-primary)] font-semibold">{formatTime(currentTime)}</span>
          <span className="text-[var(--text-muted)]">/</span>
          <span className="text-[var(--text-secondary)]">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={onMarkIn}
          disabled={!canMarkIn || disabled}
          className={!canMarkIn ? 'opacity-50' : ''}
        >
          Mark In
        </Button>

        <Button
          variant="primary"
          size="md"
          icon={<Clock className="w-4 h-4" />}
          onClick={onMarkOut}
          disabled={!canMarkOut || disabled}
        >
          Mark Out
        </Button>
      </div>
    </div>
  );
}
