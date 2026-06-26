import React from 'react';
import { Section } from './ui/Section';
import { SectionHeader } from './ui/SectionHeader';
import { FeatureCard } from './ui/FeatureCard';
import { productModules } from '../config/product';
import { Settings, ChefHat, ShoppingCart, Users, LineChart, Sparkles, Megaphone, CreditCard } from 'lucide-react';

const icons = {
  operations: <Settings />,
  kitchen: <ChefHat />,
  orders: <ShoppingCart />,
  crm: <Users />,
  analytics: <LineChart />,
  ai: <Sparkles />,
  marketing: <Megaphone />,
  payments: <CreditCard />
};

export const ProductOverview: React.FC = () => {
  return (
    <Section background="default">
      <SectionHeader 
        label="The Operating System"
        title="Everything Your Restaurant Needs."
        description="One unified platform to manage every aspect of your food business, from the kitchen to the customer."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {productModules.map((mod, i) => (
          <FeatureCard 
            key={mod.id} 
            icon={icons[mod.id as keyof typeof icons]} 
            title={mod.title} 
            description={mod.description} 
            delay={i * 0.05}
          />
        ))}
      </div>
    </Section>
  );
};
