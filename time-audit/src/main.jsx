import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './lib/auth.jsx';
import App from './App.jsx';
import './index.css';

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      // Refetch the moment you return to the app on any device, so changes
      // made on another device show up live without a manual reload.
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      staleTime: 10_000,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
