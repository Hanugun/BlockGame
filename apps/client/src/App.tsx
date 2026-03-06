import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { readAutomationConfig } from './app/automation-config.js';
import type { PlayerCommand } from './lib/core.js';
import { connectionLabel } from './app/connection-label.js';
import { renderGameToText } from './app/render-game-to-text.js';
import { buildTacticalTips } from './app/tactical-tips.js';
import { Modal } from './components/modal.js';
import { useBattleAudio } from './hooks/use-battle-audio.js';
import { useGameInput } from './hooks/use-game-input.js';
import { useLocalBattle } from './hooks/use-local-battle.js';
import { useOnlineBattle } from './hooks/use-online-battle.js';
import { useUiPreferences } from './hooks/use-ui-preferences.js';
import { GameScreen } from './screens/game-screen.js';
import { IdentityScreen } from './screens/identity-screen.js';
import { LobbyScreen } from './screens/lobby-screen.js';
import { MenuScreen } from './screens/menu-screen.js';
import { SetupScreen } from './screens/setup-screen.js';
import type { AppScreen, MenuMode } from './ui-types.js';
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
  const [selectedMode, setSelectedMode] = useState<MenuMode>('solo');
  const [soloVariant, setSoloVariant] = useState<'story' | 'endless'>('story');
  const [profileName, setProfileName] = useState(loadProfileName);
  const [localNames, setLocalNames] = useState(() => ({ left: loadProfileName(), right: 'Cascade' }));
  const [onlineName, setOnlineName] = useState(loadProfileName);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showGameMenu, setShowGameMenu] = useState(false);

  const localBattle = useLocalBattle();
  const onlineBattle = useOnlineBattle();
  const { preferences, updatePreference } = useUiPreferences();

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
    const pilotName = profileName.trim() || 'Delta';
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
  }, [automation.autostartSolo, automation.automationEnabled, automation.seed, localBattle, profileName, soloVariant]);

  useEffect(() => {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, profileName);
  }, [profileName]);

  const activeScreen: AppScreen = screen === 'lobby' && onlineBattle.canEnterMatch ? 'game' : screen;

  const currentMatch = useDeferredValue(
    selectedMode === 'online_host' || selectedMode === 'online_join' ? onlineBattle.match : localBattle.match,
  );
  const currentLocalSlot = selectedMode === 'online_host' || selectedMode === 'online_join'
    ? onlineBattle.localSlot
    : selectedMode === 'solo'
      ? 0
      : null;
  const tacticalTips = useMemo(
    () => (currentMatch ? buildTacticalTips(currentMatch, currentLocalSlot) : []),
    [currentMatch, currentLocalSlot],
  );
  const resultOpen = activeScreen === 'game' && currentMatch?.status === 'complete';

  const sendCommand = (command: PlayerCommand) => {
    localBattle.sendCommand(command);
  };

  useGameInput({
    screen: activeScreen,
    selectedMode,
    automationEnabled: automation.automationEnabled,
    showGameMenu,
    showSettings,
    resultOpen,
    toggleGameMenu: () => {
      setShowGameMenu((current) => !current);
    },
    sendLocalCommand: localBattle.sendCommand,
    sendOnlineCommand: onlineBattle.sendCommand,
  });

  useEffect(() => {
    if (!automation.automationEnabled) {
      return undefined;
    }

    window.render_game_to_text = () => renderGameToText({
      screen: activeScreen,
      selectedMode,
      match: currentMatch,
    });
    window.advanceTime = async (ms: number) => {
      const safeMs = Number.isFinite(ms) && ms > 0 ? ms : 0;
      if (selectedMode === 'solo') {
        await localBattle.advanceTime(safeMs);
        return;
      }
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, safeMs);
      });
    };

    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, [activeScreen, automation.automationEnabled, currentMatch, localBattle, selectedMode]);

  useBattleAudio(currentMatch, preferences.audioEnabled);

  const launchMode = () => {
    setShowGameMenu(false);
    const safeProfile = profileName.trim() || 'Delta';
    startSoloMatch(safeProfile);
    setScreen('game');
  };

  const leaveOnlineLobby = () => {
    setScreen('menu');
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

  const battleConnectionLabel = connectionLabel(selectedMode, currentMatch, onlineBattle.connectionState);

  return (
      <main className={styles.shell}>
      {activeScreen === 'identity' ? (
        <IdentityScreen
          profileName={profileName}
          onProfileNameChange={setProfileName}
          onContinue={() => {
            const nextName = profileName.trim() || 'Delta';
            setProfileName(nextName);
            setLocalNames((current) => ({ ...current, left: current.left.trim() ? current.left : nextName }));
            setOnlineName((current) => current.trim() ? current : nextName);
            setScreen('menu');
          }}
          onOpenSettings={() => setShowSettings(true)}
        />
      ) : null}

      {activeScreen === 'menu' ? (
        <MenuScreen
          profileName={profileName}
          onSelectMode={(mode) => {
            void mode;
            setSelectedMode('solo');
            setLocalNames((current) => ({ ...current, left: profileName }));
            setScreen('setup');
          }}
          onOpenSettings={() => setShowSettings(true)}
          onRename={() => setScreen('identity')}
        />
      ) : null}

      {activeScreen === 'setup' ? (
        <SetupScreen
          key={selectedMode}
          mode={selectedMode}
          profileName={profileName}
          localNames={localNames}
          onlineName={onlineName}
          roomCodeInput={roomCodeInput}
          soloVariant={soloVariant}
          onSoloVariantChange={setSoloVariant}
          connectionState={onlineBattle.connectionState}
          error={onlineBattle.error}
          onBack={() => setScreen('menu')}
          onOpenSettings={() => setShowSettings(true)}
          onProfileNameChange={setProfileName}
          onLocalNamesChange={setLocalNames}
          onOnlineNameChange={setOnlineName}
          onRoomCodeChange={setRoomCodeInput}
          onStart={launchMode}
        />
      ) : null}

      {activeScreen === 'lobby' ? (
        <LobbyScreen
          mode={selectedMode === 'online_join' ? 'online_join' : 'online_host'}
          connectionState={onlineBattle.connectionState}
          roomCode={onlineBattle.roomCode}
          players={onlineBattle.players}
          error={onlineBattle.error}
          canEnterMatch={onlineBattle.canEnterMatch}
          onEnterMatch={() => setScreen('game')}
          onLeave={leaveOnlineLobby}
        />
      ) : null}

      {activeScreen === 'game' ? (
        <GameScreen
          mode={selectedMode}
          match={currentMatch}
          localSlot={currentLocalSlot}
          connectionLabel={battleConnectionLabel}
          roomCode={selectedMode === 'online_host' || selectedMode === 'online_join' ? onlineBattle.roomCode : null}
          reducedMotion={preferences.reducedMotion}
          highContrast={preferences.highContrast}
          showTips={preferences.showTips}
          tacticalTips={tacticalTips}
          sendCommand={sendCommand}
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
          <p className={styles.modalText}>
            {selectedMode === 'local'
              ? 'P1 uses WASD + Q/E + Space. P2 uses arrows + ,/. + Enter.'
              : 'Move with WASD, rotate with Q/E, and drop with Space.'}
          </p>
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
            {selectedMode === 'solo' || selectedMode === 'local' ? (
              <button type="button" className="btn btn--primary" onClick={rematchCurrentMode}>
                Rematch
              </button>
            ) : null}
            <button type="button" className="btn btn--ghost" onClick={exitCurrentMatch}>
              Return To Menu
            </button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
