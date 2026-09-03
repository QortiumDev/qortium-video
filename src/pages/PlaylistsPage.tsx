import { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, TextField, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useNavigate } from 'react-router-dom';
import { useColors } from '../theme/ColorTokensContext';
import { tokens } from '../theme/tokens';
import { getUserAccount } from '../api/qortal';
import { createPlaylistPayload, deletePlaylist, loadOwnPlaylists, publishPlaylist, type Playlist } from '../lib/playlists';

export function PlaylistsPage() {
  const c = useColors();
  const navigate = useNavigate();
  const [accountName, setAccountName] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh(name: string) {
    setLoading(true);
    setPlaylists(await loadOwnPlaylists(name));
    setLoading(false);
  }

  useEffect(() => {
    getUserAccount().then((a) => {
      setAccountName(a.name);
      if (a.name) void refresh(a.name);
      else setLoading(false);
    });
  }, []);

  async function create() {
    if (!accountName || !newTitle.trim() || busy) return;
    setBusy(true);
    try {
      await publishPlaylist(accountName, createPlaylistPayload(newTitle, ''));
      setNewTitle('');
      await refresh(accountName);
    } finally {
      setBusy(false);
    }
  }

  async function remove(playlist: Playlist) {
    if (!accountName || busy) return;
    setBusy(true);
    try {
      await deletePlaylist(accountName, playlist.identifier);
      await refresh(accountName);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box sx={{ pt: `calc(var(--video-top-bar-height, ${tokens.spacing.topBarHeight}px) + 24px)`, pb: 4, px: { xs: 2, md: 4 }, maxWidth: 720, mx: 'auto' }}>
      <Typography sx={{ fontWeight: tokens.typography.weightBlack, fontSize: '1.4rem', color: c.textPrimary, mb: 2.5 }}>
        My Playlists
      </Typography>

      {!accountName ? (
        <Typography sx={{ fontSize: '0.82rem', color: c.textSecondary }}>Select an account to manage playlists.</Typography>
      ) : (
        <>
          <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            <TextField size="small" fullWidth placeholder="New playlist title…" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <Button variant="contained" disableElevation disabled={!newTitle.trim() || busy} onClick={() => void create()} sx={{ bgcolor: c.accent, color: c.accentText, borderRadius: '50px', px: 2.5 }}>
              Create
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={20} sx={{ color: c.accent }} /></Box>
          ) : playlists.length === 0 ? (
            <Typography sx={{ fontSize: '0.82rem', color: c.textSecondary }}>No playlists yet.</Typography>
          ) : (
            playlists.map((p) => (
              <Box key={p.identifier} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.25, borderBottom: `${tokens.shape.borderWidth} solid ${c.borderLight}` }}>
                <Box onClick={() => navigate(`/playlist/${encodeURIComponent(accountName)}/${encodeURIComponent(p.identifier)}`)} sx={{ cursor: 'pointer', minWidth: 0 }}>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: tokens.typography.weightBold, color: c.textPrimary }}>{p.payload.title}</Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: c.textSecondary }}>{p.payload.videoRefs.length} video{p.payload.videoRefs.length === 1 ? '' : 's'}</Typography>
                </Box>
                <Button size="small" startIcon={<DeleteOutlineIcon fontSize="small" />} disabled={busy} onClick={() => void remove(p)} sx={{ color: c.error }}>
                  Delete
                </Button>
              </Box>
            ))
          )}
        </>
      )}
    </Box>
  );
}
