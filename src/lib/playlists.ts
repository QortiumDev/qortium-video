import { createShortId } from './id';

export const PLAYLIST_SCHEMA = 'qortium.video.playlist.v1';
export const PLAYLIST_PREFIX = 'qvideo.playlist.v1.';
const PLAYLIST_SERVICE = 'JSON';
const PLAYLIST_FILE_NAME = 'playlist.json';

export type PlaylistVideoRef = { name: string; identifier: string };

export type PlaylistPayload = {
  schema: typeof PLAYLIST_SCHEMA;
  id: string;
  title: string;
  description: string;
  videoRefs: PlaylistVideoRef[];
  createdAt: number;
  updatedAt: number;
};

export type Playlist = {
  identifier: string;
  ownerName: string;
  payload: PlaylistPayload;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function getString(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function getNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeVideoRefs(value: unknown): PlaylistVideoRef[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .map((v) => ({ name: getString(v.name), identifier: getString(v.identifier) }))
    .filter((r) => r.name && r.identifier);
}

function normalizePayload(value: unknown): PlaylistPayload | null {
  if (!isRecord(value) || value.schema !== PLAYLIST_SCHEMA) return null;
  const id = getString(value.id);
  const title = getString(value.title);
  const createdAt = getNumber(value.createdAt) ?? 0;
  if (!id || !title || !createdAt) return null;
  return {
    schema: PLAYLIST_SCHEMA,
    id,
    title,
    description: getString(value.description),
    videoRefs: normalizeVideoRefs(value.videoRefs),
    createdAt,
    updatedAt: getNumber(value.updatedAt) ?? createdAt,
  };
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
  return btoa(binary);
}
function jsonToBase64(value: unknown): string { return bytesToBase64(new TextEncoder().encode(JSON.stringify(value))); }

export function buildPlaylistIdentifier(id: string): string {
  return `${PLAYLIST_PREFIX}${id}`;
}

export function createPlaylistPayload(title: string, description: string): PlaylistPayload {
  const now = Date.now();
  return {
    schema: PLAYLIST_SCHEMA,
    id: createShortId(),
    title: title.trim(),
    description: description.trim(),
    videoRefs: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function addVideoToPayload(payload: PlaylistPayload, ref: PlaylistVideoRef): PlaylistPayload {
  if (payload.videoRefs.some((r) => r.name === ref.name && r.identifier === ref.identifier)) return payload;
  return { ...payload, videoRefs: [...payload.videoRefs, ref], updatedAt: Date.now() };
}

export function removeVideoFromPayload(payload: PlaylistPayload, ref: PlaylistVideoRef): PlaylistPayload {
  return {
    ...payload,
    videoRefs: payload.videoRefs.filter((r) => !(r.name === ref.name && r.identifier === ref.identifier)),
    updatedAt: Date.now(),
  };
}

export async function publishPlaylist(ownerName: string, payload: PlaylistPayload): Promise<unknown> {
  return qdnRequest({
    action: 'PUBLISH_QDN_RESOURCE',
    service: PLAYLIST_SERVICE,
    name: ownerName,
    identifier: buildPlaylistIdentifier(payload.id),
    filename: PLAYLIST_FILE_NAME,
    title: payload.title.slice(0, 80),
    description: payload.description.slice(0, 240),
    tags: ['qortium-video', 'playlist'],
    data64: jsonToBase64(payload),
  });
}

export async function deletePlaylist(ownerName: string, identifier: string): Promise<unknown> {
  return qdnRequest({ action: 'DELETE_QDN_RESOURCE', service: PLAYLIST_SERVICE, name: ownerName, identifier });
}

export async function loadOwnPlaylists(ownerName: string): Promise<Playlist[]> {
  const raw = await qdnRequest({
    action: 'LIST_QDN_RESOURCES',
    service: PLAYLIST_SERVICE,
    name: ownerName,
    includeMetadata: false,
    limit: 200,
  });
  const list = Array.isArray(raw) ? raw : [];
  const playlists: Playlist[] = [];
  for (const item of list) {
    if (!isRecord(item)) continue;
    const identifier = getString(item.identifier);
    if (!identifier.startsWith(PLAYLIST_PREFIX)) continue;
    const playlist = await loadPlaylist(ownerName, identifier);
    if (playlist) playlists.push(playlist);
  }
  return playlists.sort((a, b) => b.payload.updatedAt - a.payload.updatedAt);
}

export async function loadPlaylist(ownerName: string, identifier: string): Promise<Playlist | null> {
  try {
    const value = await qdnRequest({
      action: 'FETCH_QDN_RESOURCE',
      service: PLAYLIST_SERVICE,
      name: ownerName,
      identifier,
      maxBytes: 200_000,
    });
    const text = typeof value === 'string' ? value : '';
    if (!text) return null;
    const payload = normalizePayload(JSON.parse(text));
    if (!payload) return null;
    return { identifier, ownerName, payload };
  } catch { return null; }
}
