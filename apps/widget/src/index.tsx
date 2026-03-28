import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import type { PawserSettings } from './types';

const settings = window.pawserSettings;

if (!settings) {
  throw new Error(
    'Pawser Widget: window.pawserSettings is not defined. Please configure it before loading the widget script.'
  );
}

const rootEl = document.getElementById('pawser-root');
if (!rootEl) {
  throw new Error(
    'Pawser Widget: Could not find element with id "pawser-root". Please add <div id="pawser-root"></div> to your page.'
  );
}

const brandColor = settings.primaryColor || '#00113f';
rootEl.style.setProperty('--widget-primary', brandColor);

const root = ReactDOM.createRoot(rootEl);
root.render(
  <React.StrictMode>
    <App settings={settings} />
  </React.StrictMode>
);
