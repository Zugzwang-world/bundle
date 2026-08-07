import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './styles/base.css';
import './styles/landing.css';
import './styles/proto.css';
import App from './App';
import { BundleProvider } from './state/store';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <BundleProvider>
        <App />
      </BundleProvider>
    </BrowserRouter>
  </StrictMode>,
);
