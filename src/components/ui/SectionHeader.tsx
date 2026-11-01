import React from 'react';
import { SectionHeader as PrimitiveSectionHeader, SectionHeaderProps } from '../../design-system/primitives/SectionHeader';

/**
 * Marketing UI wrapper for SectionHeader.
 * Defaults to 'dark' theme for Neone dark marketing sections, while allowing explicit override.
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({ theme = 'dark', ...props }) => (
  <PrimitiveSectionHeader theme={theme} {...props} />
);

export type { SectionHeaderProps };
export default SectionHeader;
