import { useMemo } from 'react';
import clsx from 'clsx';
import { Trash2, Crop, Repeat, Play, Pause, Gauge, Type } from 'lucide-react';
import { IconButton, Badge } from '../ui';

const SPEED_PRESETS = [0.5, 1, 1.5, 2, 3];

export function SegmentItem({
  segment,
  idx,
  isActive,
  onSelect,
  onDelete,
  onUpdate,
  onResetCrop,
  onLoop,
  isLooping,
}) {
  const startVal = useMemo(() => segment.start.toFixed(2), [segment.start]);
  const endVal = useMemo(() => segment.end.toFixed(2), [segment.end]);
  const durationVal = useMemo(() => (segment.end - segment.start).toFixed(2), [segment.start, segment.end]);

  const handleStartChange = (e) => {
    const num = parseFloat(e.target.value);
    if (!isNaN(num) && num >= 0 && num < segment.end) {
      onUpdate(segment.id, { start: num });
    }
  };

  const handleEndChange = (e) => {
    const num = parseFloat(e.target.value);
    if (!isNaN(num) && num > segment.start) {
      onUpdate(segment.id, { end: num });
    }
  };

  const handleDurationChange = (e) => {
    const num = parseFloat(e.target.value);
    if (!isNaN(num) && num > 0) {
      onUpdate(segment.id, { end: segment.start + num });
    }
  };

  return (
    <div
      onClick={() => onSelect(segment.id, segment.start)}
      className={clsx(
        'p-3 rounded-[var(--radius-lg)] flex flex-col gap-2 cursor-pointer transition-all border',
        isActive
          ? 'bg-[var(--bg-tertiary)] border-[var(--accent-primary)]/50 shadow-[var(--shadow-md)]'
          : 'bg-[var(--bg-tertiary)]/50 border-transparent hover:bg-[var(--bg-tertiary)] hover:border-[var(--border-default)]'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={clsx(
            'text-xs font-bold font-mono',
            isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'
          )}>
            Scene {idx + 1}
          </span>
          {segment.speed !== 1 && (
            <Badge variant="warning" size="sm">
              {segment.speed}x
            </Badge>
          )}
          {segment.title && (
            <Badge variant="purple" size="sm" icon={<Type className="w-2.5 h-2.5" />}>
              Title
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-0.5">
          <IconButton
            icon={isLooping ? <Pause className="w-3 h-3" /> : <Repeat className="w-3 h-3" />}
            size="sm"
            variant={isLooping ? 'success' : 'ghost'}
            onClick={(e) => {
              e.stopPropagation();
              onLoop(segment.id);
            }}
            active={isLooping}
            tooltip={isLooping ? 'Stop Loop' : 'Loop Scene'}
          />
          
          <IconButton
            icon={<Gauge className="w-3 h-3" />}
            size="sm"
            variant={segment.speed !== 1 ? 'primary' : 'ghost'}
            active={segment.speed !== 1}
            tooltip="Speed"
          />
          
          <select
            value={segment.speed || 1}
            onChange={(e) => {
              e.stopPropagation();
              onUpdate(segment.id, { speed: parseFloat(e.target.value) });
            }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-1 py-0.5 text-xs text-[var(--text-secondary)] outline-none cursor-pointer"
          >
            {SPEED_PRESETS.map((s) => (
              <option key={s} value={s}>{s}x</option>
            ))}
          </select>
          
          <IconButton
            icon={<Trash2 className="w-3 h-3" />}
            size="sm"
            variant="danger"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(segment.id);
            }}
            tooltip="Delete"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Start</label>
          <input
            type="text"
            value={startVal}
            onChange={handleStartChange}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-2 py-1 text-xs font-mono text-[var(--accent-success)] focus:border-[var(--accent-success)] outline-none transition-colors text-center"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">End</label>
          <input
            type="text"
            value={endVal}
            onChange={handleEndChange}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-2 py-1 text-xs font-mono text-[var(--accent-primary)] focus:border-[var(--accent-primary)] outline-none transition-colors text-center"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Dur</label>
          <input
            type="text"
            value={durationVal}
            onChange={handleDurationChange}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-2 py-1 text-xs font-mono text-[var(--accent-secondary)] focus:border-[var(--accent-secondary)] outline-none transition-colors text-center"
          />
        </div>
      </div>

      {isActive && (
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] bg-[var(--bg-primary)] p-2 rounded-[var(--radius-sm)] mt-1">
          <Crop className="w-3 h-3" />
          <span>Crop: {(segment.cropOffset * 100).toFixed(0)}%</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onResetCrop(segment.id);
            }}
            className="ml-auto text-[var(--accent-secondary)] hover:text-[var(--accent-secondary-hover)] text-[10px] underline"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}

export function SegmentList({
  segments,
  activeSegmentId,
  onSelect,
  onDelete,
  onUpdate,
  onResetCrop,
  onLoop,
  loopingSegmentId,
}) {
  if (segments.length === 0) {
    return (
      <div className="text-center text-[var(--text-muted)] py-8">
        <p className="text-sm">No scenes yet</p>
        <p className="text-xs mt-1">Use Mark In / Mark Out to create scenes</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {segments.map((seg, idx) => (
        <SegmentItem
          key={seg.id}
          segment={seg}
          idx={idx}
          isActive={activeSegmentId === seg.id}
          onSelect={onSelect}
          onDelete={onDelete}
          onUpdate={onUpdate}
          onResetCrop={onResetCrop}
          onLoop={onLoop}
          isLooping={loopingSegmentId === seg.id}
        />
      ))}
    </div>
  );
}
