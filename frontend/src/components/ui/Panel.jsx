import clsx from 'clsx';

export function Panel({ children, title, actions, className, padding = 'md', noBorder = false }) {
  const paddings = {
    none: '',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div
      className={clsx(
        'bg-[var(--bg-secondary)] rounded-[var(--radius-lg)]',
        !noBorder && 'border border-[var(--border-subtle)]',
        paddings[padding],
        className
      )}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
