import React from 'react';
import { StackedCards } from './glass-cards';
import '../../index.css';

// Demo component showcasing the stacked cards with different configurations
export const DefaultDemo: React.FC = () => {
  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <StackedCards />
    </div>
  );
};

// Alternative demo with different styling
export const AlternativeDemo: React.FC = () => {
  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)'
    }}>
      <div style={{ padding: '2rem' }}>
        <h1 style={{ 
          textAlign: 'center', 
          color: 'white', 
          marginBottom: '2rem',
          fontSize: '2.5rem',
          textShadow: '0 4px 8px rgba(0, 0, 0, 0.3)'
        }}>
          Alternative Style Demo
        </h1>
        <StackedCards />
      </div>
    </div>
  );
};

export default DefaultDemo;
