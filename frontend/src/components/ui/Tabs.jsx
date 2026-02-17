import clsx from 'clsx';

export function Tabs({ tabs, activeTab, onChange, className }) {
  return (
    <div className={clsx('flex items-center gap-1 bg-[var(--bg-tertiary)] p-1 rounded-[var(--radius-lg)]', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] transition-all duration-[var(--transition-fast)]',
            activeTab === tab.id
              ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
          )}
        >
          {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
