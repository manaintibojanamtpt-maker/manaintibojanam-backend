const PINTEREST_SIZE_BUCKETS = [
  { maxWidth: 160, bucket: '236x' },
  { maxWidth: 320, bucket: '474x' },
  { maxWidth: 420, bucket: '736x' },
] as const;

const DEFAULT_REMOTE_IMAGE_WIDTH = 220;
const DEFAULT_REMOTE_IMAGE_QUALITY = 55;

const getPinterestBucket = (targetWidth: number) => {
  const bucket = PINTEREST_SIZE_BUCKETS.find((entry) => targetWidth <= entry.maxWidth);
  return bucket?.bucket ?? '736x';
};

export const optimizeImageUrl = (
  rawUrl: string | null | undefined,
  options?: {
    width?: number;
    quality?: number;
  }
) => {
  if (typeof rawUrl !== 'string') return '';

  const normalized = rawUrl.trim();
  if (!normalized || normalized === 'undefined' || normalized === 'null' || normalized.startsWith('gs://')) {
    return '';
  }

  if (normalized.startsWith('data:') || normalized.startsWith('/')) {
    return normalized;
  }

  const targetWidth = options?.width ?? DEFAULT_REMOTE_IMAGE_WIDTH;
  const targetQuality = options?.quality ?? DEFAULT_REMOTE_IMAGE_QUALITY;

  if (normalized.includes('pinimg.com')) {
    const bucket = getPinterestBucket(targetWidth);
    return normalized.replace(/\/(?:\d+x\d+|\d+x|originals)\//, `/${bucket}/`);
  }

  if (normalized.includes('unsplash.com')) {
    try {
      const url = new URL(normalized);
      url.searchParams.set('q', String(targetQuality));
      url.searchParams.set('w', String(targetWidth));
      url.searchParams.set('auto', 'format');
      url.searchParams.set('fit', 'crop');
      return url.toString();
    } catch {
      return normalized;
    }
  }

  return normalized;
};
