import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { readAutomationConfig } from './app/automation-config.js';
import { renderGameToText } from './app/render-game-to-text.js';
import { buildTacticalTips } from './app/tactical-tips.js';
import { Modal } from './components/modal.js';
import { useBattleAudio } from './hooks/use-battle-audio.js';
import { useGameInput } from './hooks/use-game-input.js';
import { useLocalBattle } from './hooks/use-local-battle.js';
import { useUiPreferences } from './hooks/use-ui-preferences.js';
import { GameScreen } from './screens/game-screen.js';
import { IdentityScreen } from './screens/identity-screen.js';
import { MenuScreen } from './screens/menu-screen.js';
import { SetupScreen } from './screens/setup-screen.js';
import type { AppScreen } from './ui-types.js';
import styles from './App.module.css';

const PROFILE_STORAGE_KEY = 'aquawetrix-profile-name';

function loadProfileName(): string {
  if (typeof window === 'undefined') {
    return 'Delta';
  }
  return window.localStorage.getItem(PROFILE_STORAGE_KEY) ?? 'Delta';
}

export function App() {
  const automation = useMemo(() => readAutomationConfig(), []);
  const autostartRanRef = useRef(false);
  const [screen, setScreen] = useState<AppScreen>(() => (automation.autostartSolo ? 'game' : 'identity'));
  const [soloVariant, setSoloVariant] = useState<'story' | 'endless'>('story');
  const [profileName, setProfileName] = useState(loadProfileName);
  const [showSettings, setShowSettings] = useState(false);
  const [showGameMenu, setShowGameMenu] = useState(false);

  const localBattle = useLocalBattle();
  const { preferences, updatePreference } = useUiPreferences();
  const selectedMode = 'solo' as const;

  const startSoloMatch = (pilotName: string) => {
    const options: Parameters<typeof localBattle.start>[0] = {
      mode: 'solo',
      playerNames: [pilotName, 'Solo Puzzle'],
      soloVariant,
      clockMode: automation.automationEnabled ? 'manual' : 'realtime',
    };
    if (automation.seed !== null) {
      options.seed = automation.seed;
    }
    localBattle.start(options);
  };

  useEffect(() => {
    if (!automation.autostartSolo || autostartRanRef.current) {
      return;
    }
    autostartRanRef.current = true;
    const options: Parameters<typeof localBattle.start>[0] = {
      mode: 'solo',
      playerNames: [profileName.trim() || 'Delta', 'Solo Puzzle'],
      soloVariant,
      clockMode: automation.automationEnabled ? 'manual' : 'realtime',
    };
    if (automation.seed !== null) {
      options.seed = automation.seed;
    }
    localBattle.start(options);
  }, [automation.autostartSolo, automation.automationEnabled, automation.seed, localBattle, profileName, soloVariant]);

  useEffect(() => {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, profileName);
  }, [profileName]);

  const currentMatch = useDeferredValue(localBattle.match);
  const tacticalTips = useMemo(
    () => (currentMatch ? buildTacticalTips(currentMatch, 0) : []),
    [currentMatch],
  );
  const resultOpen = screen === 'game' && currentMatch?.status === 'complete';

  useGameInput({
    screen,
    selectedMode,
    automationEnabled: automation.automationEnabled,
    showGameMenu,
    showSettings,
    resultOpen,
    toggleGameMenu: () => {
      setShowGameMenu((current) => !current);
    },
    sendLocalCommand: localBattle.sendCommand,
    sendOnlineCommand: () => {},
  });

  useEffect(() => {
    if (!automation.automationEnabled) {
      return undefined;
    }

    window.render_game_to_text = () => renderGameToText({
      screen,
      selectedMode,
      match: currentMatch,
    });
    window.advanceTime = async (ms: number) => {
      const safeMs = Number.isFinite(ms) && ms > 0 ? ms : 0;
      await localBattle.advanceTime(safeMs);
    };

    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, [automation.automationEnabled, currentMatch, localBattle, screen]);

  useBattleAudio(currentMatch, preferences.audioEnabled);

  const launchMode = () => {
    setShowGameMenu(false);
    startSoloMatch(profileName.trim() || 'Delta');
    setScreen('game');
  };

  const exitCurrentMatch = () => {
    setShowGameMenu(false);
    localBattle.stop();
    setScreen('menu');
  };

  const rematchCurrentMode = () => {
    setShowGameMenu(false);
    launchMode();
  };

  return (
    <main className={styles.shell}>
      {screen === 'identity' ? (
        <IdentityScreen
          profileName={profileName}
          onProfileNameChange={setProfileName}
          onContinue={() => {
            setProfileName(profileName.trim() || 'Delta');
            setScreen('menu');
          }}
          onOpenSettings={() => setShowSettings(true)}
        />
      ) : null}

      {screen === 'menu' ? (
        <MenuScreen
          profileName={profileName}
          onStartSolo={() => setScreen('setup')}
          onOpenSettings={() => setShowSettings(true)}
          onRename={() => setScreen('identity')}
        />
      ) : null}

      {screen === 'setup' ? (
        <SetupScreen
          profileName={profileName}
          soloVariant={soloVariant}
          onSoloVariantChange={setSoloVariant}
          onBack={() => setScreen('menu')}
          onOpenSettings={() => setShowSettings(true)}
          onProfileNameChange={setProfileName}
          onStart={launchMode}
        />
      ) : null}

      {screen === 'game' ? (
        <GameScreen
          mode={selectedMode}
          match={currentMatch}
          localSlot={0}
          connectionLabel="Solo Match"
          roomCode={null}
          reducedMotion={preferences.reducedMotion}
          highContrast={preferences.highContrast}
          showTips={preferences.showTips}
          tacticalTips={tacticalTips}
          sendCommand={localBattle.sendCommand}
          onOpenOverlay={() => setShowGameMenu(true)}
          onExit={exitCurrentMatch}
        />
      ) : null}

      <Modal open={showSettings} eyebrow="Preferences" title="Interface Settings" onClose={() => setShowSettings(false)}>
        <div className={styles.toggleList}>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={preferences.reducedMotion}
              onChange={(event) => updatePreference('reducedMotion', event.target.checked)}
            />
            <span>Reduced motion</span>
          </label>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={preferences.highContrast}
              onChange={(event) => updatePreference('highContrast', event.target.checked)}
            />
            <span>High contrast HUD</span>
          </label>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={preferences.audioEnabled}
              onChange={(event) => updatePreference('audioEnabled', event.target.checked)}
            />
            <span>Audio cues</span>
          </label>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={preferences.showTips}
              onChange={(event) => updatePreference('showTips', event.target.checked)}
            />
            <span>Show tactical tips</span>
          </label>
        </div>
      </Modal>

      <Modal open={showGameMenu} eyebrow="Paused" title="Match Menu" onClose={() => setShowGameMenu(false)}>
        <div className={styles.modalStack}>
          <p className={styles.modalText}>Move with WASD, rotate with Q/E, and drop with Space.</p>
          <div className={styles.modalActions}>
            <button type="button" className="btn btn--secondary" onClick={() => setShowGameMenu(false)}>
              Resume
            </button>
            <button type="button" className="btn btn--secondary" onClick={() => setShowSettings(true)}>
              Settings
            </button>
            <button type="button" className="btn btn--ghost" onClick={exitCurrentMatch}>
              Return To Menu
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={resultOpen} eyebrow="Results" title="Match Complete" onClose={exitCurrentMatch}>
        <div className={styles.modalStack}>
          <p className={styles.modalText}>{currentMatch?.events.find((event) => event.type === 'winner_declared')?.message ?? 'Match resolved.'}</p>
          <div className={styles.modalActions}>
            <button type="button" className="btn btn--primary" onClick={rematchCurrentMode}>
              Rematch
            </button>
            <button type="button" className="btn btn--ghost" onClick={exitCurrentMatch}>
              Return To Menu
            </button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
