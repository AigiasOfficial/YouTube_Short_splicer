import React, { useEffect, useRef, useState, useCallback } from 'react';
import clsx from 'clsx';

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
    setActiveSegmentId
}) {
    const [thumbnails, setThumbnails] = useState([]);
    const containerRef = useRef(null);
    const isDragging = useRef(null); // 'start', 'end', 'move' or null
    const dragStartX = useRef(0);
    const initialSegmentState = useRef(null);

    // 1. Generate Thumbnails Asynchronously
    useEffect(() => {
        if (!videoSrc || !duration) {
            setThumbnails([]);
            return;
        }

        const video = document.createElement('video');
        video.src = videoSrc;
        video.crossOrigin = "anonymous";
        video.muted = true;
        video.preload = "metadata";

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = THUMBNAIL_WIDTH;
        canvas.height = THUMBNAIL_HEIGHT;

        const count = Math.ceil(duration / SECONDS_PER_THUMBNAIL);
        const newThumbs = [];
        let currentIndex = 0;

        const captureFrame = () => {
            if (currentIndex >= count) return;

            const time = currentIndex * SECONDS_PER_THUMBNAIL;
            video.currentTime = time;
        };

        video.onseeked = () => {
            ctx.drawImage(video, 0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
            
            newThumbs.push({
                id: currentIndex,
                time: currentIndex * SECONDS_PER_THUMBNAIL,
                url: canvas.toDataURL('image/jpeg', 0.5)
            });
            
            if (newThumbs.length % 5 === 0 || newThumbs.length === count) {
                setThumbnails([...newThumbs]);
            }

            currentIndex++;
            if (currentIndex < count) {
                setTimeout(captureFrame, 50); 
            }
        };

        video.onloadedmetadata = () => {
            captureFrame();
        };

        return () => {
            video.src = ""; // Cleanup
        };
    }, [videoSrc, duration]);


    // Helper: Time <-> Pixel conversion
    // We use a fixed width based on thumbnail count to allow scrolling
    const totalWidth = Math.max(thumbnails.length * THUMBNAIL_WIDTH, containerRef.current?.clientWidth || 0);
    
    const timeToPx = (time) => {
        if (!duration) return 0;
        return (time / duration) * totalWidth;
    };

    const pxToTime = (px) => {
        if (totalWidth === 0) return 0;
        return (px / totalWidth) * duration;
    };


    // Mouse Events for Dragging
    const handleMouseDown = (e, segment, type) => {
        e.stopPropagation();
        setActiveSegmentId(segment.id);
        isDragging.current = type;
        dragStartX.current = e.clientX;
        initialSegmentState.current = { ...segment };
    };

    const handleMouseMove = useCallback((e) => {
        if (!isDragging.current || !initialSegmentState.current) return;

        // Calculate delta time based on pixel movement
        const deltaX = e.clientX - dragStartX.current;
        const deltaTime = (deltaX / totalWidth) * duration;

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
            
            // Clamp end to duration
            if (newEnd > duration) {
                newEnd = duration;
                newStart = newEnd - segDuration;
            }
        }

        onUpdateSegment(seg.id, { start: newStart, end: newEnd });
    }, [duration, totalWidth, onUpdateSegment]);

    const handleMouseUp = useCallback(() => {
        isDragging.current = null;
        initialSegmentState.current = null;
    }, []);

    useEffect(() => {
        if (isDragging.current) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);


    return (
        <div 
            className="w-full h-32 bg-neutral-900 border-t border-neutral-800 overflow-x-auto overflow-y-hidden select-none relative custom-scrollbar"
            ref={containerRef}
            onClick={(e) => {
                const rect = containerRef.current.getBoundingClientRect();
                const clickX = e.clientX - rect.left + containerRef.current.scrollLeft;
                const t = pxToTime(clickX);
                onSeek(t);
            }}
        >
            {/* Filmstrip Container */}
            <div 
                className="relative h-full"
                style={{ width: `${Math.max(thumbnails.length * THUMBNAIL_WIDTH, 100)}px`, minWidth: '100%' }}
            >
                {/* Thumbnails Layer */}
                <div className="flex h-full absolute inset-0 opacity-50 pointer-events-none">
                    {thumbnails.map((thumb) => (
                        <div 
                            key={thumb.id}
                            style={{ width: THUMBNAIL_WIDTH, height: '100%' }}
                            className="shrink-0 border-r border-neutral-800 relative"
                        >
                            <img src={thumb.url} alt="" className="w-full h-full object-cover" />
                            <span className="absolute bottom-1 left-1 text-[10px] text-white/70 bg-black/40 px-1 rounded">
                                {Math.floor(thumb.time / 60)}:{String(Math.floor(thumb.time % 60)).padStart(2, '0')}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Playhead */}
                <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-white z-30 pointer-events-none shadow-[0_0_5px_rgba(255,255,255,0.5)]"
                    style={{ left: `${timeToPx(currentTime)}px` }}
                />

                {/* Segments Layer */}
                {segments.map((seg, idx) => {
                    const left = timeToPx(seg.start);
                    const width = Math.max(timeToPx(seg.end) - left, 4); // Min 4px width
                    const isActive = activeSegmentId === seg.id;

                    return (
                        <div
                            key={seg.id}
                            className={clsx(
                                "absolute top-4 bottom-4 z-20 rounded border group transition-colors cursor-pointer",
                                isActive 
                                    ? "bg-red-500/40 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]" 
                                    : "bg-blue-500/20 border-blue-400/50 hover:bg-blue-500/30"
                            )}
                            style={{ left: `${left}px`, width: `${width}px` }}
                            onMouseDown={(e) => handleMouseDown(e, seg, 'move')}
                        >
                            {/* Label */}
                            <div className="absolute -top-6 left-0 bg-neutral-800 text-white text-[10px] px-2 py-0.5 rounded border border-neutral-700 whitespace-nowrap z-30">
                                Scene {idx + 1}
                            </div>
                            
                            {/* Drag Handles */}
                            {isActive && (
                                <>
                                    <div 
                                        className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize bg-red-500/50 hover:bg-white/80 z-30 flex items-center justify-center"
                                        onMouseDown={(e) => handleMouseDown(e, seg, 'start')}
                                    >
                                        <div className="w-0.5 h-4 bg-white/50 rounded-full" />
                                    </div>
                                    <div 
                                        className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize bg-red-500/50 hover:bg-white/80 z-30 flex items-center justify-center"
                                        onMouseDown={(e) => handleMouseDown(e, seg, 'end')}
                                    >
                                        <div className="w-0.5 h-4 bg-white/50 rounded-full" />
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
