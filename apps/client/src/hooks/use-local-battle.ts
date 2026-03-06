import { startTransition, useEffect, useRef, useState } from 'react';
import {
  applyPlayerCommand,
  createMatch,
  stepMatch,
  TICK_RATE,
  type MatchMode,
  type MatchState,
  type PlayerCommand,
  type SoloVariant,
} from '../lib/core.js';

type LocalBattleClockMode = 'realtime' | 'manual';

interface LocalBattleStartOptions {
  mode: MatchMode;
  playerNames: [string, string];
  soloVariant?: SoloVariant;
  seed?: number;
  clockMode?: LocalBattleClockMode;
}

interface LocalBattleControls {
  active: boolean;
  match: MatchState | null;
  start: (options: LocalBattleStartOptions) => void;
  stop: () => void;
  sendCommand: (command: PlayerCommand) => void;
  advanceTime: (ms: number) => Promise<void>;
}

export function useLocalBattle(): LocalBattleControls {
  const [active, setActive] = useState(false);
  const [match, setMatch] = useState<MatchState | null>(null);
  const matchRef = useRef<MatchState | null>(null);
  const clockModeRef = useRef<LocalBattleClockMode>('realtime');
  const stepRemainderMsRef = useRef(0);

  useEffect(() => {
    if (!active || clockModeRef.current !== 'realtime') {
      return undefined;
    }
    const timer = window.setInterval(() => {
      const current = matchRef.current;
      if (!current || current.status !== 'active') {
        return;
      }
      stepMatch(current);
      startTransition(() => {
        setMatch(structuredClone(current));
      });
    }, Math.floor(1_000 / TICK_RATE));
    return () => {
      window.clearInterval(timer);
    };
  }, [active]);

  return {
    active,
    match,
    start(options) {
      const createOptions: {
        mode: MatchMode;
        playerNames: [string, string];
        soloVariant?: SoloVariant;
        seed?: number;
      } = {
        mode: options.mode,
        playerNames: options.playerNames,
      };
      if (options.mode === 'solo') {
        createOptions.soloVariant = options.soloVariant ?? 'story';
      }
      if (typeof options.seed === 'number') {
        createOptions.seed = options.seed;
      }
      const nextMatch = createMatch(createOptions);
      clockModeRef.current = options.clockMode ?? 'realtime';
      stepRemainderMsRef.current = 0;
      matchRef.current = nextMatch;
      setActive(true);
      startTransition(() => {
        setMatch(structuredClone(nextMatch));
      });
    },
    stop() {
      matchRef.current = null;
      clockModeRef.current = 'realtime';
      stepRemainderMsRef.current = 0;
      setActive(false);
      setMatch(null);
    },
    sendCommand(command) {
      const current = matchRef.current;
      if (!current) {
        return;
      }
      applyPlayerCommand(current, command);
      startTransition(() => {
        setMatch(structuredClone(current));
      });
    },
    advanceTime(ms) {
      if (!Number.isFinite(ms) || ms <= 0 || clockModeRef.current !== 'manual') {
        return Promise.resolve();
      }
      const current = matchRef.current;
      if (!current || current.status !== 'active') {
        return Promise.resolve();
      }

      const tickMs = 1_000 / TICK_RATE;
      stepRemainderMsRef.current += ms;
      const steps = Math.floor(stepRemainderMsRef.current / tickMs);
      if (steps <= 0) {
        return Promise.resolve();
      }

      stepRemainderMsRef.current -= steps * tickMs;
      for (let index = 0; index < steps; index += 1) {
        stepMatch(current);
      }

      startTransition(() => {
        setMatch(structuredClone(current));
      });
      return Promise.resolve();
    },
  };
}
