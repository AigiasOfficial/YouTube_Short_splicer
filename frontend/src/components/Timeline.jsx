import React, { useEffect, useRef, useState, useCallback } from 'react';
import clsx from 'clsx';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

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
    const [zoomLevel, setZoomLevel] = useState(1); // 1 = 100%
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const isDragging = useRef(null); // 'start', 'end', 'move', 'pan' or null
    const dragStartX = useRef(0);
    const scrollStartX = useRef(0);
    const initialSegmentState = useRef(null);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    // 1. Generate Thumbnails Asynchronously
    useEffect(() => {
        if (!videoSrc || !duration) {
            setThumbnails([]);
            return;
        }

        const video = document.createElement('video');
        // ... (setup) ...
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
            
            // Add error handling for canvas toDataURL
            try {
                const url = canvas.toDataURL('image/jpeg', 0.5);
                newThumbs.push({
                    id: currentIndex,
                    time: currentIndex * SECONDS_PER_THUMBNAIL,
                    url: url
                });
            } catch (e) {
                console.error("Failed to generate thumbnail:", e);
            }
            
            if (newThumbs.length % 5 === 0 || newThumbs.length === count) {
                if (isMounted.current) setThumbnails([...newThumbs]);
            }

            currentIndex++;
            if (currentIndex < count) {
                timeoutId = setTimeout(captureFrame, 50); 
            }
        };

        // Handle video loading errors
        video.onerror = (e) => {
            console.error("Timeline video load error:", e);
            // Try to continue anyway? Or abort.
        };

        video.onloadedmetadata = () => {
            captureFrame();
        };

        return () => {
            video.src = ""; 
            clearTimeout(timeoutId);
        };
    }, [videoSrc, duration]);


    // Helper: Time <-> Pixel conversion with Zoom
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


    // Mouse Events for Dragging
    const handleMouseDown = (e, segment, type) => {
        // Handle Left Click
        if (e.button === 0) {
            e.stopPropagation();
            if (type === 'bg') {
                // Seek logic handled by onClick
                return;
            }
            
            setActiveSegmentId(segment.id);
            isDragging.current = type;
            dragStartX.current = e.clientX;
            initialSegmentState.current = { ...segment };
        }
    };
    
    // Right Click Pan
    const handleContextMenu = (e) => {
        e.preventDefault(); // Prevent menu
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

        // Calculate delta time based on pixel movement
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
            
            // Clamp end to duration
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
        <div className="relative group/timeline">
            {/* Zoom Controls - Force visible with z-index and opacity */}
            <div className="absolute right-4 bottom-full mb-2 flex items-center gap-1 bg-black/90 rounded-lg p-1 border border-neutral-700 z-50 shadow-lg">
                <button 
                    onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.5))}
                    className="p-1 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white"
                    title="Zoom Out"
                >
                    <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[10px] w-8 text-center text-neutral-500 font-mono select-none">{Math.round(zoomLevel * 100)}%</span>
                <button 
                    onClick={() => setZoomLevel(Math.min(5, zoomLevel + 0.5))}
                    className="p-1 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white"
                    title="Zoom In"
                >
                    <ZoomIn className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-neutral-700 mx-1"></div>
                <button 
                    onClick={() => setZoomLevel(1)}
                    className="p-1 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white"
                    title="Reset Zoom"
                >
                    <Maximize2 className="w-3 h-3" />
                </button>
            </div>

            <div 
                className="w-full h-36 bg-neutral-900 border-t border-neutral-800 overflow-x-auto overflow-y-hidden select-none relative custom-scrollbar cursor-crosshair"
                ref={containerRef}
                onContextMenu={handleContextMenu}
                onClick={(e) => {
                    // Only seek if left click and not dragging
                    if (e.button === 0 && !isDragging.current) {
                        const rect = containerRef.current.getBoundingClientRect();
                        const clickX = e.clientX - rect.left + containerRef.current.scrollLeft;
                        const t = pxToTime(clickX);
                        onSeek(t);
                    }
                }}
            >
                {/* Filmstrip Container */}
                <div 
                    className="relative h-full"
                    style={{ width: `${Math.max(thumbnails.length * currentThumbnailWidth, 100)}px`, minWidth: '100%' }}
                >
                    {/* Thumbnails Layer */}
                    <div className="flex h-full absolute inset-0 opacity-50 pointer-events-none">
                        {thumbnails.map((thumb) => (
                            <div 
                                key={thumb.id}
                                style={{ width: currentThumbnailWidth, height: '100%' }}
                                className="shrink-0 border-r border-neutral-800 relative bg-black/20"
                            >
                                <img src={thumb.url} alt="" className="w-full h-full object-cover" />
                                <span className="absolute bottom-1 left-1 text-[10px] text-white/70 bg-black/40 px-1 rounded scale-75 origin-bottom-left">
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
                                    "absolute top-4 bottom-4 z-20 rounded border group transition-colors cursor-grab active:cursor-grabbing",
                                    isActive 
                                        ? "bg-red-500/40 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]" 
                                        : "bg-blue-500/20 border-blue-400/50 hover:bg-blue-500/30"
                                )}
                                style={{ left: `${left}px`, width: `${width}px` }}
                                onMouseDown={(e) => handleMouseDown(e, seg, 'move')}
                            >
                                {/* Label */}
                                <div className="absolute -top-6 left-0 bg-neutral-800 text-white text-[10px] px-2 py-0.5 rounded border border-neutral-700 whitespace-nowrap z-30 pointer-events-none">
                                    Scene {idx + 1}
                                </div>
                                
                                {/* Drag Handles */}
                                {isActive && (
                                    <>
                                        <div 
                                            className="absolute left-0 top-0 bottom-0 w-4 cursor-ew-resize bg-red-500/50 hover:bg-white/80 z-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            onMouseDown={(e) => handleMouseDown(e, seg, 'start')}
                                        >
                                            <div className="w-0.5 h-6 bg-white/50 rounded-full" />
                                        </div>
                                        <div 
                                            className="absolute right-0 top-0 bottom-0 w-4 cursor-ew-resize bg-red-500/50 hover:bg-white/80 z-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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
