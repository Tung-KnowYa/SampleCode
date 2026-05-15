import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Play, Square, Volume2 } from 'lucide-react';
import { resolveTtsEndpoint } from './api';
import { plaintextForSpeech } from './plaintextForSpeech';

/**
 * Fetches `/api/tts`, then keeps a lightweight player (Play / Stop). The volume trigger is shown
 * only until audio is cached for this message — after Stop, replay uses Play without re-fetching.
 *
 * @param {object} p
 * @param {string} p.apiBase
 * @param {string} p.markdownSource
 */
export function AssistantSpeakButton({ apiBase, markdownSource }) {
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [hasTrack, setHasTrack] = useState(false);

  const audioRef = useRef(null);
  const objectUrlRef = useRef(null);

  /** Drop audio refs only — safe while `busy` is true (during fetch). */
  const teardownAudioRefs = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      try {
        a.pause();
      } catch {
        /* ignore */
      }
      a.src = '';
    }
    audioRef.current = null;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPlaying(false);
  }, []);

  /** Blob + refs + UI flags reset (chat message replaced or unload). Never call mid-fetch unless aborting fetch. */
  const resetSpeechState = useCallback(() => {
    teardownAudioRefs();
    setHasTrack(false);
    setBusy(false);
    setPlaying(false);
  }, [teardownAudioRefs]);

  /** Stops playback and rewinds — keeps blob URL for replay. */
  const stopPlaybackOnly = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    try {
      a.pause();
      a.currentTime = 0;
    } catch {
      /* ignore */
    }
    setPlaying(false);
  }, []);

  useEffect(() => {
    resetSpeechState();
  }, [markdownSource, resetSpeechState]);

  useEffect(() => () => resetSpeechState(), [resetSpeechState]);

  const attachNewTrack = useCallback(
    /** @param {Blob} blob */ (blob) => {
      teardownAudioRefs();

      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;

      const el = new Audio(url);
      el.addEventListener('ended', () => {
        setPlaying(false);
      });
      el.addEventListener('error', () => {
        console.warn('TTS audio playback error');
        resetSpeechState();
      });
      audioRef.current = el;
      setHasTrack(true);
      return el;
    },
    [resetSpeechState, teardownAudioRefs],
  );

  const generateAndPlay = useCallback(async () => {
    const text = plaintextForSpeech(markdownSource);
    if (!text || busy) return;

    setBusy(true);

    try {
      const endpoint = resolveTtsEndpoint(apiBase);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const ct = (response.headers.get('content-type') || '').split(';')[0].trim();

      if (!response.ok) {
        let hint = `${response.status}`;
        try {
          if (response.headers.get('content-type')?.includes('application/json')) {
            const payload = await response.json();
            if (payload && typeof payload.error === 'string') {
              hint = payload.error.slice(0, 320);
            }
          } else {
            const t = (await response.text()).trim();
            if (t) hint = t.slice(0, 200);
          }
        } catch {
          /* ignore */
        }
        if (!hint) hint = `Request failed (${response.status})`;
        console.warn('TTS failed:', hint);
        return;
      }

      if (!(ct.includes('audio/') || ct === 'application/octet-stream')) {
        try {
          const payload = await response.clone().json();
          if (payload && typeof payload.error === 'string') {
            console.warn('TTS failed:', payload.error.slice(0, 320));
          }
        } catch {
          /* ignore */
        }
        return;
      }

      const blob = await response.blob();
      const el = attachNewTrack(blob);
      setPlaying(true);
      try {
        await el.play();
      } catch (playErr) {
        stopPlaybackOnly();
        console.warn('Audio playback rejected:', playErr);
      }
    } catch (e) {
      console.warn('TTS request error:', e);
    } finally {
      setBusy(false);
    }
  }, [apiBase, attachNewTrack, busy, markdownSource, stopPlaybackOnly]);

  const replayFromStart = useCallback(async () => {
    const el = audioRef.current;
    if (!el || playing || busy) return;
    try {
      el.currentTime = 0;
      setPlaying(true);
      await el.play();
    } catch (playErr) {
      stopPlaybackOnly();
      console.warn('Audio playback rejected:', playErr);
    }
  }, [busy, playing, stopPlaybackOnly]);

  const baseBtn =
    'inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-current/25 bg-black/15 text-current outline-none transition-colors hover:bg-black/25 focus-visible:ring-2 focus-visible:ring-amber-400/70 disabled:pointer-events-none disabled:opacity-35 dark:bg-white/15 dark:hover:bg-white/25';

  const text = plaintextForSpeech(markdownSource);
  if (!text) return null;

  if (busy && !hasTrack) {
    return (
      <div
        className={`${baseBtn} cursor-default`}
        title="Generating speech…"
        aria-busy="true"
        aria-label="Generating speech audio"
      >
        <Loader2 className="size-4 animate-spin opacity-85" aria-hidden />
      </div>
    );
  }

  if (!hasTrack) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          void generateAndPlay();
        }}
        title="Listen — generate speech"
        aria-label="Speak AI reply"
        className={baseBtn}
      >
        <Volume2 className="size-4 opacity-90" strokeWidth={2} aria-hidden />
      </button>
    );
  }

  return (
    <div
      className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-current/25 bg-black/10 px-1 py-0.5 dark:bg-white/10"
      role="group"
      aria-label="Speech playback"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => {
          void replayFromStart();
        }}
        disabled={busy || playing}
        title={playing ? 'Playing' : busy ? 'Preparing…' : 'Play from start'}
        aria-label={playing ? 'Playing' : 'Play speech from start'}
        className={baseBtn}
      >
        <Play
          className="size-[18px] opacity-95"
          aria-hidden
          strokeWidth={2}
          fill={playing ? 'currentColor' : 'none'}
        />
      </button>
      <button
        type="button"
        onClick={() => {
          stopPlaybackOnly();
        }}
        disabled={busy}
        title="Stop"
        aria-label="Stop speech"
        className={baseBtn}
      >
        <Square className="size-[10px] fill-current opacity-90" aria-hidden />
      </button>
    </div>
  );
}
