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
