import clsx from 'clsx';
import { Type, Sparkles, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button, Input, IconButton, Panel, Slider } from '../ui';
import { titleAnimations } from '../../constants/animations';
import { useState } from 'react';

export function TitleEditor({ title, onUpdate, onClose }) {
  const [text, setText] = useState(title?.text || '');
  const [animation, setAnimation] = useState(title?.animation || 'fade');
  const [fontSize, setFontSize] = useState(title?.fontSize || 48);
  const [position, setPosition] = useState(title?.position || 'center');

  const handleSave = () => {
    onUpdate?.({
      ...title,
      text,
      animation,
      fontSize,
      position,
    });
  };

  return (
    <Panel title="Edit Title" className="w-80">
      <div className="space-y-4">
        <Input
          label="Title Text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter title..."
        />

        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">
            Animation
          </label>
          <div className="grid grid-cols-2 gap-2">
            {titleAnimations.slice(0, 6).map((anim) => (
              <button
                key={anim.id}
                onClick={() => setAnimation(anim.id)}
                className={clsx(
                  'px-2 py-1.5 text-xs rounded-[var(--radius-md)] border transition-all text-left',
                  animation === anim.id
                    ? 'bg-[var(--accent-purple)]/20 border-[var(--accent-purple)] text-[var(--accent-purple)]'
                    : 'bg-[var(--bg-tertiary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-default)]'
                )}
              >
                {anim.name}
              </button>
            ))}
          </div>
        </div>

        <Slider
          label="Font Size"
          value={fontSize}
          onChange={setFontSize}
          min={24}
          max={120}
          step={4}
          unit="px"
        />

        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">
            Position
          </label>
          <div className="grid grid-cols-3 gap-2">
            {['top', 'center', 'bottom'].map((pos) => (
              <button
                key={pos}
                onClick={() => setPosition(pos)}
                className={clsx(
                  'px-2 py-1.5 text-xs rounded-[var(--radius-md)] border transition-all capitalize',
                  position === pos
                    ? 'bg-[var(--accent-primary)]/20 border-[var(--accent-primary)] text-[var(--accent-primary)]'
                    : 'bg-[var(--bg-tertiary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-default)]'
                )}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-[var(--border-subtle)]">
          <Button variant="secondary" size="sm" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} className="flex-1">
            Save
          </Button>
        </div>
      </div>
    </Panel>
  );
}

export function TitleCard({ title, onEdit, onDelete, onToggleVisibility }) {
  const animation = titleAnimations.find((a) => a.id === title.animation);

  return (
    <div className="flex items-center gap-2 p-2 bg-[var(--bg-tertiary)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
      <Type className="w-4 h-4 text-[var(--accent-purple)] shrink-0" />
      
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-[var(--text-primary)] truncate">
          {title.text || 'Untitled'}
        </div>
        <div className="text-[10px] text-[var(--text-muted)]">
          {animation?.name} • {title.fontSize}px
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        <IconButton
          icon={title.visible !== false ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          size="sm"
          variant={title.visible !== false ? 'ghost' : 'ghost'}
          onClick={() => onToggleVisibility?.(title.id)}
          tooltip={title.visible !== false ? 'Hide' : 'Show'}
        />
        <IconButton
          icon={<Sparkles className="w-3 h-3" />}
          size="sm"
          variant="ghost"
          onClick={() => onEdit?.(title)}
          tooltip="Edit"
        />
        <IconButton
          icon={<Trash2 className="w-3 h-3" />}
          size="sm"
          variant="danger"
          onClick={() => onDelete?.(title.id)}
          tooltip="Delete"
        />
      </div>
    </div>
  );
}

export function TitlePreview({ title }) {
  if (!title || title.visible === false) return null;

  const positionStyles = {
    top: { top: '15%' },
    center: { top: '50%', transform: 'translateY(-50%)' },
    bottom: { bottom: '15%' },
  };

  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none text-center px-4"
      style={positionStyles[title.position]}
    >
      <div
        className="inline-block px-4 py-2 bg-black/60 backdrop-blur-sm rounded-lg"
        style={{ fontSize: `${title.fontSize}px` }}
      >
        <span className="text-white font-bold drop-shadow-lg">
          {title.text}
        </span>
      </div>
    </div>
  );
}
