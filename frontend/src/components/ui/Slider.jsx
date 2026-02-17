import clsx from 'clsx';
import { forwardRef } from 'react';

export const Slider = forwardRef(function Slider(
  {
    label,
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    showValue = true,
    unit = '',
    className,
    ...props
  },
  ref
) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && (
            <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">
              {label}
            </label>
          )}
          {showValue && (
            <span className="text-xs font-mono text-[var(--text-secondary)]">
              {value}
              {unit}
            </span>
          )}
        </div>
      )}
      <div className="relative">
        <div className="h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--accent-primary)] rounded-full transition-all duration-75"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange?.(parseFloat(e.target.value))}
          className={clsx(
            'absolute inset-0 w-full h-full opacity-0 cursor-pointer',
            'appearance-none'
          )}
          {...props}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md pointer-events-none transition-all duration-75"
          style={{ left: `calc(${percentage}% - 7px)` }}
        />
      </div>
    </div>
  );
});
