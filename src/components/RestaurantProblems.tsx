import React from 'react';
import { Section } from './ui/Section';
import { SectionHeader } from './ui/SectionHeader';
import { FeatureCard } from './ui/FeatureCard';
import { Layers, Receipt, Box, Users, Utensils, Megaphone, Truck } from 'lucide-react';

export const RestaurantProblems: React.FC<{ limit?: number }> = ({ limit }) => {
  const problems = [
    { icon: <Layers />, title: "Orders from Multiple Channels", desc: "Swiggy, Zomato, Dine-in, and Takeaway orders scattered across 5 different tablets." },
    { icon: <Receipt />, title: "Manual Billing & Errors", desc: "Punching orders manually leads to missed items, wrong totals, and unhappy customers." },
    { icon: <Box />, title: "Inventory Blind Spots", desc: "Finding out you're out of paneer right in the middle of the Saturday dinner rush." },
    { icon: <Users />, title: "Staff Coordination", desc: "Waiters yelling orders to the kitchen, leading to chaos and delayed ticket times." },
    { icon: <Utensils />, title: "Customer Retention", desc: "Zero data on who your best customers are or how to bring them back." },
    { icon: <Truck />, title: "Delivery Management", desc: "Struggling to track riders and manage dispatch times during peak hours." },
  ];

  const visible = limit ? problems.slice(0, limit) : problems;

  return (
    <Section background="subtle">
      <SectionHeader 
        label="The Problem"
        title="Running a Restaurant Shouldn't Mean Managing Chaos"
        description="Most restaurant owners spend their days putting out fires instead of focusing on what matters: the food and the guests."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {visible.map((prob, i) => (
          <FeatureCard 
            key={i} 
            icon={prob.icon} 
            title={prob.title} 
            description={prob.desc} 
            delay={i * 0.1}
          />
        ))}
      </div>
    </Section>
  );
};
