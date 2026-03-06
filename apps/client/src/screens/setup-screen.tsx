import styles from './setup-screen.module.css';

interface SetupScreenProps {
  soloVariant: 'story' | 'endless';
  profileName: string;
  onSoloVariantChange: (variant: 'story' | 'endless') => void;
  onBack: () => void;
  onOpenSettings: () => void;
  onProfileNameChange: (value: string) => void;
  onStart: () => void;
}

const ACTIVE_PREVIEW_CELLS = new Set(['1:1', '2:1', '3:1', '3:2', '3:3']);
const WATER_PREVIEW_CELLS = new Set(['2:2', '2:3', '3:2']);

export function SetupScreen({
  soloVariant,
  profileName,
  onSoloVariantChange,
  onBack,
  onOpenSettings,
  onProfileNameChange,
  onStart,
}: SetupScreenProps) {
  const launchDisabled = !profileName.trim();
  const previewCells = Array.from({ length: 36 }, (_, index) => {
    const x = index % 6;
    const y = Math.floor(index / 6);
    const key = `${x}:${y}`;
    const className = WATER_PREVIEW_CELLS.has(key)
      ? styles.previewWater
      : ACTIVE_PREVIEW_CELLS.has(key)
        ? styles.previewActive
        : styles.previewCell;
    return <span key={key} className={className} />;
  });

  return (
    <section className={styles.shell}>
      <div className={styles.panel}>
        <header className={styles.header}>
          <button type="button" className="btn btn--ghost" onClick={onBack}>
            Back
          </button>
          <button type="button" className="btn btn--ghost" onClick={onOpenSettings}>
            Settings
          </button>
        </header>

        <div className={styles.grid}>
          <article className={styles.lessonCard}>
            <p className={styles.kicker}>Solo Lesson</p>
            <h1>Opening Basin</h1>
            <p className={styles.objective}>Build the outer wall first, trap the lake, then cash it out before the reservoir climbs.</p>
            <div className={styles.previewStage} aria-hidden="true">
              <div className={styles.previewBoard}>{previewCells}</div>
              <div className={styles.previewPiece} />
            </div>
            <div className={styles.lessonNotes}>
              <span>Move with WASD</span>
              <span>Rotate with Q / E</span>
              <span>Drop with Space</span>
            </div>
          </article>

          <article className={styles.controlCard}>
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
              <div className={styles.variantRow}>
                <button
                  type="button"
                  className={`${styles.variantButton} ${soloVariant === 'story' ? styles.variantButtonActive : ''}`}
                  onClick={() => onSoloVariantChange('story')}
                >
                  Story Pressure
                </button>
                <button
                  type="button"
                  className={`${styles.variantButton} ${soloVariant === 'endless' ? styles.variantButtonActive : ''}`}
                  onClick={() => onSoloVariantChange('endless')}
                >
                  Endless
                </button>
              </div>
            </div>

            <div className={styles.ruleCard}>
              <strong>Demo Scope</strong>
              <p>Solo is playable now. Versus and Online stay visible on the menu, but they do not boot any runtime in this build.</p>
            </div>

            <div className={styles.ruleCard}>
              <strong>Run Goal</strong>
              <p>Keep the right tube low, shape a clean basin, and save fire for a large evaporation instead of spending it early.</p>
            </div>

            <button type="button" className={`btn btn--primary ${styles.startButton}`} disabled={launchDisabled} onClick={onStart}>
              Start Match
            </button>
          </article>
        </div>
      </div>
    </section>
  );
}
