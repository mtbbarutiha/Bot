import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { registerPetdateSW } from './lib/swRegister';
import './styles/global.css';
import './styles/pepito.css';
import './styles/chat.css';

async function boot() {
  // Activate / clear stale PWA caches before first paint when possible.
  await registerPetdateSW();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
}

void boot();
