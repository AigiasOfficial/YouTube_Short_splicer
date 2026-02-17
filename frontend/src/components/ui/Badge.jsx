import clsx from 'clsx';

const variants = {
  default: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]',
  primary: 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]',
  secondary: 'bg-[var(--accent-secondary)]/20 text-[var(--accent-secondary)]',
  success: 'bg-[var(--accent-success)]/20 text-[var(--accent-success)]',
  warning: 'bg-[var(--accent-warning)]/20 text-[var(--accent-warning)]',
  purple: 'bg-[var(--accent-purple)]/20 text-[var(--accent-purple)]',
};

const sizes = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-0.5 text-xs',
  lg: 'px-2.5 py-1 text-sm',
};

export function Badge({ children, variant = 'default', size = 'md', dot, className }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 font-medium rounded-[var(--radius-sm)]',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span
          className={clsx(
            'w-1.5 h-1.5 rounded-full',
            variant === 'primary' && 'bg-[var(--accent-primary)]',
            variant === 'success' && 'bg-[var(--accent-success)]',
            variant === 'warning' && 'bg-[var(--accent-warning)]',
            variant === 'secondary' && 'bg-[var(--accent-secondary)]',
            variant === 'default' && 'bg-[var(--text-muted)]'
          )}
        />
      )}
      {children}
    </span>
  );
}
