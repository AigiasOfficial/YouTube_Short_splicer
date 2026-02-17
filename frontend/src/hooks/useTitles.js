import { useState, useCallback } from 'react';

export function useTitles(initialTitles = []) {
  const [titles, setTitles] = useState(initialTitles);
  const [selectedTitleId, setSelectedTitleId] = useState(null);

  const addTitle = useCallback((titleData = {}) => {
    const newTitle = {
      id: Date.now(),
      text: titleData.text || 'New Title',
      startTime: titleData.startTime || 0,
      duration: titleData.duration || 2,
      animation: titleData.animation || 'fade',
      fontSize: titleData.fontSize || 48,
      position: titleData.position || 'center',
      visible: true,
    };
    setTitles((prev) => [...prev, newTitle]);
    setSelectedTitleId(newTitle.id);
    return newTitle;
  }, []);

  const updateTitle = useCallback((id, updates) => {
    setTitles((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  }, []);

  const deleteTitle = useCallback((id) => {
    setTitles((prev) => prev.filter((t) => t.id !== id));
    if (selectedTitleId === id) {
      setSelectedTitleId(null);
    }
  }, [selectedTitleId]);

  const toggleTitleVisibility = useCallback((id) => {
    setTitles((prev) =>
      prev.map((t) => (t.id === id ? { ...t, visible: !t.visible } : t))
    );
  }, []);

  const clearTitles = useCallback(() => {
    setTitles([]);
    setSelectedTitleId(null);
  }, []);

  const selectedTitle = titles.find((t) => t.id === selectedTitleId);

  return {
    titles,
    setTitles,
    selectedTitleId,
    setSelectedTitleId,
    selectedTitle,
    addTitle,
    updateTitle,
    deleteTitle,
    toggleTitleVisibility,
    clearTitles,
  };
}
