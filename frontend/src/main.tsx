import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Inter is bundled with the app (no request to Google Fonts, so no visitor IPs leave our server)
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import App from './App';
import './App.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
