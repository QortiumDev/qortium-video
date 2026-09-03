import { useEffect, useState, type MouseEvent } from 'react';
import { Button, CircularProgress, Menu, MenuItem, TextField } from '@mui/material';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import { useColors } from '../theme/ColorTokensContext';
import { getUserAccount } from '../api/qortal';
import { addVideoToPayload, createPlaylistPayload, loadOwnPlaylists, publishPlaylist, type Playlist } from '../lib/playlists';

export function AddToPlaylistButton({ videoName, videoIdentifier }: { videoName: string; videoIdentifier: string }) {
  const c = useColors();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [accountName, setAccountName] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getUserAccount().then((a) => setAccountName(a.name)).catch(() => {});
  }, []);

  async function open(e: MouseEvent<HTMLElement>) {
    setAnchor(e.currentTarget);
    if (!accountName) return;
    setLoading(true);
    setPlaylists(await loadOwnPlaylists(accountName));
    setLoading(false);
  }

  // Republishes the whole payload from the snapshot loaded when the menu opened -
  // a concurrent edit to the same playlist from another session would be silently
  // overwritten (last-write-wins, no conflict detection). Acceptable for now.
  async function addTo(playlist: Playlist) {
    if (busy) return;
    setBusy(true);
    try {
      const updated = addVideoToPayload(playlist.payload, { name: videoName, identifier: videoIdentifier });
      await publishPlaylist(playlist.ownerName, updated);
      setAnchor(null);
    } finally {
      setBusy(false);
    }
  }

  async function createAndAdd() {
    if (!accountName || !newTitle.trim() || busy) return;
    setBusy(true);
    try {
      const payload = addVideoToPayload(createPlaylistPayload(newTitle, ''), { name: videoName, identifier: videoIdentifier });
      await publishPlaylist(accountName, payload);
      setNewTitle('');
      setAnchor(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        size="small" startIcon={<PlaylistAddIcon fontSize="small" />} onClick={(e) => void open(e)}
        sx={{ color: c.textSecondary, borderRadius: '50px', '&:hover': { bgcolor: c.borderLight } }}
      >
        Save
      </Button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {!accountName ? (
          [<MenuItem key="__none" disabled>Select an account first</MenuItem>]
        ) : loading ? (
          [<MenuItem key="__loading" disabled><CircularProgress size={14} /></MenuItem>]
        ) : ([
          ...playlists.map((p) => (
            <MenuItem key={p.identifier} disabled={busy} onClick={() => void addTo(p)}>
              {p.payload.videoRefs.some((r) => r.name === videoName && r.identifier === videoIdentifier) ? '✓ ' : ''}
              {p.payload.title}
            </MenuItem>
          )),
          <MenuItem key="__new" disableRipple sx={{ display: 'flex', gap: 1 }} onKeyDown={(e) => { if (e.key !== 'Escape') e.stopPropagation(); }}>
            <TextField
              size="small" placeholder="New playlist…" value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)} onClick={(e) => e.stopPropagation()}
            />
            <Button size="small" disabled={!newTitle.trim() || busy} onClick={() => void createAndAdd()}>Add</Button>
          </MenuItem>,
        ])}
      </Menu>
    </>
  );
}
