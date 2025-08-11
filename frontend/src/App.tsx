import React from 'react';
import ProgressiveTextProcessor from './components/ProgressiveTextProcessor';

/**
 * Top-level application component.
 * Renders the text processing interface.
 */
function App(): JSX.Element {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #111827 100%)',
      color: '#e5e7eb',
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"'
    }}>
      <div style={{
        padding: '24px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <header style={{
          textAlign: 'center',
          marginBottom: '32px'
        }}>
          <h1 style={{ 
            fontSize: '32px', 
            margin: 0,
            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            SMR.IO - Text Summarization & Fragment Extraction
          </h1>
          <p style={{ 
            marginTop: '8px', 
            opacity: 0.85,
            fontSize: '16px'
          }}>
            Advanced text processing with AI-powered summarization and mechanical verification
          </p>
        </header>
        
        <ProgressiveTextProcessor />
      </div>
    </div>
  );
}

export default App;



