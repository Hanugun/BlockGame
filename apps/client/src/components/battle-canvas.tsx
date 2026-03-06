import { useEffect, useRef } from 'react';
import type { MatchState, PlayerCommand } from '../lib/core.js';
import type { BattleGameHandle } from '../game/create-battle-game.js';

interface BattleCanvasProps {
  localSlot: 0 | 1 | null;
  match: MatchState | null;
  mode: 'solo' | 'local' | 'online';
  reducedMotion: boolean;
  highContrast: boolean;
  sendCommand: (command: PlayerCommand) => void;
}

export function BattleCanvas({
  localSlot,
  match,
  mode,
  reducedMotion,
  highContrast,
  sendCommand,
}: BattleCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<BattleGameHandle | null>(null);
  const modelRef = useRef({ localSlot, match, mode, reducedMotion, highContrast, sendCommand });

  useEffect(() => {
    modelRef.current = { localSlot, match, mode, reducedMotion, highContrast, sendCommand };
    handleRef.current?.scene.setModel(modelRef.current);
  }, [localSlot, match, mode, reducedMotion, highContrast, sendCommand]);

  useEffect(() => {
    if (!containerRef.current || handleRef.current) {
      return undefined;
    }

    containerRef.current.focus();
    let cancelled = false;
    void import('../game/create-battle-game.js').then(({ createBattleGame }) => {
      if (!containerRef.current || cancelled || handleRef.current) {
        return;
      }
      void createBattleGame(containerRef.current).then((handle) => {
        if (!containerRef.current || cancelled || handleRef.current) {
          handle.game.destroy(true);
          return;
        }
        handleRef.current = handle;
        handle.scene.setModel(modelRef.current);
      });
    });

    return () => {
      cancelled = true;
      handleRef.current?.game.destroy(true);
      handleRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="battle-canvas" tabIndex={0} />;
}
