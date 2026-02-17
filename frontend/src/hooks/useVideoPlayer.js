import { useState, useCallback, useRef } from 'react';

export function useVideoPlayer(options = {}) {
  const { initialPlaying = false, initialTime = 0 } = options;
  
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(initialPlaying);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const play = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.play().catch((e) => {
        setError(e.message);
      });
      setPlaying(true);
    }
  }, []);

  const pause = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      setPlaying(false);
    }
  }, []);

  const toggle = useCallback(() => {
    if (playing) {
      pause();
    } else {
      play();
    }
  }, [playing, play, pause]);

  const seekTo = useCallback((time) => {
    if (videoRef.current) {
      const clampedTime = Math.max(0, Math.min(duration, time));
      videoRef.current.currentTime = clampedTime;
      setCurrentTime(clampedTime);
    }
  }, [duration]);

  const seekRelative = useCallback((delta) => {
    seekTo(currentTime + delta);
  }, [currentTime, seekTo]);

  const changeVolume = useCallback((newVolume) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !muted;
      setMuted(!muted);
    }
  }, [muted]);

  const changePlaybackRate = useCallback((rate) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  }, []);

  const onTimeUpdate = useCallback((e) => {
    setCurrentTime(e.target.currentTime);
  }, []);

  const onLoadedMetadata = useCallback((e) => {
    setDuration(e.target.duration);
    setLoading(false);
  }, []);

  const onEnded = useCallback(() => {
    setPlaying(false);
  }, []);

  const onError = useCallback(() => {
    setError('Video playback error');
    setLoading(false);
  }, []);

  const videoProps = {
    ref: videoRef,
    onTimeUpdate,
    onLoadedMetadata,
    onEnded,
    onError,
    playsInline: true,
  };

  return {
    videoRef,
    videoProps,
    playing,
    currentTime,
    duration,
    volume,
    muted,
    playbackRate,
    loading,
    error,
    play,
    pause,
    toggle,
    seekTo,
    seekRelative,
    changeVolume,
    toggleMute,
    changePlaybackRate,
    setDuration,
    setLoading,
    setError,
  };
}
