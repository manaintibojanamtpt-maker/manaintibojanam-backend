import React from 'react';
import { CinematicFooter } from './ui/motion-footer';

export const EnterpriseFooter: React.FC<{ className?: string }> = ({ className }) => {
  return <CinematicFooter className={className} />;
};

export default EnterpriseFooter;
