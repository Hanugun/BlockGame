import styles from './identity-screen.module.css';

interface IdentityScreenProps {
  profileName: string;
  onProfileNameChange: (value: string) => void;
  onContinue: () => void;
  onOpenSettings: () => void;
}

export function IdentityScreen({
  profileName,
  onProfileNameChange,
  onContinue,
  onOpenSettings,
}: IdentityScreenProps) {
  return (
    <section className={styles.shell}>
      <div className={styles.hero}>
        <p className={styles.kicker}>Hydraulic Puzzle Combat</p>
        <h1>Aquawetrix</h1>
        <p className={styles.tagline}>
          Raise terrain. Seal basins. Break the rival board before the storm breaks yours.
        </p>
      </div>

      <div className={styles.card}>
        <label htmlFor="pilot-name" className={styles.label}>Pilot Name</label>
        <input
          id="pilot-name"
          value={profileName}
          maxLength={24}
          placeholder="Delta"
          onChange={(event) => onProfileNameChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && profileName.trim()) {
              onContinue();
            }
          }}
        />
        <div className={styles.actions}>
          <button type="button" className="btn btn--primary" disabled={!profileName.trim()} onClick={onContinue}>
            Continue
          </button>
          <button type="button" className="btn btn--ghost" onClick={onOpenSettings}>
            Settings
          </button>
        </div>
      </div>
    </section>
  );
}
