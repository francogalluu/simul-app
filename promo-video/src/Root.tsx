import React from 'react';
import { Composition } from 'remotion';
import { SimulPromo } from './SimulPromo';
import { ContactSheet } from './ContactSheet';
import { FPS, H, T, W } from './lib/theme';
import { SimulEditorial } from './SimulEditorial';
import { EditorialSheet } from './EditorialSheet';
import { TE } from './editorial/theme';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="SimulPromo" component={SimulPromo} durationInFrames={T.end} fps={FPS} width={W} height={H} defaultProps={{ lang: 'en' as const }} />
    <Composition id="SimulPromoES" component={SimulPromo} durationInFrames={T.end} fps={FPS} width={W} height={H} defaultProps={{ lang: 'es' as const }} />
    <Composition id="ContactSheet" component={ContactSheet} durationInFrames={T.end} fps={FPS} width={2304} height={1080} defaultProps={{ start: 0, step: 5, lang: 'en' as const }} />
    {/* Editorial promo (second video). The Spanish composition is added once the English one is approved. */}
    <Composition id="SimulEditorial" component={SimulEditorial} durationInFrames={TE.end} fps={FPS} width={W} height={H} defaultProps={{ lang: 'en' as const }} />
    <Composition id="EditorialSheet" component={EditorialSheet} durationInFrames={TE.end} fps={FPS} width={2304} height={1080} defaultProps={{ start: 0, step: 5, lang: 'en' as const }} />
  </>
);
