import type { QdnResource } from '../types';

export async function getUserAccount(): Promise<{ address: string; name: string | null }> {
  const res = await qdnRequest({ action: 'GET_SELECTED_ACCOUNT' }) as { address: string; name: string | null };
  return { address: res.address, name: res.name || null };
}

export async function getList(listName: string): Promise<string[]> {
  try {
    const res = await qdnRequest({ action: 'GET_LIST', listName });
    return Array.isArray(res) ? (res as string[]) : [];
  } catch { return []; }
}

export async function addToList(listName: string, items: string[]): Promise<boolean> {
  const res = await qdnRequest({ action: 'ADD_TO_LIST', listName, items });
  return res === true;
}

export async function removeFromList(listName: string, items: string[]): Promise<boolean> {
  const res = await qdnRequest({ action: 'REMOVE_FROM_LIST', listName, items });
  return res === true;
}

// Core returns title/description/tags/category nested under `metadata` for
// SEARCH_QDN_RESOURCES; hoist them to the top level so consumers can keep
// reading resource.title etc. directly.
type RawQdnResource = QdnResource & {
  metadata?: { title?: string; description?: string; tags?: string[]; category?: string };
};

function normalizeResource(raw: RawQdnResource): QdnResource {
  const { metadata, ...rest } = raw;
  return {
    ...rest,
    title: metadata?.title ?? raw.title,
    description: metadata?.description ?? raw.description,
    tags: metadata?.tags ?? raw.tags,
    category: metadata?.category ?? raw.category,
  };
}

export async function searchResources(opts: {
  service?: string;
  query?: string;
  name?: string;
  reverse?: boolean;
  limit?: number;
  offset?: number;
}): Promise<QdnResource[]> {
  try {
    const res = await qdnRequest({
      action: 'SEARCH_QDN_RESOURCES',
      mode: 'ALL',
      includeMetadata: true,
      limit: opts.limit ?? 30,
      offset: opts.offset ?? 0,
      reverse: opts.reverse ?? true,
      ...(opts.service ? { service: opts.service } : {}),
      ...(opts.query   ? { query: opts.query }     : {}),
      ...(opts.name    ? { name: opts.name }       : {}),
    }) as RawQdnResource[];
    return (res ?? []).map(normalizeResource);
  } catch { return []; }
}

export async function fetchResourceAsBase64(service: string, name: string, identifier: string): Promise<string> {
  const res = await qdnRequest({
    action: 'FETCH_QDN_RESOURCE',
    service,
    name,
    identifier,
    encoding: 'BASE64',
  }) as string;
  return res;
}

export type ResourceProperties = {
  filename?: string;
  mimeType?: string;
  size?: number;
};

export async function fetchResourceProperties(
  service: string,
  name: string,
  identifier: string,
): Promise<ResourceProperties | null> {
  try {
    return await qdnRequest({
      action: 'GET_QDN_RESOURCE_PROPERTIES',
      service,
      name,
      identifier,
    }) as ResourceProperties;
  } catch { return null; }
}

export async function openInNewTab(address: string): Promise<void> {
  await qdnRequest({ action: 'OPEN_NEW_TAB', address });
}

export type PublishSourceSelection = {
  canceled: boolean;
  fileName?: string;
  kind?: 'file' | 'directory';
  size?: number;
  sourceToken?: string;
};

export async function selectPublishSource(kind: 'file' | 'directory'): Promise<PublishSourceSelection> {
  return await qdnRequest({ action: 'SELECT_QDN_PUBLISH_SOURCE', kind }) as PublishSourceSelection;
}

export async function publishResource(opts: {
  service: string;
  name: string;
  identifier: string;
  title?: string;
  description?: string;
  tags?: string[];
  category?: string;
  sourceToken?: string;
  data64?: string;
}): Promise<unknown> {
  return qdnRequest({
    action: 'PUBLISH_QDN_RESOURCE',
    service: opts.service,
    name: opts.name,
    identifier: opts.identifier,
    ...(opts.title ? { title: opts.title } : {}),
    ...(opts.description ? { description: opts.description } : {}),
    ...(opts.tags && opts.tags.length ? { tags: opts.tags } : {}),
    ...(opts.category ? { category: opts.category } : {}),
    ...(opts.sourceToken ? { sourceToken: opts.sourceToken } : {}),
    ...(opts.data64 ? { data64: opts.data64 } : {}),
  });
}

export async function getResourceStreamUrl(service: string, name: string, identifier: string): Promise<string> {
  const res = await qdnRequest({ action: 'GET_QDN_RESOURCE_STREAM_URL', service, name, identifier });
  if (typeof res === 'string') return res;
  if (res && typeof res === 'object') {
    const obj = res as Record<string, unknown>;
    const url = obj.url ?? obj.resourceUrl ?? obj.href;
    if (typeof url === 'string') return url;
  }
  throw new Error('Could not resolve a stream URL for this video.');
}

export interface ResourceStatusInfo {
  status: string;
  localChunkCount?: number;
  totalChunkCount?: number;
}

export async function getResourceStatus(service: string, name: string, identifier: string): Promise<ResourceStatusInfo> {
  const res = await qdnRequest({ action: 'GET_QDN_RESOURCE_STATUS', service, name, identifier, build: true });
  if (res && typeof res === 'object') {
    const obj = res as Record<string, unknown>;
    return {
      status: typeof obj.status === 'string' ? obj.status : 'UNKNOWN',
      localChunkCount: typeof obj.localChunkCount === 'number' ? obj.localChunkCount : undefined,
      totalChunkCount: typeof obj.totalChunkCount === 'number' ? obj.totalChunkCount : undefined,
    };
  }
  return { status: 'UNKNOWN' };
}

export async function listResources(opts: {
  service: string;
  name?: string;
  limit?: number;
  offset?: number;
  includeMetadata?: boolean;
}): Promise<QdnResource[]> {
  try {
    const res = await qdnRequest({
      action: 'LIST_QDN_RESOURCES',
      service: opts.service,
      includeMetadata: opts.includeMetadata ?? true,
      limit: opts.limit ?? 100,
      offset: opts.offset ?? 0,
      ...(opts.name ? { name: opts.name } : {}),
    }) as RawQdnResource[];
    return (res ?? []).map(normalizeResource);
  } catch { return []; }
}

export async function getResourceRatingSummary(service: string, name: string, identifier: string): Promise<number | null> {
  try {
    const res = await qdnRequest({ action: 'GET_RESOURCE_RATING', service, name, identifier }) as {
      summary?: { ratingCount?: number; weightedAverageRating?: number | null } | null;
    } | null;
    const summary = res?.summary;
    if (!summary || !summary.ratingCount) return null;
    return summary.weightedAverageRating ?? null;
  } catch { return null; }
}

export async function fetchResourceMetadata(service: string, name: string, identifier: string): Promise<{
  title?: string; description?: string; tags?: string[]; category?: string;
} | null> {
  try {
    return await qdnRequest({ action: 'GET_QDN_RESOURCE_METADATA', service, name, identifier }) as {
      title?: string; description?: string; tags?: string[]; category?: string;
    };
  } catch { return null; }
}
