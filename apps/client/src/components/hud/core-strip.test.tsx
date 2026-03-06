import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createMatch } from '../../lib/core.js';
import { CoreStrip } from './core-strip.js';

describe('CoreStrip', () => {
  it('always renders critical match metrics', () => {
    const match = createMatch({
      mode: 'versus',
      playerNames: ['Alpha', 'Beta'],
      status: 'active',
    });

    const html = renderToStaticMarkup(
      <CoreStrip
        match={match}
        primary={match.players[0]}
        rival={match.players[1]}
        roomCode="ROOM1"
        connectionLabel="Online Match"
      />,
    );

    expect(html).toContain('Your Stability');
    expect(html).toContain('Rival Stability');
    expect(html).toContain('Drain Tube');
    expect(html).toContain('Score');
    expect(html).toContain('Time');
    expect(html).toContain('ROOM1');
  });
});
