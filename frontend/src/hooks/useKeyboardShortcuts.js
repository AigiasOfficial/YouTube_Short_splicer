import { useEffect, useCallback } from 'react';

const defaultShortcuts = {
  ' ': { action: 'playPause', description: 'Play/Pause' },
  ArrowLeft: { action: 'seekBack', value: -5, description: 'Seek back 5s' },
  ArrowRight: { action: 'seekForward', value: 5, description: 'Seek forward 5s' },
  j: { action: 'seekBack', value: -5, description: 'Seek back 5s' },
  l: { action: 'seekForward', value: 5, description: 'Seek forward 5s' },
  k: { action: 'playPause', description: 'Play/Pause' },
  i: { action: 'markIn', description: 'Mark In' },
  o: { action: 'markOut', description: 'Mark Out' },
  Delete: { action: 'delete', description: 'Delete active segment' },
  Backspace: { action: 'delete', description: 'Delete active segment' },
  Escape: { action: 'escape', description: 'Cancel/Deselect' },
};

export function useKeyboardShortcuts(handlers, enabled = true) {
  const handleKeyDown = useCallback(
    (e) => {
      if (!enabled) return;
      
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      const shortcut = defaultShortcuts[e.key];
      if (!shortcut) return;

      e.preventDefault();

      switch (shortcut.action) {
        case 'playPause':
          handlers.onPlayPause?.();
          break;
        case 'seekBack':
          handlers.onSeek?.(shortcut.value);
          break;
        case 'seekForward':
          handlers.onSeek?.(shortcut.value);
          break;
        case 'markIn':
          handlers.onMarkIn?.();
          break;
        case 'markOut':
          handlers.onMarkOut?.();
          break;
        case 'delete':
          handlers.onDelete?.();
          break;
        case 'escape':
          handlers.onEscape?.();
          break;
      }
    },
    [handlers, enabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { shortcuts: defaultShortcuts };
}
