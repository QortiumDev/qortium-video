import { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useColors } from '../theme/ColorTokensContext';
import { tokens } from '../theme/tokens';
import { listResources } from '../api/qortal';
import { VideoCard } from '../components/VideoCard';
import { loadOwnPlaylists, type Playlist } from '../lib/playlists';
import { useQdnLists } from '../hooks/useQdnLists';
import { resourcePatterns } from '../lib/qdnPattern';
import type { QdnResource } from '../types';

export function ChannelPage() {
  const c = useColors();
  const navigate = useNavigate();
  const { name = '' } = useParams();
  const { follow, unfollow, isFollowed, loaded: listsLoaded } = useQdnLists();
  const [videos, setVideos] = useState<QdnResource[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      listResources({ service: 'VIDEO', name, limit: 100 }),
      loadOwnPlaylists(name),
    ]).then(([v, p]) => {
      setVideos(v);
      setPlaylists(p);
      setLoading(false);
    });
  }, [name]);

  const pattern = resourcePatterns('VIDEO', name, undefined).byName;
  const followed = listsLoaded && isFollowed(pattern);

  return (
    <Box sx={{ pt: `calc(var(--video-top-bar-height, ${tokens.spacing.topBarHeight}px) + 24px)`, pb: 4, px: { xs: 2, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
        <Typography sx={{ fontWeight: tokens.typography.weightBlack, fontSize: '1.4rem', color: c.textPrimary }}>{name}</Typography>
        <Button
          variant={followed ? 'outlined' : 'contained'} disableElevation
          onClick={() => void (followed ? unfollow(pattern) : follow(pattern))}
          sx={followed
            ? { borderColor: c.accent, color: c.accent, borderRadius: '50px', px: 2.5 }
            : { bgcolor: c.accent, color: c.accentText, borderRadius: '50px', px: 2.5, '&:hover': { bgcolor: c.accentHover } }}
        >
          {followed ? 'Following' : 'Follow'}
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={24} sx={{ color: c.accent }} /></Box>
      ) : (
        <>
          {playlists.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: tokens.typography.weightBold, color: c.textPrimary, mb: 1 }}>Playlists</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {playlists.map((p) => (
                  <Button
                    key={p.identifier} size="small"
                    onClick={() => navigate(`/playlist/${encodeURIComponent(name)}/${encodeURIComponent(p.identifier)}`)}
                    sx={{ border: `${tokens.shape.borderWidth} solid ${c.borderLight}`, borderRadius: '50px', color: c.textPrimary }}
                  >
                    {p.payload.title} ({p.payload.videoRefs.length})
                  </Button>
                ))}
              </Box>
            </Box>
          )}

          <Typography sx={{ fontSize: '0.85rem', fontWeight: tokens.typography.weightBold, color: c.textPrimary, mb: 1 }}>Videos</Typography>
          {videos.length === 0 ? (
            <Typography sx={{ fontSize: '0.82rem', color: c.textSecondary }}>No videos published yet.</Typography>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 2 }}>
              {videos.map((v) => (<VideoCard key={`${v.name}-${v.identifier}`} video={v} />))}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
