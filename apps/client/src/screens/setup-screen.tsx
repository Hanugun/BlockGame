import type { MenuMode } from '../ui-types.js';
import styles from './setup-screen.module.css';

interface SetupScreenProps {
  mode: MenuMode;
  soloVariant: 'story' | 'endless';
  profileName: string;
  localNames: { left: string; right: string };
  onlineName: string;
  roomCodeInput: string;
  onSoloVariantChange: (variant: 'story' | 'endless') => void;
  connectionState: string;
  error: string | null;
  onBack: () => void;
  onOpenSettings: () => void;
  onProfileNameChange: (value: string) => void;
  onLocalNamesChange: (value: { left: string; right: string }) => void;
  onOnlineNameChange: (value: string) => void;
  onRoomCodeChange: (value: string) => void;
  onStart: () => void;
}

export function SetupScreen({
  mode,
  soloVariant,
  profileName,
  localNames,
  onlineName,
  roomCodeInput,
  onSoloVariantChange,
  connectionState,
  error,
  onBack,
  onOpenSettings,
  onProfileNameChange,
  onLocalNamesChange,
  onOnlineNameChange,
  onRoomCodeChange,
  onStart,
}: SetupScreenProps) {
  void mode;
  void localNames;
  void onlineName;
  void roomCodeInput;
  void onLocalNamesChange;
  void onOnlineNameChange;
  void onRoomCodeChange;
  const launchDisabled = !profileName.trim();

  return (
    <section className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Launch Configuration</p>
          <h1>Solo Setup</h1>
          <p className={styles.objective}>Seal basins, bank lakes, and survive escalating hazards.</p>
        </div>
        <div className={styles.actions}>
          <button type="button" className="btn btn--ghost" onClick={onBack}>
            Back
          </button>
          <button type="button" className="btn btn--ghost" onClick={onOpenSettings}>
            Settings
          </button>
        </div>
      </header>

      <div className={styles.grid}>
        <article className={styles.card}>
          <label className={styles.field}>
            Pilot Name
            <input
              value={profileName}
              maxLength={24}
              onChange={(event) => onProfileNameChange(event.target.value)}
            />
          </label>
          <div className={styles.field}>
            Solo Variant
            <div className={styles.actions}>
              <button
                type="button"
                className={`btn ${soloVariant === 'story' ? 'btn--primary' : 'btn--ghost'}`}
                onClick={() => onSoloVariantChange('story')}
              >
                Story Pressure
              </button>
              <button
                type="button"
                className={`btn ${soloVariant === 'endless' ? 'btn--primary' : 'btn--ghost'}`}
                onClick={() => onSoloVariantChange('endless')}
              >
                Endless
              </button>
            </div>
          </div>
          <div className={styles.network}>
            <span>Network</span>
            <strong>{error ?? connectionState}</strong>
          </div>

          <button type="button" className="btn btn--primary" disabled={launchDisabled} onClick={onStart}>
            Start Match
          </button>
        </article>

        <article className={styles.card}>
          <h2>Controls</h2>
          <ul className={styles.list}>
            <li>Move: WASD</li>
            <li>Rotate: Q / E</li>
            <li>Drop: Space</li>
            <li>Fullscreen: F (Esc exits fullscreen first)</li>
          </ul>
          <h2>Core Loop</h2>
          <ul className={styles.list}>
            <li>Raise terrain to enclose water.</li>
            <li>Stabilize and bank lakes with Fireball.</li>
            <li>Keep leak pressure below tube capacity; it does not naturally recover.</li>
            <li>Random raindrops, ice cubes, and mines are solo hazards, not queue pieces.</li>
          </ul>
          <h2>Piece Read</h2>
          <ul className={styles.list}>
            <li>Upper = raise terrain.</li>
            <li>Downer = lower terrain.</li>
            <li>Water = fill basin, Fireball = bank/evaporate, Bomb = break terrain.</li>
          </ul>
        </article>
      </div>
    </section>
  );
}
