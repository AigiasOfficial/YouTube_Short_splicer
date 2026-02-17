import { Scissors, Film, Layers } from 'lucide-react';
import { Tabs } from '../ui';

export function Header({ activeTab, onTabChange, children }) {
  const tabs = [
    { id: 'clip', label: 'Clip Editor', icon: <Film className="w-4 h-4" /> },
    { id: 'studio', label: 'Studio', icon: <Layers className="w-4 h-4" /> },
  ];

  return (
    <header className="h-14 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] flex items-center justify-between px-4 shrink-0 z-30">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)] flex items-center justify-center">
            <Scissors className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold text-[var(--text-primary)] tracking-tight">
            Short Splicer
          </span>
        </div>
        
        <Tabs tabs={tabs} activeTab={activeTab} onChange={onTabChange} />
      </div>
      
      <div className="flex items-center gap-3">
        {children}
      </div>
    </header>
  );
}
