import Alert from '@mui/material/Alert';

export function ErrorState({ message }) {
  return <Alert severity="error">{message}</Alert>;
}
