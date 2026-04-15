import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import CaptureWindow from './components/capture/CaptureWindow';
import './styles/global.css';

const isCaptureRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/capture');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isCaptureRoute ? <CaptureWindow /> : <App />}
  </React.StrictMode>
);
