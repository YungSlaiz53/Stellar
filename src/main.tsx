import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

function isThirdPartyExtensionError(message: string, source?: string): boolean {
  const src = (source || '').toLowerCase();
  const msg = (message || '').toLowerCase();
  if (
    src.startsWith('chrome-extension://') ||
    src.startsWith('moz-extension://') ||
    src.startsWith('safari-extension://') ||
    src.includes('nkbihfbeogaeaoehlefnkodbefgpgknn')
  ) {
    return true;
  }
  return (
    msg.includes('failed to connect to metamask') ||
    msg.includes('metamask') && msg.includes('inpage.js')
  );
}

if (typeof window !== 'undefined') {
  window.addEventListener(
    'error',
    (event) => {
      const stack = event.error instanceof Error ? event.error.stack || '' : '';
      if (isThirdPartyExtensionError(event.message, event.filename || stack)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const reason = event.reason;
      const msg =
        reason instanceof Error ? reason.message : typeof reason === 'string' ? reason : '';
      const stack = reason instanceof Error ? reason.stack || '' : '';
      if (isThirdPartyExtensionError(msg, stack)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );
}

createRoot(document.getElementById('root')!).render(<App />);
