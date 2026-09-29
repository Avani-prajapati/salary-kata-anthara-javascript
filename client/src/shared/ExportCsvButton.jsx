import Button from '@mui/material/Button';
import { toQueryString } from '../api/httpClient';

export function ExportCsvButton({ path, params }) {
  return (
    <Button component="a" href={`${path}${toQueryString(params)}`} variant="outlined">
      Export CSV
    </Button>
  );
}
