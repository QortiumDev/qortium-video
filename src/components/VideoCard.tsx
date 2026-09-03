import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import { useNavigate } from 'react-router-dom';
import { useColors } from '../theme/ColorTokensContext';
import { tokens } from '../theme/tokens';
import { thumbnailUrl } from '../lib/video';
import { getResourceRatingSummary } from '../api/qortal';
import type { QdnResource } from '../types';

const ratingCache = new Map<string, number | null>();

export function VideoCard({ video }: { video: QdnResource }) {
  const c = useColors();
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);
  const key = `${video.name}:${video.identifier}`;
  const [rating, setRating] = useState<number | null>(() => ratingCache.get(key) ?? null);

  useEffect(() => {
    if (ratingCache.has(key)) { setRating(ratingCache.get(key) ?? null); return; }
    let cancelled = false;
    getResourceRatingSummary('VIDEO', video.name, video.identifier).then((r) => {
      ratingCache.set(key, r);
      if (!cancelled) setRating(r);
    });
    return () => { cancelled = true; };
  }, [key, video.name, video.identifier]);

  return (
    <Box
      onClick={() => navigate(`/watch/${encodeURIComponent(video.name)}/${encodeURIComponent(video.identifier)}`)}
      sx={{
        cursor: 'pointer',
        borderRadius: `${tokens.shape.radius}px`,
        overflow: 'hidden',
        border: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
        transition: '0.12s ease',
        '&:hover': { borderColor: c.accent },
      }}
    >
      <Box sx={{ position: 'relative', aspectRatio: '16 / 9', bgcolor: c.borderLight }}>
        {!failed ? (
          <Box
            component="img"
            src={thumbnailUrl(video.name, video.identifier)}
            alt={video.title || video.identifier}
            loading="lazy"
            onError={() => setFailed(true)}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : null}
      </Box>
      <Box sx={{ p: 1.25 }}>
        <Typography sx={{ fontSize: '0.82rem', fontWeight: tokens.typography.weightBold, color: c.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {video.title || video.identifier}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
          <Typography sx={{ fontSize: '0.72rem', color: c.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {video.name}
          </Typography>
          {rating !== null && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
              <StarIcon sx={{ fontSize: '0.8rem', color: c.accent }} />
              <Typography sx={{ fontSize: '0.7rem', color: c.accent, fontWeight: tokens.typography.weightBold }}>
                {rating.toFixed(1)}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
