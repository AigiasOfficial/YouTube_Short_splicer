import { useRef, useEffect, useState, useCallback } from 'react';
import clsx from 'clsx';

export function VideoPlayer({
  src,
  playing,
  onTimeUpdate,
  onDuration,
  onError,
  onEnded,
  previewMode = false,
  cropOffset = 0.5,
  containerHeight = 0,
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [, setDisplayedSize] = useState({ width: 0, height: 0, top: 0, left: 0 });

  useEffect(() => {
    if (!containerRef.current || !videoRef.current) return;

    const updateDimensions = () => {
      const video = videoRef.current;
      const container = containerRef.current;
      if (!video || !container) return;

      const videoRatio = (video.videoWidth || 16) / (video.videoHeight || 9);
      const containerRatio = container.clientWidth / container.clientHeight;

      let width, height, top, left;

      if (containerRatio > videoRatio) {
        height = container.clientHeight;
        width = height * videoRatio;
        top = 0;
        left = (container.clientWidth - width) / 2;
      } else {
        width = container.clientWidth;
        height = width / videoRatio;
        left = 0;
        top = (container.clientHeight - height) / 2;
      }

      setDisplayedSize({ width, height, top, left });
    };

    const observer = new ResizeObserver(updateDimensions);
    observer.observe(containerRef.current);
    window.addEventListener('resize', updateDimensions);
    updateDimensions();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, [src]);

  useEffect(() => {
    if (!videoRef.current) return;
    
    if (playing) {
      videoRef.current.play().catch(onError);
    } else {
      videoRef.current.pause();
    }
  }, [playing, onError]);

  const handleTimeUpdate = useCallback((e) => {
    onTimeUpdate?.(e.target.currentTime);
  }, [onTimeUpdate]);

  const handleLoadedMetadata = useCallback((e) => {
    onDuration?.(e.target.duration);
    if (containerRef.current) {
      containerRef.current.dispatchEvent(new Event('resize'));
    }
  }, [onDuration]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-black flex items-center justify-center overflow-hidden"
    >
      <video
        ref={videoRef}
        src={src}
        className={clsx(
          'w-full h-full',
          previewMode ? 'object-cover' : 'object-contain'
        )}
        style={previewMode ? {
          objectPosition: `${cropOffset * 100}% 50%`,
          maxWidth: `${containerHeight * (9/16)}px`,
        } : {}}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={onEnded}
        onError={onError}
        playsInline
      />
    </div>
  );
}
