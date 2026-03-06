import { useEffect, useRef } from 'react';
import type { MatchEvent, MatchState } from '../lib/core.js';

function tone(
  context: AudioContext,
  options: { frequency: number; duration: number; type: OscillatorType; volume: number; delay?: number },
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const startAt = context.currentTime + (options.delay ?? 0);
  oscillator.type = options.type;
  oscillator.frequency.setValueAtTime(options.frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.linearRampToValueAtTime(options.volume, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + options.duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + options.duration);
}

function cueForEvent(context: AudioContext, event: MatchEvent) {
  switch (event.type) {
    case 'lake_stabilized':
      tone(context, { frequency: 360, duration: 0.12, type: 'triangle', volume: 0.04 });
      tone(context, { frequency: 480, duration: 0.16, type: 'sine', volume: 0.03, delay: 0.04 });
      return;
    case 'lake_captured':
      tone(context, { frequency: 280, duration: 0.14, type: 'triangle', volume: 0.05 });
      tone(context, { frequency: 420, duration: 0.18, type: 'triangle', volume: 0.04, delay: 0.05 });
      tone(context, { frequency: 560, duration: 0.22, type: 'sine', volume: 0.035, delay: 0.1 });
      return;
    case 'piece_locked':
      if (event.pieceKind === 'water') {
        tone(context, { frequency: 420, duration: 0.18, type: 'sine', volume: 0.05 });
        tone(context, { frequency: 620, duration: 0.12, type: 'triangle', volume: 0.04, delay: 0.04 });
        return;
      }
      if (event.pieceKind === 'bomb') {
        tone(context, { frequency: 110, duration: 0.22, type: 'sawtooth', volume: 0.06 });
        return;
      }
      if (event.pieceKind === 'fire') {
        tone(context, { frequency: 260, duration: 0.18, type: 'square', volume: 0.05 });
        tone(context, { frequency: 390, duration: 0.12, type: 'triangle', volume: 0.03, delay: 0.03 });
        return;
      }
      if (event.pieceKind === 'ice') {
        tone(context, { frequency: 540, duration: 0.22, type: 'triangle', volume: 0.04 });
        return;
      }
      tone(context, { frequency: 180, duration: 0.08, type: 'triangle', volume: 0.025 });
      return;
    case 'objective_completed':
    case 'bonus_triggered':
      tone(context, { frequency: 520, duration: 0.12, type: 'sine', volume: 0.04 });
      tone(context, { frequency: 660, duration: 0.16, type: 'triangle', volume: 0.035, delay: 0.05 });
      return;
    case 'bingo_scored':
      tone(context, { frequency: 392, duration: 0.18, type: 'triangle', volume: 0.05 });
      tone(context, { frequency: 494, duration: 0.2, type: 'triangle', volume: 0.045, delay: 0.05 });
      tone(context, { frequency: 588, duration: 0.24, type: 'triangle', volume: 0.04, delay: 0.1 });
      return;
    case 'attack_received':
    case 'attack_impact':
    case 'earthquake':
      tone(context, { frequency: 140, duration: 0.18, type: 'sawtooth', volume: 0.05 });
      return;
    case 'storm_pulse':
      tone(context, { frequency: 170, duration: 0.24, type: 'sine', volume: 0.04 });
      tone(context, { frequency: 96, duration: 0.28, type: 'triangle', volume: 0.035, delay: 0.04 });
      return;
    case 'winner_declared':
      tone(context, { frequency: 330, duration: 0.28, type: 'triangle', volume: 0.055 });
      tone(context, { frequency: 440, duration: 0.34, type: 'triangle', volume: 0.05, delay: 0.07 });
      return;
    default:
      return;
  }
}

export function useBattleAudio(match: MatchState | null, enabled: boolean) {
  const contextRef = useRef<AudioContext | null>(null);
  const seenEventIdsRef = useRef<Set<string>>(new Set());
  const currentMatchSeedRef = useRef<number | null>(null);

  useEffect(() => {
    if (!match) {
      seenEventIdsRef.current.clear();
      currentMatchSeedRef.current = null;
      return;
    }
    if (currentMatchSeedRef.current !== match.seed) {
      seenEventIdsRef.current.clear();
      currentMatchSeedRef.current = match.seed;
    }
  }, [match]);

  useEffect(() => {
    if (!enabled || !match || typeof window === 'undefined' || document.visibilityState === 'hidden') {
      return;
    }

    if (!contextRef.current) {
      contextRef.current = new window.AudioContext();
    }

    const context = contextRef.current;
    void context.resume();

    const unseenEvents = match.events.filter((event) => !seenEventIdsRef.current.has(event.id)).slice(0, 4);
    for (const event of unseenEvents) {
      seenEventIdsRef.current.add(event.id);
      cueForEvent(context, event);
    }
  }, [enabled, match]);

  useEffect(() => () => {
    seenEventIdsRef.current.clear();
    currentMatchSeedRef.current = null;
    if (contextRef.current) {
      void contextRef.current.close();
      contextRef.current = null;
    }
  }, []);
}
