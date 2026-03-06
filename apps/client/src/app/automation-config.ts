export interface AutomationConfig {
  automationEnabled: boolean;
  autostartSolo: boolean;
  seed: number | null;
}

function toBooleanFlag(value: string | null): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true';
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
    seed: toSeed(params.get('seed')),
  };
}

export function readAutomationConfig(): AutomationConfig {
  if (typeof window === 'undefined') {
    return {
      automationEnabled: false,
      autostartSolo: false,
      seed: null,
    };
  }
  return parseAutomationConfig(window.location.search);
}
