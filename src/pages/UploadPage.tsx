import { useState } from 'react';
import { Box, Button, CircularProgress, TextField, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useNavigate } from 'react-router-dom';
import { useColors } from '../theme/ColorTokensContext';
import { tokens } from '../theme/tokens';
import { getUserAccount, publishResource, selectPublishSource } from '../api/qortal';
import { createShortId } from '../lib/id';

export function UploadPage() {
  const c = useColors();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [category, setCategory] = useState('');

  const [videoSource, setVideoSource] = useState<{ fileName?: string; sourceToken?: string } | null>(null);
  const [thumbnailSource, setThumbnailSource] = useState<{ fileName?: string; sourceToken?: string } | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickVideo() {
    setError(null);
    const res = await selectPublishSource('file');
    if (res.canceled) return;
    setVideoSource({ fileName: res.fileName, sourceToken: res.sourceToken });
  }

  async function pickThumbnail() {
    setError(null);
    const res = await selectPublishSource('file');
    if (res.canceled) return;
    setThumbnailSource({ fileName: res.fileName, sourceToken: res.sourceToken });
  }

  async function publish() {
    if (busy) return;
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!videoSource?.sourceToken) { setError('Pick a video file first.'); return; }

    setBusy(true);
    setError(null);
    try {
      const account = await getUserAccount();
      if (!account.name) throw new Error('The selected account has no registered name to publish under.');

      const identifier = createShortId();
      const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 5);

      await publishResource({
        service: 'VIDEO',
        name: account.name,
        identifier,
        title: title.trim(),
        description: description.trim(),
        tags,
        category: category.trim() || undefined,
        sourceToken: videoSource.sourceToken,
      });

      if (thumbnailSource?.sourceToken) {
        await publishResource({
          service: 'THUMBNAIL',
          name: account.name,
          identifier,
          sourceToken: thumbnailSource.sourceToken,
        });
      }

      navigate(`/watch/${encodeURIComponent(account.name)}/${encodeURIComponent(identifier)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publish failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box sx={{ pt: `calc(var(--video-top-bar-height, ${tokens.spacing.topBarHeight}px) + 24px)`, pb: 4, px: { xs: 2, md: 4 }, maxWidth: 640, mx: 'auto' }}>
      <Typography sx={{ fontWeight: tokens.typography.weightBlack, fontSize: '1.4rem', color: c.textPrimary, mb: 2.5 }}>
        Upload a video
      </Typography>

      <TextField fullWidth size="small" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} sx={{ mb: 2 }} />
      <TextField fullWidth size="small" label="Description" value={description} onChange={(e) => setDescription(e.target.value)} multiline minRows={3} sx={{ mb: 2 }} />
      <TextField fullWidth size="small" label="Tags (comma-separated, up to 5)" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} sx={{ mb: 2 }} />
      <TextField fullWidth size="small" label="Category" value={category} onChange={(e) => setCategory(e.target.value)} sx={{ mb: 3 }} />

      <Button
        startIcon={<UploadFileIcon fontSize="small" />} onClick={() => void pickVideo()}
        sx={{ color: c.textSecondary, border: `${tokens.shape.borderWidth} solid ${c.borderLight}`, borderRadius: `${tokens.shape.radius}px`, mb: 1.5, justifyContent: 'flex-start', px: 2, width: '100%' }}
      >
        {videoSource?.fileName || 'Choose video file…'}
      </Button>

      <Button
        startIcon={<UploadFileIcon fontSize="small" />} onClick={() => void pickThumbnail()}
        sx={{ color: c.textSecondary, border: `${tokens.shape.borderWidth} solid ${c.borderLight}`, borderRadius: `${tokens.shape.radius}px`, mb: 2.5, justifyContent: 'flex-start', px: 2, width: '100%' }}
      >
        {thumbnailSource?.fileName || 'Choose thumbnail image (optional)…'}
      </Button>

      {error && <Typography sx={{ fontSize: '0.78rem', color: c.error, mb: 1.5 }}>{error}</Typography>}

      <Button
        variant="contained" disableElevation disabled={busy} onClick={() => void publish()}
        sx={{ bgcolor: c.accent, color: c.accentText, borderRadius: '50px', px: 3, '&:hover': { bgcolor: c.accentHover } }}
      >
        {busy ? <CircularProgress size={16} sx={{ color: c.accentText }} /> : 'Publish'}
      </Button>
    </Box>
  );
}
