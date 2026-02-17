import clsx from 'clsx';
import { Type } from 'lucide-react';
import { titleAnimations } from '../../constants/animations';

export function TitleTrack({
  titles = [],
  timeToPx,
  onSelect,
  selectedId,
}) {
  return (
    <div className="h-12 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] relative">
      {titles.map((title) => {
        const left = timeToPx(title.startTime);
        const width = timeToPx(title.duration);
        const isActive = selectedId === title.id;
        const animation = titleAnimations.find((a) => a.id === title.animation);

        if (!title.visible) return null;

        return (
          <div
            key={title.id}
            className={clsx(
              'absolute top-1 bottom-1 rounded-[var(--radius-md)] cursor-pointer group transition-all',
              isActive
                ? 'bg-[var(--accent-purple)]/30 border border-[var(--accent-purple)]'
                : 'bg-[var(--accent-purple)]/20 border border-[var(--accent-purple)]/30 hover:bg-[var(--accent-purple)]/30'
            )}
            style={{ left: `${left}px`, width: `${Math.max(width, 20)}px` }}
            onClick={() => onSelect?.(title.id)}
          >
            <div className="flex items-center h-full px-2 gap-1 overflow-hidden">
              <Type className="w-3 h-3 text-[var(--accent-purple)] shrink-0" />
              <span className="text-[10px] text-[var(--text-secondary)] truncate font-mono">
                {title.text}
              </span>
            </div>

            {isActive && (
              <div className="absolute -bottom-5 left-0 right-0 flex items-center justify-center">
                <span className="text-[9px] text-[var(--accent-purple)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded">
                  {animation?.name || 'Fade'}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
