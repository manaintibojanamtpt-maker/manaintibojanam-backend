import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'outlined', 'ghost', 'danger', 'fab'] },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = { args: { children: 'Order Now', variant: 'primary' } };
export const Secondary: Story = { args: { children: 'View Menu', variant: 'secondary' } };
export const Outlined: Story = { args: { children: 'Learn More', variant: 'outlined' } };
export const Ghost: Story = { args: { children: 'Skip', variant: 'ghost' } };
export const Danger: Story = { args: { children: 'Cancel Order', variant: 'danger' } };
export const Loading: Story = { args: { children: 'Placing Order', loading: true } };
