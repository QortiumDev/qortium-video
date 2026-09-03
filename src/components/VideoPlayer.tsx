import { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, IconButton, Tooltip, Typography } from '@mui/material';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useColors } from '../theme/ColorTokensContext';
import { tokens } from '../theme/tokens';
import { resolveVideoStreamUrl, waitForVideoReady } from '../lib/video';

export function VideoPlayer({ name, identifier, onEnded }: { name: string; identifier: string; onEnded?: () => void }) {
  const c = useColors();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const autoPlayNextRef = useRef(false);
  const [src, setSrc] = useState<string | null>(null);
  const [statusLabel, setStatusLabel] = useState('Loading…');
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    setError(null);
    setStatusLabel('Loading…');

    waitForVideoReady(name, identifier, {
      isCancelled: () => cancelled,
      onProgress: (status) => {
        if (cancelled) return;
        if (status.status === 'DOWNLOADING' && status.totalChunkCount) {
          setStatusLabel(`Downloading… ${status.localChunkCount ?? 0}/${status.totalChunkCount}`);
        } else {
          setStatusLabel(status.status.replace(/_/g, ' ').toLowerCase());
        }
      },
    })
      .then(() => { if (cancelled) return null; return resolveVideoStreamUrl(name, identifier); })
      .then((url) => { if (!cancelled && url) setSrc(url); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load this video.'); });

    return () => { cancelled = true; };
  }, [name, identifier]);

  // Resume playback automatically when a new src loads because the previous
  // video just ended (playlist auto-advance) - a continuation of playback the
  // user already started, which browsers generally permit even under strict
  // autoplay policies (unlike a bare `autoPlay` attribute on first load,
  // which Qortium Home's iframe Permissions Policy blocks - see the earlier
  // fix that removed it). Not set for a fresh/manual navigation to a video.
  useEffect(() => {
    if (!src || !autoPlayNextRef.current) return;
    autoPlayNextRef.current = false;
    videoRef.current?.play().catch(() => {});
  }, [src]);

  function handleEnded() {
    if (onEnded) {
      autoPlayNextRef.current = true;
      onEnded();
    }
  }

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    }
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  async function toggleFullscreen() {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {}
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16 / 9',
        bgcolor: '#000',
        borderRadius: isFullscreen ? 0 : `${tokens.shape.radius}px`,
        overflow: 'hidden',
      }}
    >
      {src ? (
        <video
          ref={videoRef}
          src={src}
          controls
          playsInline
          onEnded={handleEnded}
          style={{ width: '100%', height: '100%', display: 'block', backgroundColor: '#000' }}
        />
      ) : (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
          {error ? (
            <>
              <ErrorOutlineIcon sx={{ color: c.error }} />
              <Typography sx={{ fontSize: '0.8rem', color: '#fff', textAlign: 'center', px: 3 }}>{error}</Typography>
            </>
          ) : (
            <>
              <CircularProgress size={28} sx={{ color: c.accent }} />
              <Typography sx={{ fontSize: '0.75rem', color: '#fff' }}>{statusLabel}</Typography>
            </>
          )}
        </Box>
      )}

      {src && (
        <Tooltip title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
          <IconButton
            onClick={() => void toggleFullscreen()}
            sx={{ position: 'absolute', top: 8, right: 8, color: '#fff', bgcolor: 'rgba(0,0,0,0.4)', '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' } }}
          >
            {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}
