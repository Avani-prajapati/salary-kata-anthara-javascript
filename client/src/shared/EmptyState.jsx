import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';

export function EmptyState({ message }) {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ py: 6, color: 'text.secondary' }}>
      <InboxOutlinedIcon fontSize="large" />
      <Typography variant="body1">{message}</Typography>
    </Stack>
  );
}
