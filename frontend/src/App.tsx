import React from 'react';

/**
 * Top-level application component.
 * Renders a minimal, modern starter UI to verify the app is working.
 */
function App(): JSX.Element {
  const [count, setCount] = React.useState<number>(0);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #111827 100%)',
      color: '#e5e7eb',
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"'
    }}>
      <div style={{
        width: 'min(92vw, 720px)',
        padding: '24px',
        backgroundColor: 'rgba(17, 24, 39, 0.6)',
        borderRadius: '16px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
        border: '1px solid rgba(255,255,255,0.08)'
      }}>
        <h1 style={{ fontSize: '28px', margin: 0 }}>Vite + React</h1>
        <p style={{ marginTop: '8px', opacity: 0.85 }}>
          This is the SMR frontend starter powered by Vite, React, and Bun.
        </p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button
            type="button"
            onClick={() => { setCount((c) => c + 1); }}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.12)',
              backgroundColor: '#1f2937',
              color: '#e5e7eb',
              cursor: 'pointer'
            }}
          >
            Count is {count}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;



