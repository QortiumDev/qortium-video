// Short, sortable-ish id: a base36 timestamp plus 5 random bytes. QDN arbitrary-
// transaction identifiers are capped at 64 bytes, so this stays comfortably
// under any prefix scheme built on top of it.
export function createShortId(): string {
  const time = Date.now().toString(36);
  const randomBytes = new Uint8Array(5);
  crypto.getRandomValues(randomBytes);
  const random = Array.from(randomBytes, (b) => b.toString(36).padStart(2, '0')).join('');
  return `${time}${random}`;
}
