import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Box, IconButton, Typography } from '@mui/material';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import { useColors } from '../theme/ColorTokensContext';
import { tokens } from '../theme/tokens';
import { VideoPlayer } from '../components/VideoPlayer';
import { RatingControl } from '../components/layout/RatingControl';
import { CommentThread } from '../components/CommentThread';
import { UpNextList } from '../components/UpNextList';
import { AddToPlaylistButton } from '../components/AddToPlaylistButton';
import { fetchResourceMetadata } from '../api/qortal';
import type { PlaylistVideoRef } from '../lib/playlists';

type WatchState = { playlistTitle: string; refs: PlaylistVideoRef[]; index: number } | undefined;

export function WatchPage() {
  const c = useColors();
  const { name = '', identifier = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as WatchState;
  const [meta, setMeta] = useState<{ title?: string; description?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setMeta(null);
    fetchResourceMetadata('VIDEO', name, identifier).then((m) => { if (!cancelled) setMeta(m); });
    return () => { cancelled = true; };
  }, [name, identifier]);

  if (!name || !identifier) return null;

  function goToPlaylistIndex(nextIndex: number) {
    if (!state || nextIndex < 0 || nextIndex >= state.refs.length) return;
    const ref = state.refs[nextIndex];
    navigate(`/watch/${encodeURIComponent(ref.name)}/${encodeURIComponent(ref.identifier)}`, {
      state: { playlistTitle: state.playlistTitle, refs: state.refs, index: nextIndex },
    });
  }

  return (
    <Box sx={{ pt: `calc(var(--video-top-bar-height, ${tokens.spacing.topBarHeight}px) + 24px)`, pb: 4, px: { xs: 2, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <VideoPlayer
            name={name}
            identifier={identifier}
            onEnded={state && state.index + 1 < state.refs.length ? () => goToPlaylistIndex(state.index + 1) : undefined}
          />

          <Typography sx={{ fontSize: '1.1rem', fontWeight: tokens.typography.weightBold, color: c.textPrimary, mt: 2 }}>
            {meta?.title || identifier}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5, flexWrap: 'wrap', gap: 1 }}>
            <Typography
              sx={{ fontSize: '0.8rem', color: c.textSecondary, cursor: 'pointer', '&:hover': { color: c.accent } }}
              onClick={() => navigate(`/channel/${encodeURIComponent(name)}`)}
            >
              {name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <RatingControl qdnName={name} service="VIDEO" identifier={identifier} />
              <AddToPlaylistButton videoName={name} videoIdentifier={identifier} />
            </Box>
          </Box>

          {meta?.description && (
            <Typography sx={{ fontSize: '0.82rem', color: c.textPrimary, mt: 1.5, whiteSpace: 'pre-wrap' }}>
              {meta.description}
            </Typography>
          )}

          {state && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5, p: 1, borderRadius: `${tokens.shape.radius}px`, bgcolor: c.borderLight }}>
              <IconButton size="small" disabled={state.index <= 0} onClick={() => goToPlaylistIndex(state.index - 1)}>
                <SkipPreviousIcon fontSize="small" />
              </IconButton>
              <Typography sx={{ fontSize: '0.75rem', color: c.textPrimary, flex: 1 }}>
                Playlist: {state.playlistTitle} ({state.index + 1}/{state.refs.length})
              </Typography>
              <IconButton size="small" disabled={state.index >= state.refs.length - 1} onClick={() => goToPlaylistIndex(state.index + 1)}>
                <SkipNextIcon fontSize="small" />
              </IconButton>
            </Box>
          )}

          <CommentThread key={`${name}/${identifier}`} videoName={name} videoIdentifier={identifier} />
        </Box>

        <Box sx={{ width: { xs: '100%', md: 320 }, flexShrink: 0 }}>
          <UpNextList currentName={name} currentIdentifier={identifier} />
        </Box>
      </Box>
    </Box>
  );
}
