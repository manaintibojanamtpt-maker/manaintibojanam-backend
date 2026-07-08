import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardDescription, CardHeader, CardTitle } from './Card';
import { Button } from '../Button';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Mana Inti Bojanam</CardTitle>
        <CardDescription>Premium Andhra meals, tokenized for the Bhojan ecosystem.</CardDescription>
      </CardHeader>
      <Button variant="primary">Explore</Button>
    </Card>
  ),
};

export const Interactive: Story = {
  args: { interactive: true, children: 'Tap to open restaurant' },
};

export const Glass: Story = {
  args: { glass: true, children: 'Glass surface card for overlays' },
};
