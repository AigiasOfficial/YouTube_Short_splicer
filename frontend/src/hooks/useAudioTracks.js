import { useState, useCallback } from 'react';

export function useAudioTracks() {
  const [audioTracks, setAudioTracks] = useState([
    {
      id: 'original',
      name: 'Original Audio',
      type: 'original',
      volume: 1,
      muted: false,
      solo: false,
    },
  ]);

  const addAudioTrack = useCallback((file, duration = 0) => {
    const newTrack = {
      id: Date.now(),
      name: file.name,
      type: 'custom',
      file,
      volume: 1,
      muted: false,
      solo: false,
      startTime: 0,
      duration,
    };
    setAudioTracks((prev) => [...prev, newTrack]);
    return newTrack;
  }, []);

  const updateAudioTrack = useCallback((id, updates) => {
    setAudioTracks((prev) =>
      prev.map((track) => (track.id === id ? { ...track, ...updates } : track))
    );
  }, []);

  const removeAudioTrack = useCallback((id) => {
    if (id === 'original') return;
    setAudioTracks((prev) => prev.filter((track) => track.id !== id));
  }, []);

  const toggleMute = useCallback((id) => {
    setAudioTracks((prev) =>
      prev.map((track) =>
        track.id === id ? { ...track, muted: !track.muted } : track
      )
    );
  }, []);

  const toggleSolo = useCallback((id) => {
    setAudioTracks((prev) =>
      prev.map((track) =>
        track.id === id ? { ...track, solo: !track.solo } : track
      )
    );
  }, []);

  const getAudioFilesForUpload = useCallback(() => {
    return audioTracks.filter((track) => track.type === 'custom' && track.file);
  }, [audioTracks]);

  const getAudioConfig = useCallback(() => {
    return audioTracks
      .filter((track) => track.type === 'custom')
      .map((track) => ({
        id: track.id,
        name: track.name,
        startTime: track.startTime,
        volume: track.volume,
        muted: track.muted,
        solo: track.solo,
      }));
  }, [audioTracks]);

  return {
    audioTracks,
    setAudioTracks,
    addAudioTrack,
    updateAudioTrack,
    removeAudioTrack,
    toggleMute,
    toggleSolo,
    getAudioFilesForUpload,
    getAudioConfig,
  };
}
