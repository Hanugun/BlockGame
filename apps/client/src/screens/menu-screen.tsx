import type { MenuMode } from '../ui-types.js';
import styles from './menu-screen.module.css';

interface MenuScreenProps {
  profileName: string;
  onSelectMode: (mode: MenuMode) => void;
  onOpenSettings: () => void;
  onRename: () => void;
}

export function MenuScreen({ profileName, onSelectMode, onOpenSettings, onRename }: MenuScreenProps) {
  return (
    <section className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Pilot Ready</p>
          <h1>Aquawetrix</h1>
          <p className={styles.pilot}>{profileName}</p>
        </div>
        <div className={styles.actions}>
          <button type="button" className="btn btn--ghost" onClick={onRename}>
            Change Name
          </button>
          <button type="button" className="btn btn--ghost" onClick={onOpenSettings}>
            Settings
          </button>
        </div>
      </header>

      <div className={styles.grid}>
        <button
          type="button"
          className={styles.modeCard}
          onClick={() => onSelectMode('solo')}
        >
          <strong>Solo Puzzle</strong>
          <span>Aqua Aqua parity rebuild mode: Story or Endless only.</span>
        </button>
      </div>
    </section>
  );
}
