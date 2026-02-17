import clsx from 'clsx';

export function Sidebar({ children, className }) {
  return (
    <aside
      className={clsx(
        'w-80 bg-[var(--bg-secondary)] border-r border-[var(--border-subtle)]',
        'flex flex-col shrink-0 z-20',
        className
      )}
    >
      {children}
    </aside>
  );
}

export function SidebarHeader({ children, title, icon: Icon }) {
  return (
    <div className="p-4 border-b border-[var(--border-subtle)]">
      {title && (
        <div className="flex items-center gap-2 mb-3">
          {Icon && <Icon className="w-4 h-4 text-[var(--accent-primary)]" />}
          <span className="text-sm font-semibold text-[var(--text-primary)]">{title}</span>
        </div>
      )}
      {children}
    </div>
  );
}

export function SidebarContent({ children, className }) {
  return (
    <div className={clsx('flex-1 overflow-y-auto p-4 space-y-3', className)}>
      {children}
    </div>
  );
}

export function SidebarFooter({ children }) {
  return (
    <div className="p-4 border-t border-[var(--border-subtle)] space-y-3">
      {children}
    </div>
  );
}
