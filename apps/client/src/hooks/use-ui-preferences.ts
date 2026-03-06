import { useEffect, useState } from 'react';

const STORAGE_KEY = 'aquawetrix-ui-preferences';

export interface UiPreferences {
  reducedMotion: boolean;
  highContrast: boolean;
  audioEnabled: boolean;
  showTips: boolean;
}

function loadInitialPreferences(): UiPreferences {
  if (typeof window === 'undefined') {
    return {
      reducedMotion: false,
      highContrast: false,
      audioEnabled: true,
      showTips: true,
    };
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        reducedMotion: prefersReducedMotion,
        highContrast: false,
        audioEnabled: true,
        showTips: true,
      };
    }
    const parsed = JSON.parse(raw) as Partial<UiPreferences>;
    return {
      reducedMotion: parsed.reducedMotion ?? prefersReducedMotion,
      highContrast: parsed.highContrast ?? false,
      audioEnabled: parsed.audioEnabled ?? true,
      showTips: parsed.showTips ?? true,
    };
  } catch {
    return {
      reducedMotion: prefersReducedMotion,
      highContrast: false,
      audioEnabled: true,
      showTips: true,
    };
  }
}

export function useUiPreferences() {
  const [preferences, setPreferences] = useState<UiPreferences>(() => loadInitialPreferences());

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    document.documentElement.dataset.motion = preferences.reducedMotion ? 'reduced' : 'full';
    document.documentElement.dataset.contrast = preferences.highContrast ? 'high' : 'standard';
  }, [preferences]);

  const updatePreference = <K extends keyof UiPreferences>(key: K, value: UiPreferences[K]) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  };

  return {
    preferences,
    updatePreference,
  };
}
