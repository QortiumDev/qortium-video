import { createShortId } from './id';

export const COMMENT_SCHEMA = 'qortium.video.comment.v1';
export const COMMENT_PREFIX = 'qvideo.c1.';
const COMMENT_SERVICE = 'JSON';
const COMMENT_FILE_NAME = 'comment.json';
const MAX_COMMENT_BYTES = 50_000;

export type CommentPayload = {
  schema: typeof COMMENT_SCHEMA;
  id: string;
  videoName: string;
  videoIdentifier: string;
  parentCommentId: string | null;
  body: string;
  createdAt: number;
};

export type CommentResource = {
  identifier: string;
  commenterName: string;
  created: number;
  payload: CommentPayload;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function getNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function buildCommentIdentifier(id: string): string {
  return `${COMMENT_PREFIX}${id}`;
}

function normalizePayload(value: unknown): CommentPayload | null {
  if (!isRecord(value) || value.schema !== COMMENT_SCHEMA) return null;
  const id = getString(value.id);
  const videoName = getString(value.videoName);
  const videoIdentifier = getString(value.videoIdentifier);
  const body = getString(value.body);
  const createdAt = getNumber(value.createdAt) ?? 0;
  if (!id || !videoName || !videoIdentifier || !body || !createdAt) return null;
  const parentCommentId = getString(value.parentCommentId) || null;
  return { schema: COMMENT_SCHEMA, id, videoName, videoIdentifier, parentCommentId, body, createdAt };
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
  }
  return btoa(binary);
}

function jsonToBase64(value: unknown): string {
  return bytesToBase64(new TextEncoder().encode(JSON.stringify(value)));
}

async function fetchCommentPayload(name: string, identifier: string): Promise<CommentPayload | null> {
  try {
    const value = await qdnRequest({
      action: 'FETCH_QDN_RESOURCE',
      service: COMMENT_SERVICE,
      name,
      identifier,
      maxBytes: MAX_COMMENT_BYTES,
    });
    // FETCH_QDN_RESOURCE auto-parses JSON-shaped content into an object before
    // returning it (Home's parseResponseData detects `{`/`[` bodies and calls
    // JSON.parse itself) - it does NOT hand back the raw string in that case.
    // Only parse ourselves when it genuinely came back as a string.
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!parsed) return null;
    return normalizePayload(parsed);
  } catch { return null; }
}

// Cache fetched comment payloads keyed by identifier, tagged with the
// resource's latestSignature - a QDN resource is immutable per signature, so a
// later search returning the same signature can skip re-downloading it.
type CachedComment = { signature: string; value: CommentResource };
const commentCache = new Map<string, CachedComment>();

async function toCommentResource(raw: Record<string, unknown>): Promise<CommentResource | null> {
  const identifier = getString(raw.identifier);
  const name = getString(raw.name);
  if (!identifier || !name) return null;
  const signature = getString(raw.latestSignature) || null;

  if (signature) {
    const cached = commentCache.get(identifier);
    if (cached && cached.signature === signature) return cached.value;
  }

  const payload = await fetchCommentPayload(name, identifier);
  if (!payload) return null;

  const value: CommentResource = {
    identifier,
    commenterName: name,
    created: getNumber(raw.created) ?? payload.createdAt,
    payload,
  };
  if (signature) commentCache.set(identifier, { signature, value });
  return value;
}

// Comments are published under the COMMENTER's name, not the video owner's, so
// they can't be found via a name-scoped list - search the JSON service by
// identifier prefix across all publishers, then filter client-side by which
// video the payload targets. Mirrors qortium-help's searchFeedbackResources.
export async function loadCommentsForVideo(videoName: string, videoIdentifier: string, limit = 300): Promise<CommentResource[]> {
  const raw = await qdnRequest({
    action: 'SEARCH_QDN_RESOURCES',
    service: COMMENT_SERVICE,
    identifier: COMMENT_PREFIX,
    prefix: true,
    mode: 'ALL',
    includeMetadata: false,
    reverse: true,
    limit,
  });
  const list = Array.isArray(raw) ? raw : [];
  const resolved = await Promise.all(
    list.filter(isRecord).map((r) => toCommentResource(r as Record<string, unknown>)),
  );

  // Drop cache entries for resources no longer returned (deleted/aged out) so the
  // cache stays bounded to the live result set.
  const liveKeys = new Set(list.filter(isRecord).map((r) => getString(r.identifier)));
  for (const key of commentCache.keys()) {
    if (!liveKeys.has(key)) {
      commentCache.delete(key);
    }
  }

  return resolved
    .filter((c): c is CommentResource => !!c)
    .filter((c) => c.payload.videoName === videoName && c.payload.videoIdentifier === videoIdentifier)
    .sort((a, b) => b.created - a.created);
}

export function createCommentPayload(
  videoName: string,
  videoIdentifier: string,
  body: string,
  parentCommentId: string | null,
): CommentPayload {
  return {
    schema: COMMENT_SCHEMA,
    id: createShortId(),
    videoName,
    videoIdentifier,
    parentCommentId,
    body: body.trim(),
    createdAt: Date.now(),
  };
}

export async function publishComment(commenterName: string, payload: CommentPayload): Promise<unknown> {
  return qdnRequest({
    action: 'PUBLISH_QDN_RESOURCE',
    service: COMMENT_SERVICE,
    name: commenterName,
    identifier: buildCommentIdentifier(payload.id),
    filename: COMMENT_FILE_NAME,
    description: payload.body.slice(0, 240),
    tags: ['qortium-video', 'comment'],
    data64: jsonToBase64(payload),
  });
}
