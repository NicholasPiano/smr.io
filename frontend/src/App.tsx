import React, { useState } from 'react';
import ProgressiveTextProcessor from './components/ProgressiveTextProcessor';
import CreativeProgressiveProcessor from './components/CreativeProgressiveProcessor';

/**
 * Top-level application component.
 * Renders the text processing interface with UI mode selection.
 */
function App(): JSX.Element {
  const [uiMode, setUiMode] = useState<'classic' | 'creative'>('creative');

  return (
    <div style={{
      minHeight: '100vh',
      background: uiMode === 'creative' 
        ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
        : 'linear-gradient(135deg, #0f172a 0%, #111827 100%)',
      color: '#e5e7eb',
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"'
    }}>
      {uiMode === 'classic' && (
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
      )}

      {uiMode === 'creative' && <CreativeProgressiveProcessor />}

      {/* UI Mode Toggle */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        display: 'flex',
        gap: '8px',
        background: 'rgba(15, 23, 42, 0.8)',
        padding: '8px',
        borderRadius: '12px',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        zIndex: 1000
      }}>
        <button
          onClick={() => { setUiMode('classic'); }}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500',
            background: uiMode === 'classic' ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'transparent',
            color: uiMode === 'classic' ? 'white' : '#94a3b8',
            transition: 'all 0.2s ease'
          }}
        >
          Classic UI
        </button>
        <button
          onClick={() => { setUiMode('creative'); }}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500',
            background: uiMode === 'creative' ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 'transparent',
            color: uiMode === 'creative' ? 'white' : '#94a3b8',
            transition: 'all 0.2s ease'
          }}
        >
          ✨ Creative UI
        </button>
      </div>
    </div>
  );
}

export default App;



