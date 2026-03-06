import { describe, expect, it } from 'vitest';
import { parseAutomationConfig } from './automation-config.js';

describe('automation config parsing', () => {
  it('returns safe defaults', () => {
    expect(parseAutomationConfig('')).toEqual({
      automationEnabled: false,
      autostartSolo: false,
      seed: null,
    });
  });

  it('parses enabled automation options', () => {
    expect(parseAutomationConfig('?automation=1&autostart=solo&renderer=three&seed=7001')).toEqual({
      automationEnabled: true,
      autostartSolo: true,
      seed: 7001,
    });
  });

  it('accepts true flag and ignores renderer query noise', () => {
    expect(parseAutomationConfig('?automation=true&renderer=THREE')).toEqual({
      automationEnabled: true,
      autostartSolo: false,
      seed: null,
    });
  });

  it('drops invalid renderer and seed values', () => {
    expect(parseAutomationConfig('?automation=1&renderer=webgl&seed=oops')).toEqual({
      automationEnabled: true,
      autostartSolo: false,
      seed: null,
    });
  });
});
