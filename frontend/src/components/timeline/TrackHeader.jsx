import { Video, Music, Type, Volume2, VolumeX } from 'lucide-react';
import { IconButton } from '../ui';

export function TrackHeader({
  type,
  name,
  muted,
  solo,
  onToggleMute,
  onToggleSolo,
}) {
  const icons = {
    video: Video,
    audio: Music,
    title: Type,
  };

  const Icon = icons[type] || Video;

  return (
    <div className="w-48 h-12 bg-[var(--bg-tertiary)] border-r border-b border-[var(--border-subtle)] flex items-center gap-2 px-3 shrink-0">
      <Icon className="w-4 h-4 text-[var(--text-muted)]" />
      <span className="text-xs font-medium text-[var(--text-secondary)] truncate flex-1">
        {name}
      </span>
      
      <div className="flex items-center gap-0.5">
        <IconButton
          icon={muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
          size="sm"
          variant={muted ? 'danger' : 'ghost'}
          onClick={onToggleMute}
          active={muted}
          tooltip={muted ? 'Unmute' : 'Mute'}
        />
        
        {onToggleSolo && (
          <IconButton
            icon={<span className="text-[10px] font-bold">S</span>}
            size="sm"
            variant={solo ? 'success' : 'ghost'}
            onClick={onToggleSolo}
            active={solo}
            tooltip="Solo"
          />
        )}
      </div>
    </div>
  );
}

export function VideoTrackHeader({ name, sceneCount }) {
  return (
    <div className="w-48 h-12 bg-[var(--bg-tertiary)] border-r border-b border-[var(--border-subtle)] flex items-center gap-2 px-3 shrink-0">
      <Video className="w-4 h-4 text-[var(--accent-primary)]" />
      <span className="text-xs font-medium text-[var(--text-primary)] truncate flex-1">
        {name}
      </span>
      <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded">
        {sceneCount} scenes
      </span>
    </div>
  );
}

export function TitleTrackHeader({ name, titleCount }) {
  return (
    <div className="w-48 h-12 bg-[var(--bg-tertiary)] border-r border-b border-[var(--border-subtle)] flex items-center gap-2 px-3 shrink-0">
      <Type className="w-4 h-4 text-[var(--accent-purple)]" />
      <span className="text-xs font-medium text-[var(--text-primary)] truncate flex-1">
        {name}
      </span>
      <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded">
        {titleCount} titles
      </span>
    </div>
  );
}
