import Alert from '@mui/material/Alert';

function describeError(error) {
  if (error.fields?.length) {
    return error.fields.map((field) => field.message).join(' ');
  }
  return error.message;
}

export function MutationErrorAlert({ error }) {
  if (!error) {
    return null;
  }

  return <Alert severity="error">{describeError(error)}</Alert>;
}
