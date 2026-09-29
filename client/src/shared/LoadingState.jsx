import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

export function LoadingState({ message }) {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ py: 6, color: 'text.secondary' }}>
      <CircularProgress size={32} />
      {message ? <Typography variant="body1">{message}</Typography> : null}
    </Stack>
  );
}
