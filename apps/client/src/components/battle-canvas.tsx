import { useEffect, useRef } from 'react';
import type { MatchState } from '../lib/core.js';
import type { BattleGameHandle } from '../game/create-battle-game.js';

interface BattleCanvasProps {
  match: MatchState | null;
  reducedMotion: boolean;
  highContrast: boolean;
  className?: string | undefined;
}

export function BattleCanvas({
  match,
  reducedMotion,
  highContrast,
  className,
}: BattleCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<BattleGameHandle | null>(null);
  const modelRef = useRef({ match, reducedMotion, highContrast });

  useEffect(() => {
    modelRef.current = { match, reducedMotion, highContrast };
    handleRef.current?.scene.setModel(modelRef.current);
  }, [match, reducedMotion, highContrast]);

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

  return <div ref={containerRef} className={['battle-canvas', className].filter(Boolean).join(' ')} tabIndex={0} />;
}
