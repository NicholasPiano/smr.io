import React from 'react';
import CreativeProgressiveProcessor from './components/CreativeProgressiveProcessor';

/**
 * Top-level application component.
 * Renders the creative text processing interface.
 */
function App(): JSX.Element {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      color: '#e5e7eb',
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"'
    }}>
      <CreativeProgressiveProcessor />
    </div>
  );
}

export default App;



