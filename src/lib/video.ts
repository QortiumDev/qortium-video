import { getResourceRatingSummary, getResourceStatus, getResourceStreamUrl, searchResources } from '../api/qortal';
import type { QdnResource } from '../types';

const READY_STATUS = 'READY';
const FAILURE_STATUSES = new Set(['BLOCKED', 'BUILD_FAILED', 'FAILED_TO_DOWNLOAD', 'NOT_PUBLISHED', 'UNSUPPORTED']);
const POLL_INTERVAL_MS = 5000;
const MAX_WAIT_MS = 120_000;
const VIDEO_SERVICE = 'VIDEO';
const THUMBNAIL_SERVICE = 'THUMBNAIL';

export function thumbnailUrl(name: string, identifier: string): string {
  return `/arbitrary/${THUMBNAIL_SERVICE}/${encodeURIComponent(name)}/${encodeURIComponent(identifier)}`;
}

// Mirrors Qortium Home's own media viewer and qortium-radio's waitForTrackReady:
// check status, and only poll until READY (or a terminal failure). A resource
// isn't necessarily local just because it's published - it may need to be
// fetched from peers first.
export async function waitForVideoReady(
  name: string,
  identifier: string,
  opts: {
    onProgress?: (status: { status: string; localChunkCount?: number; totalChunkCount?: number }) => void;
    isCancelled?: () => boolean;
  } = {},
): Promise<void> {
  const start = Date.now();
  for (;;) {
    if (opts.isCancelled?.()) return;
    const status = await getResourceStatus(VIDEO_SERVICE, name, identifier);
    opts.onProgress?.(status);
    if (status.status === READY_STATUS) return;
    if (FAILURE_STATUSES.has(status.status)) {
      throw new Error(`This video isn't available right now (${status.status.replace(/_/g, ' ').toLowerCase()}).`);
    }
    if (Date.now() - start > MAX_WAIT_MS) {
      throw new Error('This video is taking a while to fetch from the network.');
    }
    if (opts.isCancelled?.()) return;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

export async function resolveVideoStreamUrl(name: string, identifier: string): Promise<string> {
  return getResourceStreamUrl(VIDEO_SERVICE, name, identifier);
}

export type RankedVideo = { resource: QdnResource; rating: number | null };

// Ranks a bounded candidate set by community rating (descending), ties broken
// by newest. This is deliberately the ONLY ranking signal in the app - no view
// counts, no watch history, no personalization, no collaborative filtering.
export async function rankByRating(resources: QdnResource[]): Promise<RankedVideo[]> {
  const ranked = await Promise.all(
    resources.map(async (resource) => ({
      resource,
      rating: await getResourceRatingSummary(VIDEO_SERVICE, resource.name, resource.identifier),
    })),
  );
  return ranked.sort((a, b) => {
    const ra = a.rating ?? -1;
    const rb = b.rating ?? -1;
    if (rb !== ra) return rb - ra;
    return (b.resource.created ?? 0) - (a.resource.created ?? 0);
  });
}

// Fetches a bounded window of the newest network-wide videos to rank by rating.
// A true all-time global top-rated sort would require fetching a rating for
// every video ever published on the chain, which doesn't scale - ranking is
// deliberately scoped to the most recent `windowSize` uploads instead.
export async function fetchTopRatedVideos(windowSize = 60, limit = 30): Promise<QdnResource[]> {
  const recent = await searchResources({ service: VIDEO_SERVICE, reverse: true, limit: windowSize });
  const ranked = await rankByRating(recent);
  return ranked.slice(0, limit).map((r) => r.resource);
}

export async function fetchUpNext(
  currentName: string,
  currentIdentifier: string,
  windowSize = 30,
  limit = 10,
): Promise<RankedVideo[]> {
  const recent = await searchResources({ service: VIDEO_SERVICE, reverse: true, limit: windowSize });
  const candidates = recent.filter((r) => !(r.name === currentName && r.identifier === currentIdentifier));
  const ranked = await rankByRating(candidates);
  return ranked.slice(0, limit);
}
