import type { Preview } from '@storybook/react';
import React from 'react';
import { DesignSystemProvider } from '../src/providers';
import '../src/styles/bds.css';

const preview: Preview = {
  decorators: [
    (Story) => (
      <DesignSystemProvider theme="dark">
        <div style={{ padding: '1.5rem', minHeight: '100vh', background: 'var(--bds-color-background)' }}>
          <Story />
        </div>
      </DesignSystemProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
};

export default preview;
