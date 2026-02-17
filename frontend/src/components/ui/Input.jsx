import clsx from 'clsx';
import { forwardRef } from 'react';

export const Input = forwardRef(function Input(
  {
    label,
    error,
    icon,
    iconPosition = 'left',
    size = 'md',
    className,
    ...props
  },
  ref
) {
  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2.5 text-base',
  };

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && iconPosition === 'left' && (
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={clsx(
            'w-full bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-[var(--radius-md)]',
            'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
            'focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]',
            'transition-all duration-[var(--transition-fast)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            sizes[size],
            icon && iconPosition === 'left' && 'pl-8',
            icon && iconPosition === 'right' && 'pr-8',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
        {icon && iconPosition === 'right' && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
            {icon}
          </span>
        )}
      </div>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
});
