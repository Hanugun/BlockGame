import styles from './menu-screen.module.css';

interface MenuScreenProps {
  profileName: string;
  onStartSolo: () => void;
  onOpenSettings: () => void;
  onRename: () => void;
}

const FUTURE_MODE_CARDS = [
  {
    title: 'Versus',
    summary: 'Head-to-head basin battles stay visible as the next milestone.',
  },
  {
    title: 'Online',
    summary: 'Networked play is intentionally disabled in this investor demo build.',
  },
];

export function MenuScreen({ profileName, onStartSolo, onOpenSettings, onRename }: MenuScreenProps) {
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
          className={`${styles.modeCard} ${styles.soloCard}`}
          onClick={onStartSolo}
        >
          <span className={styles.cardEyebrow}>Live Demo</span>
          <strong>Solo</strong>
          <span>Aqua Aqua parity rebuild mode with Story and Endless variants.</span>
          <small className={styles.cardMeta}>Only interactive mode included in the shipped bundle.</small>
        </button>

        {FUTURE_MODE_CARDS.map((card) => (
          <article key={card.title} className={`${styles.modeCard} ${styles.teaserCard}`} aria-disabled="true">
            <div className={styles.teaserHeader}>
              <span className={styles.teaserBadge}>Coming Soon</span>
            </div>
            <strong>{card.title}</strong>
            <span>{card.summary}</span>
            <small className={styles.cardMeta}>Visible hook only. No runtime initialization in this demo.</small>
          </article>
        ))}
      </div>
    </section>
  );
}
