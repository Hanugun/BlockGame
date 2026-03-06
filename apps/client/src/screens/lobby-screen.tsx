import { useEffect, useMemo, useRef, useState } from 'react';
import type { PlayerSlot } from '../lib/core.js';
import type { OnlineConnectionState, Presence } from '../state/online-battle-state.js';
import styles from './lobby-screen.module.css';

interface LobbyScreenProps {
  mode: 'online_host' | 'online_join';
  connectionState: OnlineConnectionState;
  roomCode: string | null;
  players: Presence;
  error: string | null;
  canEnterMatch: boolean;
  onEnterMatch: () => void;
  onLeave: () => void;
}

function connectionLabel(connectionState: OnlineConnectionState): string {
  switch (connectionState) {
    case 'connecting':
      return 'Connecting to server...';
    case 'lobby':
      return 'Lobby ready';
    case 'active':
      return 'Match active';
    case 'error':
      return 'Connection error';
    default:
      return 'Idle';
  }
}

function slotName(players: Presence, slot: PlayerSlot): string | null {
  const candidate = players.find((player) => player.slot === slot);
  return candidate?.name ?? null;
}

export function LobbyScreen({
  mode,
  connectionState,
  roomCode,
  players,
  error,
  canEnterMatch,
  onEnterMatch,
  onLeave,
}: LobbyScreenProps) {
  const [copyState, setCopyState] = useState<'idle' | 'success' | 'error'>('idle');
  const copyResetTimeoutRef = useRef<number | null>(null);
  const hostName = slotName(players, 0) ?? 'Host';
  const guestName = slotName(players, 1);
  const leadText = useMemo(() => {
    if (error) {
      return error;
    }
    if (connectionState === 'connecting') {
      return 'Establishing secure session...';
    }
    if (canEnterMatch) {
      return 'Both players connected. Enter the match when ready.';
    }
    if (mode === 'online_host') {
      return 'Share the room code with your challenger.';
    }
    return 'Waiting for host and room synchronization.';
  }, [canEnterMatch, connectionState, error, mode]);

  const copyRoomCode = async () => {
    if (!roomCode) {
      return;
    }
    if (copyResetTimeoutRef.current !== null) {
      window.clearTimeout(copyResetTimeoutRef.current);
      copyResetTimeoutRef.current = null;
    }
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopyState('success');
    } catch {
      setCopyState('error');
    }
    copyResetTimeoutRef.current = window.setTimeout(() => {
      setCopyState('idle');
      copyResetTimeoutRef.current = null;
    }, 2_000);
  };

  useEffect(() => () => {
    if (copyResetTimeoutRef.current !== null) {
      window.clearTimeout(copyResetTimeoutRef.current);
    }
  }, []);

  return (
    <section className={styles.shell}>
      <header className={styles.header}>
        <p className={styles.kicker}>Online Lobby</p>
        <h1>{mode === 'online_host' ? 'Host Room' : 'Join Room'}</h1>
        <p className={styles.lead}>{leadText}</p>
      </header>

      <div className={styles.grid}>
        <article className={styles.roomCard}>
          <p className={styles.cardTitle}>Room Code</p>
          <div className={styles.code}>{roomCode ?? '-----'}</div>
          <button
            type="button"
            className="btn btn--secondary"
            disabled={!roomCode}
            onClick={() => {
              void copyRoomCode();
            }}
          >
            {copyState === 'success' ? 'Copied' : copyState === 'error' ? 'Copy Failed' : 'Copy Code'}
          </button>
          <p className={styles.hint}>Room code stays visible here until match start.</p>
        </article>

        <article className={styles.statusCard}>
          <p className={styles.cardTitle}>Connection</p>
          <p className={styles.status}>{connectionLabel(connectionState)}</p>
          {error ? <p className={styles.error}>{error}</p> : null}
          <div className={styles.presence}>
            <div className={styles.presenceRow}>
              <span>Host</span>
              <strong>{hostName}</strong>
            </div>
            <div className={styles.presenceRow}>
              <span>Guest</span>
              <strong>{guestName ?? 'Waiting...'}</strong>
            </div>
          </div>
        </article>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className="btn btn--primary"
          disabled={!canEnterMatch}
          onClick={onEnterMatch}
        >
          Enter Match
        </button>
        <button type="button" className="btn btn--ghost" onClick={onLeave}>
          Leave Lobby
        </button>
      </div>
    </section>
  );
}
