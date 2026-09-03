import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Chip, CircularProgress, InputAdornment, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MovieIcon from '@mui/icons-material/Movie';
import { useColors } from '../theme/ColorTokensContext';
import { tokens } from '../theme/tokens';
import { searchResources } from '../api/qortal';
import { VideoCard } from '../components/VideoCard';
import { fetchTopRatedVideos } from '../lib/video';
import { useQdnLists } from '../hooks/useQdnLists';
import { resourcePatterns } from '../lib/qdnPattern';
import type { QdnResource } from '../types';

const PAGE_SIZE = 30;
const VIDEO_SERVICE = 'VIDEO';

type SortOrder = 'newest' | 'top-rated';

export function HomePage() {
  const c = useColors();
  const { blocked, loaded: listsLoaded, isBlocked } = useQdnLists();
  const [queryInput, setQueryInput] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [results, setResults] = useState<QdnResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const offsetRef = useRef(0);

  const doSearch = useCallback(async (query: string, order: SortOrder, replace: boolean) => {
    if (replace) setLoading(true); else setLoadingMore(true);

    if (order === 'top-rated') {
      const top = await fetchTopRatedVideos();
      setResults(top);
      setHasMore(false);
      offsetRef.current = top.length;
    } else {
      const currentOffset = replace ? 0 : offsetRef.current;
      const res = await searchResources({ service: VIDEO_SERVICE, query: query || undefined, reverse: true, limit: PAGE_SIZE, offset: currentOffset });
      if (replace) { setResults(res); offsetRef.current = res.length; }
      else { setResults((prev) => [...prev, ...res]); offsetRef.current += res.length; }
      setHasMore(res.length === PAGE_SIZE);
    }
    if (replace) setLoading(false); else setLoadingMore(false);
  }, []);

  useEffect(() => { void doSearch('', 'newest', true); }, [doSearch]);

  function handleSearch() {
    setActiveQuery(queryInput);
    void doSearch(queryInput, sortOrder, true);
  }

  function handleSortChange(order: SortOrder) {
    setSortOrder(order);
    void doSearch(activeQuery, order, true);
  }

  const visible = useMemo(() => {
    if (!listsLoaded) return results;
    return results.filter((r) => {
      const patterns = resourcePatterns(r.service, r.name, r.identifier);
      return !isBlocked(patterns.exact) && !isBlocked(patterns.byName) && !isBlocked(patterns.byService);
    });
  }, [results, listsLoaded, blocked, isBlocked]);

  const sortChipSx = (active: boolean) => ({
    fontSize: '0.65rem', fontWeight: tokens.typography.weightBold, letterSpacing: '0.08em',
    textTransform: 'uppercase' as const, borderRadius: '50px', cursor: 'pointer',
    bgcolor: active ? c.accent : 'transparent', color: active ? c.accentText : c.textSecondary,
    border: `1.5px solid ${active ? c.accent : c.borderLight}`,
    '&:hover': { bgcolor: active ? c.accentHover : c.borderLight },
  });

  return (
    <Box sx={{ pt: `calc(var(--video-top-bar-height, ${tokens.spacing.topBarHeight}px) + 24px)`, pb: 4, px: { xs: 2, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Search videos by publisher, title, or keyword…"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: '1rem', color: c.textSecondary }} /></InputAdornment> }}
          sx={{ flex: 1, minWidth: 200 }}
        />
        <Button variant="contained" disableElevation onClick={handleSearch} disabled={loading} sx={{ bgcolor: c.accent, color: c.accentText, borderRadius: '50px', px: 2.5, '&:hover': { bgcolor: c.accentHover } }}>
          Search
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 0.75, mb: 2.5 }}>
        <Chip label="Newest" size="small" onClick={() => handleSortChange('newest')} sx={sortChipSx(sortOrder === 'newest')} />
        <Chip label="Top Rated" size="small" onClick={() => handleSortChange('top-rated')} sx={sortChipSx(sortOrder === 'top-rated')} />
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={24} sx={{ color: c.accent }} /></Box>
      ) : visible.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <MovieIcon sx={{ fontSize: '2rem', color: c.textSecondary, opacity: 0.3, mb: 1 }} />
          <Typography sx={{ fontSize: '0.85rem', color: c.textSecondary }}>No videos found.</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 2 }}>
          {visible.map((v) => (<VideoCard key={`${v.name}-${v.identifier}`} video={v} />))}
        </Box>
      )}

      {sortOrder === 'newest' && results.length > 0 && hasMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Button variant="outlined" size="small" onClick={() => void doSearch(activeQuery, sortOrder, false)} disabled={loadingMore} sx={{ borderColor: c.accent, color: c.accent, borderRadius: '50px', px: 2.5 }}>
            {loadingMore ? <CircularProgress size={12} sx={{ color: c.accent }} /> : 'Load more'}
          </Button>
        </Box>
      )}
    </Box>
  );
}
