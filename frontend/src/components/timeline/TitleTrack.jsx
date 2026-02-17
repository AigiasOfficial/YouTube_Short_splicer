import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { Type } from 'lucide-react';

export function TitleTrack({
  titles = [],
  timeToPx,
  pxToTime,
  onSelect,
  onUpdate,
  selectedId,
}) {
  const [dragging, setDragging] = useState(null);
  const [dragType, setDragType] = useState(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragging || !pxToTime) return;
      const timeline = document.querySelector('.flex-1.overflow-x-auto');
      if (!timeline) return;
      const rect = timeline.getBoundingClientRect();
      const scrollLeft = timeline.scrollLeft;
      const x = e.clientX - rect.left + scrollLeft;
      const time = pxToTime(x);
      
      const title = titles.find(t => t.id === dragging);
      if (!title) return;

      if (dragType === 'move') {
        const newStartTime = Math.max(0, time - title.duration / 2);
        onUpdate(dragging, { startTime: newStartTime });
      } else if (dragType === 'resize-left') {
        const newDuration = (title.startTime + title.duration) - time;
        const newStartTime = Math.max(0, time);
        if (newDuration > 0.5) {
          onUpdate(dragging, { startTime: newStartTime, duration: newDuration });
        }
      } else if (dragType === 'resize-right') {
        const newDuration = Math.max(0.5, time - title.startTime);
        onUpdate(dragging, { duration: newDuration });
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
      setDragType(null);
    };

    if (dragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, dragType, titles, pxToTime, onUpdate]);

  const handleDragStart = (id, type, e) => {
    e.stopPropagation();
    e.preventDefault();
    setDragging(id);
    setDragType(type);
  };

  return (
    <div className="h-12 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] relative">
      {titles.map((title) => {
        const left = timeToPx(title.startTime);
        const width = timeToPx(title.duration);
        const isActive = selectedId === title.id;

        if (!title.visible) return null;

        return (
          <div
            key={title.id}
            className={clsx(
              'absolute top-1 bottom-1 rounded-[var(--radius-md)] cursor-move group transition-all',
              isActive
                ? 'bg-[var(--accent-purple)]/30 border-2 border-[var(--accent-purple)] z-10'
                : 'bg-[var(--accent-purple)]/20 border border-[var(--accent-purple)]/30 hover:bg-[var(--accent-purple)]/30 hover:border-[var(--accent-purple)]/50'
            )}
            style={{ left: `${left}px`, width: `${Math.max(width, 30)}px` }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(title.id);
            }}
            onMouseDown={(e) => handleDragStart(title.id, 'move', e)}
          >
            <div
              className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize bg-[var(--accent-purple)]/50 hover:bg-[var(--accent-purple)] rounded-l-md opacity-0 group-hover:opacity-100 transition-opacity"
              onMouseDown={(e) => handleDragStart(title.id, 'resize-left', e)}
            />
            <div className="flex items-center h-full px-2 gap-1 overflow-hidden">
              <Type className="w-3 h-3 text-[var(--accent-purple)] shrink-0" />
              <span className="text-[10px] text-[var(--text-secondary)] truncate font-mono">
                {title.text}
              </span>
            </div>
            <div
              className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize bg-[var(--accent-purple)]/50 hover:bg-[var(--accent-purple)] rounded-r-md opacity-0 group-hover:opacity-100 transition-opacity"
              onMouseDown={(e) => handleDragStart(title.id, 'resize-right', e)}
            />

            {isActive && (
              <div className="absolute -bottom-5 left-0 right-0 flex items-center justify-center">
                <span className="text-[9px] text-[var(--accent-purple)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded">
                  {title.duration?.toFixed(1) || '2.0'}s
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
