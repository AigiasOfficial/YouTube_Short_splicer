import { Crop } from 'lucide-react';

export function CropOverlay({
  displayedSize,
  cropOffset,
  onCropChange,
  visible = true,
  active = true,
}) {
  if (!visible || displayedSize.width === 0) return null;

  const cropWidth = displayedSize.height * (9 / 16);
  const maxOffsetPx = displayedSize.width - cropWidth;
  const cropLeft = maxOffsetPx * cropOffset;

  const handleMouseDown = (e) => {
    if (!active) return;
    e.stopPropagation();

    const onMove = (moveEvent) => {
      const clientX = moveEvent.clientX;
      const videoLeft = displayedSize.left;
      
      let relativeX = clientX - videoLeft - (cropWidth / 2);
      relativeX = Math.max(0, Math.min(relativeX, maxOffsetPx));
      
      const newOffset = maxOffsetPx > 0 ? relativeX / maxOffsetPx : 0.5;
      onCropChange?.(newOffset);
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div
      className="absolute z-10 pointer-events-auto cursor-ew-resize group"
      style={{
        top: displayedSize.top,
        left: displayedSize.left,
        width: displayedSize.width,
        height: displayedSize.height,
      }}
      onMouseDown={handleMouseDown}
    >
      <div
        className="absolute h-full border-2 border-[var(--accent-primary)] shadow-[0_0_0_9999px_rgba(0,0,0,0.75)]"
        style={{
          width: `${cropWidth}px`,
          left: `${cropLeft}px`,
        }}
      >
        <div className="absolute top-0 left-1/3 w-px h-full bg-white/30" />
        <div className="absolute top-0 right-1/3 w-px h-full bg-white/30" />
        <div className="absolute top-1/3 left-0 w-full h-px bg-white/30" />
        <div className="absolute top-2/3 left-0 w-full h-px bg-white/30" />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--accent-primary)] text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-bold tracking-wide shadow-md flex items-center gap-1">
          <Crop className="w-3 h-3" />
          DRAG TO CROP
        </div>
      </div>
    </div>
  );
}
