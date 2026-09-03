import { useEffect, useMemo, useState } from 'react';
import { Box, Button, CircularProgress, TextField, Typography } from '@mui/material';
import { useColors } from '../theme/ColorTokensContext';
import { tokens } from '../theme/tokens';
import { getUserAccount } from '../api/qortal';
import { createCommentPayload, loadCommentsForVideo, publishComment, type CommentResource } from '../lib/comments';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function Composer({ onSubmit, placeholder }: { onSubmit: (body: string) => Promise<void>; placeholder: string }) {
  const c = useColors();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!body.trim() || busy) return;
    setBusy(true);
    try {
      await onSubmit(body.trim());
      setBody('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
      <TextField size="small" fullWidth placeholder={placeholder} value={body} onChange={(e) => setBody(e.target.value)} multiline maxRows={4} />
      <Button
        variant="contained" disableElevation disabled={busy || !body.trim()} onClick={() => void submit()}
        sx={{ bgcolor: c.accent, color: c.accentText, borderRadius: '50px', px: 2, '&:hover': { bgcolor: c.accentHover } }}
      >
        {busy ? <CircularProgress size={16} sx={{ color: c.accentText }} /> : 'Post'}
      </Button>
    </Box>
  );
}

function CommentRow({ comment, onReply }: { comment: CommentResource; onReply: (body: string) => Promise<void> }) {
  const c = useColors();
  const [replying, setReplying] = useState(false);

  return (
    <Box sx={{ py: 1.25, borderBottom: `${tokens.shape.borderWidth} solid ${c.borderLight}` }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
        <Typography sx={{ fontSize: '0.8rem', fontWeight: tokens.typography.weightBold, color: c.textPrimary }}>
          {comment.commenterName}
        </Typography>
        <Typography sx={{ fontSize: '0.68rem', color: c.textSecondary }}>{formatDate(comment.created)}</Typography>
      </Box>
      <Typography sx={{ fontSize: '0.8rem', color: c.textPrimary, mt: 0.25, whiteSpace: 'pre-wrap' }}>
        {comment.payload.body}
      </Typography>
      <Button
        size="small" onClick={() => setReplying((v) => !v)}
        sx={{ fontSize: '0.68rem', color: c.textSecondary, mt: 0.25, p: 0, minWidth: 0, '&:hover': { bgcolor: 'transparent', color: c.accent } }}
      >
        Reply
      </Button>
      {replying && (
        <Composer placeholder="Write a reply…" onSubmit={async (body) => { await onReply(body); setReplying(false); }} />
      )}
    </Box>
  );
}

export function CommentThread({ videoName, videoIdentifier }: { videoName: string; videoIdentifier: string }) {
  const c = useColors();
  const [comments, setComments] = useState<CommentResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountName, setAccountName] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      setComments(await loadCommentsForVideo(videoName, videoIdentifier));
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    getUserAccount().then((a) => setAccountName(a.name)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoName, videoIdentifier]);

  const topLevel = useMemo(() => comments.filter((c2) => !c2.payload.parentCommentId), [comments]);
  const repliesByParent = useMemo(() => {
    const map = new Map<string, CommentResource[]>();
    for (const c2 of comments) {
      if (!c2.payload.parentCommentId) continue;
      const list = map.get(c2.payload.parentCommentId) ?? [];
      list.push(c2);
      map.set(c2.payload.parentCommentId, list);
    }
    return map;
  }, [comments]);

  async function postComment(body: string, parentCommentId: string | null) {
    if (!accountName) throw new Error('No account selected.');
    const payload = createCommentPayload(videoName, videoIdentifier, body, parentCommentId);
    await publishComment(accountName, payload);
    await refresh();
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Typography sx={{ fontSize: '0.9rem', fontWeight: tokens.typography.weightBold, color: c.textPrimary, mb: 1 }}>
        {comments.length} Comment{comments.length === 1 ? '' : 's'}
      </Typography>

      {accountName ? (
        <Composer placeholder="Add a comment…" onSubmit={(body) => postComment(body, null)} />
      ) : (
        <Typography sx={{ fontSize: '0.75rem', color: c.textSecondary }}>Select an account to comment.</Typography>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={20} sx={{ color: c.accent }} /></Box>
      ) : (
        <Box sx={{ mt: 2 }}>
          {topLevel.map((comment) => (
            <Box key={comment.identifier}>
              <CommentRow comment={comment} onReply={(body) => postComment(body, comment.payload.id)} />
              {(repliesByParent.get(comment.payload.id) ?? []).map((reply) => (
                <Box key={reply.identifier} sx={{ pl: 3 }}>
                  <CommentRow comment={reply} onReply={(body) => postComment(body, comment.payload.id)} />
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
