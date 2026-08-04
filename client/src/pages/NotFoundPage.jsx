import { Typography } from '@mui/material';

export default function NotFoundPage() {
  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Not found
      </Typography>
      <Typography variant="body1" color="text.secondary">
        The page you are looking for does not exist.
      </Typography>
    </div>
  );
}
