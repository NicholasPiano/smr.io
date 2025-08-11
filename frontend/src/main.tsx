import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

/**
 * Bootstraps the React application into the root DOM node.
 */
const rootElement: HTMLElement | null = document.getElementById('root');

if (rootElement === null) {
  // Fail fast with a clear error message if the root element is missing
  throw new Error('Root element with id "root" was not found in the document.');
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);



