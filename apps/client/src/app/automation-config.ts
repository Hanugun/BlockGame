export type BattleRenderer = 'phaser' | 'three';

export interface AutomationConfig {
  automationEnabled: boolean;
  autostartSolo: boolean;
  rendererOverride: BattleRenderer | null;
  seed: number | null;
}

function toBooleanFlag(value: string | null): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true';
}

function toRenderer(value: string | null): BattleRenderer | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'phaser' || normalized === 'three') {
    return normalized;
  }
  return null;
}

function toSeed(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed)) {
    return null;
  }
  return parsed;
}

export function parseAutomationConfig(search: string): AutomationConfig {
  const params = new URLSearchParams(search);
  const autostart = params.get('autostart')?.trim().toLowerCase();
  return {
    automationEnabled: toBooleanFlag(params.get('automation')),
    autostartSolo: autostart === 'solo',
    rendererOverride: toRenderer(params.get('renderer')),
    seed: toSeed(params.get('seed')),
  };
}

export function readAutomationConfig(): AutomationConfig {
  if (typeof window === 'undefined') {
    return {
      automationEnabled: false,
      autostartSolo: false,
      rendererOverride: null,
      seed: null,
    };
  }
  return parseAutomationConfig(window.location.search);
}
