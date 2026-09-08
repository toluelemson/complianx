import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './styles/hertner-tokens.css';
import './styles/homepage-pricing.css';
import './styles/motion.css';
import './styles/dashboard.css';
import './styles/project-page.css';
import './styles/buttons.css';
import './styles/review-approval.css';
import './styles/hertner-console.css';
import App from './app/App';
import { AppProviders } from './app/providers/AppProviders';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
