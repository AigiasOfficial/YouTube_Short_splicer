import React, { useEffect, useRef, useState, useCallback } from 'react';
import clsx from 'clsx';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { IconButton } from '../ui';

const THUMBNAIL_WIDTH = 120;
const THUMBNAIL_HEIGHT = 68;
const SECONDS_PER_THUMBNAIL = 5;

export function Timeline({
  videoSrc,
  duration,
  segments,
  currentTime,
  onSeek,
  onUpdateSegment,
  activeSegmentId,
  setActiveSegmentId,
}) {
  const [thumbnails, setThumbnails] = useState([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const containerRef = useRef(null);
  const isDragging = useRef(null);
  const dragStartX = useRef(0);
  const scrollStartX = useRef(0);
  const initialSegmentState = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (!videoSrc || !duration) {
      setThumbnails([]);
      return;
    }

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';

    const canvas = document.createElement('canvas');
    canvas.width = THUMBNAIL_WIDTH;
    canvas.height = THUMBNAIL_HEIGHT;
    const ctx = canvas.getContext('2d');

    const count = Math.ceil(duration / SECONDS_PER_THUMBNAIL);
    const newThumbs = [];
    let currentIndex = 0;
    let timeoutId;

    const captureFrame = () => {
      if (currentIndex >= count || !isMounted.current) return;
      const time = currentIndex * SECONDS_PER_THUMBNAIL;
      video.currentTime = time;
    };

    video.onseeked = () => {
      if (!isMounted.current) return;
      ctx.drawImage(video, 0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

      try {
        const url = canvas.toDataURL('image/jpeg', 0.5);
        newThumbs.push({
          id: currentIndex,
          time: currentIndex * SECONDS_PER_THUMBNAIL,
          url,
        });
      } catch (e) {
        console.error('Failed to generate thumbnail:', e);
      }

      if (newThumbs.length % 5 === 0 || newThumbs.length === count) {
        if (isMounted.current) setThumbnails([...newThumbs]);
      }

      currentIndex++;
      if (currentIndex < count) {
        timeoutId = setTimeout(captureFrame, 50);
      }
    };

    video.onerror = (e) => console.error('Timeline video load error:', e);
    video.onloadedmetadata = () => captureFrame();
    video.src = videoSrc;
    video.load();

    return () => {
      video.src = '';
      clearTimeout(timeoutId);
    };
  }, [videoSrc, duration]);

  const currentThumbnailWidth = THUMBNAIL_WIDTH * zoomLevel;
  const contentWidth = Math.max(thumbnails.length * currentThumbnailWidth, containerRef.current?.clientWidth || 0);

  const timeToPx = (time) => {
    if (!duration) return 0;
    return (time / duration) * contentWidth;
  };

  const pxToTime = (px) => {
    if (contentWidth === 0) return 0;
    return (px / contentWidth) * duration;
  };

  const handleMouseDown = (e, segment, type) => {
    if (e.button === 0) {
      e.stopPropagation();
      if (type === 'bg') return;

      setActiveSegmentId(segment.id);
      isDragging.current = type;
      dragStartX.current = e.clientX;
      initialSegmentState.current = { ...segment };
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    isDragging.current = 'pan';
    dragStartX.current = e.clientX;
    scrollStartX.current = containerRef.current.scrollLeft;
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return;

    if (isDragging.current === 'pan') {
      const deltaX = e.clientX - dragStartX.current;
      containerRef.current.scrollLeft = scrollStartX.current - deltaX;
      return;
    }

    if (!initialSegmentState.current) return;

    const deltaX = e.clientX - dragStartX.current;
    const deltaTime = (deltaX / contentWidth) * duration;

    const seg = initialSegmentState.current;
    let newStart = seg.start;
    let newEnd = seg.end;

    if (isDragging.current === 'start') {
      newStart = Math.max(0, Math.min(seg.end - 0.5, seg.start + deltaTime));
    } else if (isDragging.current === 'end') {
      newEnd = Math.min(duration, Math.max(seg.start + 0.5, seg.end + deltaTime));
    } else if (isDragging.current === 'move') {
      const segDuration = seg.end - seg.start;
      newStart = Math.max(0, seg.start + deltaTime);
      newEnd = newStart + segDuration;

      if (newEnd > duration) {
        newEnd = duration;
        newStart = newEnd - segDuration;
      }
    }

    onUpdateSegment(seg.id, { start: newStart, end: newEnd });
  }, [duration, contentWidth, onUpdateSegment]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = null;
    initialSegmentState.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div className="relative">
      <div className="absolute right-4 bottom-full mb-2 flex items-center gap-1 bg-[var(--bg-tertiary)] rounded-[var(--radius-lg)] p-1 border border-[var(--border-subtle)] z-50 shadow-lg">
        <IconButton
          icon={<ZoomOut className="w-4 h-4" />}
          onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.5))}
          size="sm"
          variant="ghost"
          tooltip="Zoom Out"
        />
        <span className="text-[10px] w-10 text-center text-[var(--text-muted)] font-mono select-none">
          {Math.round(zoomLevel * 100)}%
        </span>
        <IconButton
          icon={<ZoomIn className="w-4 h-4" />}
          onClick={() => setZoomLevel(Math.min(5, zoomLevel + 0.5))}
          size="sm"
          variant="ghost"
          tooltip="Zoom In"
        />
        <div className="w-px h-4 bg-[var(--border-subtle)] mx-1" />
        <IconButton
          icon={<Maximize2 className="w-3 h-3" />}
          onClick={() => setZoomLevel(1)}
          size="sm"
          variant="ghost"
          tooltip="Reset Zoom"
        />
      </div>

      <div
        className="w-full h-36 bg-[var(--bg-primary)] border-t border-[var(--border-subtle)] overflow-x-auto overflow-y-hidden select-none relative cursor-crosshair"
        ref={containerRef}
        onContextMenu={handleContextMenu}
        onClick={(e) => {
          if (e.button === 0 && !isDragging.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const clickX = e.clientX - rect.left + containerRef.current.scrollLeft;
            const t = pxToTime(clickX);
            onSeek(t);
          }
        }}
      >
        <div
          className="relative h-full"
          style={{ width: `${Math.max(thumbnails.length * currentThumbnailWidth, 100)}px`, minWidth: '100%' }}
        >
          <div className="flex h-full absolute inset-0 opacity-40 pointer-events-none">
            {thumbnails.map((thumb) => (
              <div
                key={thumb.id}
                style={{ width: currentThumbnailWidth, height: '100%' }}
                className="shrink-0 border-r border-[var(--border-subtle)] relative bg-[var(--bg-tertiary)]"
              >
                <img src={thumb.url} alt="" className="w-full h-full object-cover" />
                <span className="absolute bottom-1 left-1 text-[10px] text-white/70 bg-black/40 px-1 rounded scale-75 origin-bottom-left">
                  {Math.floor(thumb.time / 60)}:{String(Math.floor(thumb.time % 60)).padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>

          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white z-30 pointer-events-none shadow-[0_0_8px_rgba(255,255,255,0.6)]"
            style={{ left: `${timeToPx(currentTime)}px` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg" />
          </div>

          {segments.map((seg, idx) => {
            const left = timeToPx(seg.start);
            const width = Math.max(timeToPx(seg.end) - left, 4);
            const isActive = activeSegmentId === seg.id;

            return (
              <div
                key={seg.id}
                className={clsx(
                  'absolute top-4 bottom-4 z-20 rounded-[var(--radius-md)] border group transition-all cursor-grab active:cursor-grabbing',
                  isActive
                    ? 'bg-[var(--accent-primary)]/30 border-[var(--accent-primary)] shadow-[var(--shadow-glow-red)]'
                    : 'bg-[var(--accent-secondary)]/20 border-[var(--accent-secondary)]/50 hover:bg-[var(--accent-secondary)]/30'
                )}
                style={{ left: `${left}px`, width: `${width}px` }}
                onMouseDown={(e) => handleMouseDown(e, seg, 'move')}
              >
                <div className="absolute -top-6 left-0 bg-[var(--bg-elevated)] text-[var(--text-primary)] text-[10px] px-2 py-0.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] whitespace-nowrap z-30 pointer-events-none font-mono">
                  Scene {idx + 1}
                  {seg.speed !== 1 && (
                    <span className="ml-1 text-[var(--accent-warning)]">{seg.speed}x</span>
                  )}
                </div>

                {isActive && (
                  <>
                    <div
                      className="absolute left-0 top-0 bottom-0 w-4 cursor-ew-resize bg-[var(--accent-primary)]/50 hover:bg-white/80 z-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-l-[var(--radius-md)]"
                      onMouseDown={(e) => handleMouseDown(e, seg, 'start')}
                    >
                      <div className="w-0.5 h-6 bg-white/50 rounded-full" />
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-4 cursor-ew-resize bg-[var(--accent-primary)]/50 hover:bg-white/80 z-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-r-[var(--radius-md)]"
                      onMouseDown={(e) => handleMouseDown(e, seg, 'end')}
                    >
                      <div className="w-0.5 h-6 bg-white/50 rounded-full" />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
