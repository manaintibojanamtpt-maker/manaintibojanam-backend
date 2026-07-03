import { loadIndiaReferenceBundleStatic } from '../../../data/reference/india/loadBundle.static';
import type { ReferenceBundlePort } from './ReferenceBundlePort';

export const defaultReferenceBundlePort: ReferenceBundlePort = {
  load: () => loadIndiaReferenceBundleStatic(),
};

export function createDefaultReferenceBundlePort(): ReferenceBundlePort {
  return defaultReferenceBundlePort;
}
