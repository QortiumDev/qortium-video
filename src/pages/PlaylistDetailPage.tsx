import { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, IconButton, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useNavigate, useParams } from 'react-router-dom';
import { useColors } from '../theme/ColorTokensContext';
import { tokens } from '../theme/tokens';
import { thumbnailUrl } from '../lib/video';
import { loadPlaylist, publishPlaylist, removeVideoFromPayload, type Playlist, type PlaylistVideoRef } from '../lib/playlists';
import { fetchResourceMetadata, getUserAccount } from '../api/qortal';

export function PlaylistDetailPage() {
  const c = useColors();
  const navigate = useNavigate();
  const { name = '', identifier = '' } = useParams();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [accountName, setAccountName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadPlaylist(name, identifier).then(async (p) => {
      if (cancelled) return;
      setPlaylist(p);
      if (p) {
        const entries = await Promise.all(
          p.payload.videoRefs.map(async (ref) => {
            const meta = await fetchResourceMetadata('VIDEO', ref.name, ref.identifier);
            return [`${ref.name}:${ref.identifier}`, meta?.title || ref.identifier] as const;
          }),
        );
        if (!cancelled) setTitles(Object.fromEntries(entries));
      }
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [name, identifier]);

  useEffect(() => {
    getUserAccount().then((a) => setAccountName(a.name)).catch(() => {});
  }, []);

  function playFrom(index: number) {
    if (!playlist) return;
    const ref = playlist.payload.videoRefs[index];
    navigate(`/watch/${encodeURIComponent(ref.name)}/${encodeURIComponent(ref.identifier)}`, {
      state: { playlistTitle: playlist.payload.title, refs: playlist.payload.videoRefs, index },
    });
  }

  async function removeVideo(ref: PlaylistVideoRef) {
    if (!playlist || busy) return;
    setBusy(true);
    setError(null);
    try {
      const updated = removeVideoFromPayload(playlist.payload, ref);
      await publishPlaylist(playlist.ownerName, updated);
      setPlaylist({ ...playlist, payload: updated });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove this video.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: c.accent }} /></Box>;
  if (!playlist) return <Box sx={{ pt: 10, textAlign: 'center' }}><Typography sx={{ color: c.textSecondary }}>Playlist not found.</Typography></Box>;

  return (
    <Box sx={{ pt: `calc(var(--video-top-bar-height, ${tokens.spacing.topBarHeight}px) + 24px)`, pb: 4, px: { xs: 2, md: 4 }, maxWidth: 800, mx: 'auto' }}>
      <Typography sx={{ fontWeight: tokens.typography.weightBlack, fontSize: '1.4rem', color: c.textPrimary }}>
        {playlist.payload.title}
      </Typography>
      <Typography sx={{ fontSize: '0.8rem', color: c.textSecondary, mb: 1 }}>
        By {playlist.ownerName} · {playlist.payload.videoRefs.length} video{playlist.payload.videoRefs.length === 1 ? '' : 's'}
      </Typography>

      {playlist.payload.videoRefs.length > 0 && (
        <Button variant="contained" disableElevation startIcon={<PlayArrowIcon />} onClick={() => playFrom(0)} sx={{ bgcolor: c.accent, color: c.accentText, borderRadius: '50px', px: 2.5, mb: 2.5 }}>
          Play all
        </Button>
      )}

      {error && <Typography sx={{ fontSize: '0.78rem', color: c.error, mb: 1.5 }}>{error}</Typography>}

      {playlist.payload.videoRefs.map((ref, i) => (
        <Box key={`${ref.name}-${ref.identifier}`} onClick={() => playFrom(i)} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, cursor: 'pointer', borderBottom: `${tokens.shape.borderWidth} solid ${c.borderLight}` }}>
          <Typography sx={{ fontSize: '0.75rem', color: c.textSecondary, width: 20, textAlign: 'right' }}>{i + 1}</Typography>
          <Box component="img" src={thumbnailUrl(ref.name, ref.identifier)} alt="" sx={{ width: 96, aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: `${tokens.shape.radiusSm}px`, bgcolor: c.borderLight }} onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontSize: '0.82rem', fontWeight: tokens.typography.weightBold, color: c.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {titles[`${ref.name}:${ref.identifier}`] || ref.identifier}
            </Typography>
            <Typography sx={{ fontSize: '0.7rem', color: c.textSecondary }}>{ref.name}</Typography>
          </Box>
          {accountName === playlist.ownerName && (
            <IconButton
              size="small"
              disabled={busy}
              onClick={(e) => { e.stopPropagation(); void removeVideo(ref); }}
              sx={{ color: c.textSecondary, '&:hover': { color: c.error } }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      ))}
    </Box>
  );
}
