import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { Trash2, Crop, Repeat, Play, Pause } from 'lucide-react';

export function SegmentItem({ 
    segment, 
    idx, 
    isActive, 
    onSelect, 
    onDelete, 
    onUpdate, 
    onResetCrop,
    onLoop,
    isLooping
}) {
    // Local state for inputs to allow typing without jitter
    const [startVal, setStartVal] = useState(segment.start.toFixed(2));
    const [endVal, setEndVal] = useState(segment.end.toFixed(2));
    const [durationVal, setDurationVal] = useState((segment.end - segment.start).toFixed(2));

    // Update local state when prop changes (external update like dragging)
    useEffect(() => {
        setStartVal(segment.start.toFixed(2));
        setEndVal(segment.end.toFixed(2));
        setDurationVal((segment.end - segment.start).toFixed(2));
    }, [segment.start, segment.end]);

    const handleStartChange = (e) => {
        const val = e.target.value;
        setStartVal(val);
        const num = parseFloat(val);
        if (!isNaN(num) && num >= 0 && num < segment.end) {
            onUpdate(segment.id, { start: num });
        }
    };

    const handleEndChange = (e) => {
        const val = e.target.value;
        setEndVal(val);
        const num = parseFloat(val);
        if (!isNaN(num) && num > segment.start) {
            onUpdate(segment.id, { end: num });
        }
    };

    const handleDurationChange = (e) => {
        const val = e.target.value;
        setDurationVal(val);
        const num = parseFloat(val);
        if (!isNaN(num) && num > 0) {
            onUpdate(segment.id, { end: segment.start + num });
        }
    };

    return (
        <div 
            onClick={() => onSelect(segment.id, segment.start)}
            className={clsx(
                "p-3 rounded-lg flex flex-col gap-2 cursor-pointer transition-all border",
                isActive 
                    ? "bg-neutral-700 border-red-500/50 shadow-md shadow-black/20" 
                    : "bg-neutral-700/50 border-transparent hover:bg-neutral-700 hover:border-neutral-600"
            )}
        >
            <div className="flex items-center justify-between">
                <span className={clsx("text-xs font-bold font-mono", isActive ? "text-red-400" : "text-neutral-400")}>
                    Scene {idx + 1}
                </span>
                <div className="flex items-center gap-1">
                    {/* Loop Toggle */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onLoop(segment.id);
                        }}
                        className={clsx(
                            "p-1 rounded transition-colors",
                            isLooping 
                                ? "bg-green-500/20 text-green-400 hover:bg-green-500/30" 
                                : "text-neutral-500 hover:text-green-400 hover:bg-neutral-600"
                        )}
                        title="Loop Scene"
                    >
                        {isLooping ? <Pause className="w-3 h-3" /> : <Repeat className="w-3 h-3" />}
                    </button>
                    
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(segment.id);
                        }}
                        className="text-neutral-500 hover:text-red-500 p-1 rounded hover:bg-neutral-600 transition-colors"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Editable Time Inputs */}
            <div className="grid grid-cols-3 gap-2 mt-1">
                <div className="flex flex-col gap-0.5">
                    <label className="text-[9px] text-neutral-500 uppercase tracking-wider font-semibold">Start</label>
                    <input 
                        type="text" 
                        value={startVal}
                        onChange={handleStartChange}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-black/30 border border-neutral-600 rounded px-1 py-0.5 text-xs font-mono text-green-400 focus:border-green-500 outline-none transition-colors text-center"
                    />
                </div>
                <div className="flex flex-col gap-0.5">
                    <label className="text-[9px] text-neutral-500 uppercase tracking-wider font-semibold">End</label>
                    <input 
                        type="text" 
                        value={endVal}
                        onChange={handleEndChange}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-black/30 border border-neutral-600 rounded px-1 py-0.5 text-xs font-mono text-red-400 focus:border-red-500 outline-none transition-colors text-center"
                    />
                </div>
                <div className="flex flex-col gap-0.5">
                    <label className="text-[9px] text-neutral-500 uppercase tracking-wider font-semibold">Dur (s)</label>
                    <input 
                        type="text" 
                        value={durationVal}
                        onChange={handleDurationChange}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-black/30 border border-neutral-600 rounded px-1 py-0.5 text-xs font-mono text-blue-400 focus:border-blue-500 outline-none transition-colors text-center"
                    />
                </div>
            </div>

            {/* Crop indicator */}
            {isActive && (
                <div className="flex items-center gap-2 text-xs text-neutral-400 bg-black/20 p-1 rounded mt-2">
                    <Crop className="w-3 h-3" />
                    <span>Offset: {(segment.cropOffset * 100).toFixed(0)}%</span>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onResetCrop(segment.id);
                        }}
                        className="ml-auto text-blue-400 hover:text-blue-300 text-[10px] underline"
                    >
                        Reset Center
                    </button>
                </div>
            )}
        </div>
    );
}
