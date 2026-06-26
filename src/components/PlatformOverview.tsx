import React from 'react';
import { Section } from './ui/Section';
import { SectionHeader } from './ui/SectionHeader';
import { FeatureCard } from './ui/FeatureCard';
import { platformCapabilities } from '../config/platform';
import { Server, Shield, Zap, RefreshCw, Lock, Smartphone, WifiOff, Code } from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  'ai-auto': <Zap />,
  'multi-tenant': <Server />,
  'cloud-native': <RefreshCw />,
  'real-time': <Zap />,
  'rbac': <Lock />,
  'secure-pay': <Shield />,
  'pwa': <Smartphone />,
  'offline': <WifiOff />,
  'apis': <Code />
};

export const PlatformOverview: React.FC = () => {
  return (
    <Section background="default">
      <SectionHeader 
        label="Capabilities"
        title="An Enterprise-Grade Platform"
        description="BhojanOS provides the technical foundation required to securely scale from one location to a national franchise."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {platformCapabilities.map((cap, i) => (
          <FeatureCard 
            key={cap.id} 
            icon={iconMap[cap.id] || <Server />} 
            title={cap.title} 
            description={cap.description} 
            delay={i * 0.1}
          />
        ))}
      </div>
    </Section>
  );
};
