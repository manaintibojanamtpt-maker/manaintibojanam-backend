import React from 'react';
import { Link } from 'react-router-dom';
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
  payments: <CreditCard />,
};

interface ProductOverviewProps {
  /** Show a subset on the landing page; full grid lives on /platform */
  limit?: number;
}

export const ProductOverview: React.FC<ProductOverviewProps> = ({ limit }) => {
  const modules = limit ? productModules.slice(0, limit) : productModules;

  return (
    <Section background="default">
      <SectionHeader
        label="The Operating System"
        title="Everything Your Restaurant Needs."
        description="One unified platform to manage every aspect of your food business, from the kitchen to the customer."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {modules.map((mod, i) => (
          <FeatureCard
            key={mod.id}
            icon={icons[mod.id as keyof typeof icons]}
            title={mod.title}
            description={mod.description}
            delay={i * 0.05}
          />
        ))}
      </div>
      {limit && limit < productModules.length && (
        <p className="text-center mt-8">
          <Link
            to="/platform"
            className="text-sm font-semibold text-[#FF6B00] hover:text-[#E56D00] transition-colors"
          >
            Explore all platform modules →
          </Link>
        </p>
      )}
    </Section>
  );
};
