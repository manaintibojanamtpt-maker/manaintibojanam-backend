# Storybook Guide

## Start

```bash
cd packages/design-system
npm run dev
```

Opens http://localhost:6006

## Structure

Stories live alongside components: `src/components/**/*.stories.tsx`

## Decorators

All stories wrapped in `DesignSystemProvider` with dark theme and `bds.css` loaded (see `.storybook/preview.tsx`).

## Addons

- **Essentials** — controls, actions, docs
- **A11y** — contrast and ARIA checks

## Build Static Site

```bash
npm run build:storybook
```

Output: `storybook-static/` (validated by `gate:bds`).

## Writing Stories

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = { args: { children: 'Order', variant: 'primary' } };
```

## Tags

Use `tags: ['autodocs']` for auto-generated docs pages.
