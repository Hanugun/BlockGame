import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LobbyScreen } from './lobby-screen.js';

describe('LobbyScreen', () => {
  it('renders room code and presence info', () => {
    const html = renderToStaticMarkup(
      <LobbyScreen
        mode="online_host"
        connectionState="lobby"
        roomCode="AQW42"
        players={[
          { slot: 0, name: 'HostPilot' },
          { slot: 1, name: 'GuestPilot' },
        ]}
        error={null}
        canEnterMatch={false}
        onEnterMatch={() => {}}
        onLeave={() => {}}
      />,
    );

    expect(html).toContain('AQW42');
    expect(html).toContain('Copy Code');
    expect(html).toContain('HostPilot');
    expect(html).toContain('GuestPilot');
  });
});
