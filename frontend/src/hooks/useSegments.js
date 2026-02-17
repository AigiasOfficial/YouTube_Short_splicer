import { useState, useCallback } from 'react';

export function useSegments(initialSegments = []) {
  const [segments, setSegments] = useState(initialSegments);
  const [activeSegmentId, setActiveSegmentId] = useState(null);

  const addSegment = useCallback((start, end, cropOffset = 0.5) => {
    const newSegment = {
      id: Date.now(),
      start,
      end,
      cropOffset,
      speed: 1,
      title: null,
    };
    setSegments((prev) => [...prev, newSegment]);
    setActiveSegmentId(newSegment.id);
    return newSegment;
  }, []);

  const updateSegment = useCallback((id, updates) => {
    setSegments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  }, []);

  const deleteSegment = useCallback((id) => {
    setSegments((prev) => prev.filter((s) => s.id !== id));
    if (activeSegmentId === id) {
      setActiveSegmentId(null);
    }
  }, [activeSegmentId]);

  const reorderSegments = useCallback((fromIndex, toIndex) => {
    setSegments((prev) => {
      const result = Array.from(prev);
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      return result;
    });
  }, []);

  const clearSegments = useCallback(() => {
    setSegments([]);
    setActiveSegmentId(null);
  }, []);

  const activeSegment = segments.find((s) => s.id === activeSegmentId);

  return {
    segments,
    setSegments,
    activeSegmentId,
    setActiveSegmentId,
    activeSegment,
    addSegment,
    updateSegment,
    deleteSegment,
    reorderSegments,
    clearSegments,
  };
}
