import type { MatchState, PieceKind, PlayerCommand, PlayerSlot, Rotation, Vec2 } from '../../lib/core.js';

export interface SceneModel {
  localSlot: PlayerSlot | null;
  match: MatchState | null;
  mode: 'solo' | 'local' | 'online';
  reducedMotion: boolean;
  highContrast: boolean;
  sendCommand: (command: PlayerCommand) => void;
}

export interface RenderPoint {
  x: number;
  y: number;
}

export interface LandingEffect {
  slot: PlayerSlot;
  pieceKind: PieceKind;
  anchor: Vec2;
  rotation: Rotation;
  startedAt: number;
  hardDrop: boolean;
  special: boolean;
}

export interface BurstEffect {
  slot: PlayerSlot;
  center: Vec2;
  color: number;
  startedAt: number;
  duration: number;
  kind: 'special' | 'objective' | 'impact';
}

export interface SlotFeedback {
  shakeUntil: number;
  captureUntil: number;
  warningUntil: number;
  objectiveUntil: number;
}
