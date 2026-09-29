import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Typography from '@mui/material/Typography';
import { App } from './App';
import { theme } from './shared/theme';
import { DirectoryPage } from './features/employee-directory/DirectoryPage';
import { CompensationReportsPage } from './features/compensation-reports/CompensationReportsPage';

const queryClient = new QueryClient();

function PlaceholderPage({ title }) {
  return <Typography variant="h5">{title} — coming soon</Typography>;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />}>
              <Route index element={<DirectoryPage />} />
              <Route path="compensation-reports" element={<CompensationReportsPage />} />
              <Route path="headcount" element={<PlaceholderPage title="Headcount" />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>
);
