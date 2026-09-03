import { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useColors } from '../theme/ColorTokensContext';
import { tokens } from '../theme/tokens';
import { fetchUpNext, thumbnailUrl, type RankedVideo } from '../lib/video';

export function UpNextList({ currentName, currentIdentifier }: { currentName: string; currentIdentifier: string }) {
  const c = useColors();
  const navigate = useNavigate();
  const [items, setItems] = useState<RankedVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchUpNext(currentName, currentIdentifier).then((r) => { if (!cancelled) { setItems(r); setLoading(false); } });
    return () => { cancelled = true; };
  }, [currentName, currentIdentifier]);

  return (
    <Box>
      <Typography sx={{ fontSize: '0.8rem', fontWeight: tokens.typography.weightBold, color: c.textPrimary, mb: 1 }}>
        Up Next
      </Typography>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={18} sx={{ color: c.accent }} /></Box>
      ) : (
        items.map(({ resource, rating }) => (
          <Box
            key={`${resource.name}-${resource.identifier}`}
            onClick={() => navigate(`/watch/${encodeURIComponent(resource.name)}/${encodeURIComponent(resource.identifier)}`)}
            sx={{ display: 'flex', gap: 1, cursor: 'pointer', mb: 1, '&:hover .up-next-title': { color: c.accent } }}
          >
            <Box
              component="img"
              src={thumbnailUrl(resource.name, resource.identifier)}
              alt=""
              sx={{ width: 96, aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: `${tokens.shape.radiusSm}px`, bgcolor: c.borderLight, flexShrink: 0 }}
              onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography className="up-next-title" sx={{ fontSize: '0.75rem', fontWeight: tokens.typography.weightBold, color: c.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {resource.title || resource.identifier}
              </Typography>
              <Typography sx={{ fontSize: '0.68rem', color: c.textSecondary }}>
                {resource.name}{rating !== null ? ` · ${rating.toFixed(1)}★` : ''}
              </Typography>
            </Box>
          </Box>
        ))
      )}
    </Box>
  );
}
