import { Box, CircularProgress } from '@mui/material';

// The shared "waiting" state: route-level lazy chunks and the auth-init gate in
// routes/guards.jsx. The guards used to render a bare <div>Loading…</div> — untranslated,
// unstyled and LTR, on the screen every returning user sees on a hard refresh.
export default function RouteFallback() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
      <CircularProgress size={28} aria-label="جارٍ التحميل" />
    </Box>
  );
}
