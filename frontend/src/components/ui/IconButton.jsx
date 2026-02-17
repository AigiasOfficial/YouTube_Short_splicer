import clsx from 'clsx';

const sizes = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
};

const variants = {
  default: 'bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
  primary: 'bg-[var(--accent-primary)]/20 hover:bg-[var(--accent-primary)]/30 text-[var(--accent-primary)]',
  success: 'bg-[var(--accent-success)]/20 hover:bg-[var(--accent-success)]/30 text-[var(--accent-success)]',
  danger: 'bg-red-500/20 hover:bg-red-500/30 text-red-400',
  ghost: 'bg-transparent hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]',
};

export function IconButton({
  icon,
  onClick,
  size = 'md',
  variant = 'default',
  disabled = false,
  active = false,
  tooltip,
  className,
  ...props
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={clsx(
        'inline-flex items-center justify-center rounded-[var(--radius-md)] transition-all duration-[var(--transition-fast)]',
        'focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-1 focus:ring-offset-[var(--bg-primary)]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'active:scale-95',
        sizes[size],
        variants[variant],
        active && 'bg-[var(--accent-primary)]/30 text-[var(--accent-primary)]',
        className
      )}
      {...props}
    >
      {icon}
    </button>
  );
}
