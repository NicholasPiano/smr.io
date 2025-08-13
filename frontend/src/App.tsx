import React from 'react';
import EnhancedProgressiveProcessor from './components/EnhancedProgressiveProcessor';
import { MobileProvider } from './contexts/MobileContext';

/**
 * Top-level application component.
 * Renders the enhanced text processing interface with responsive layout.
 */
function App(): JSX.Element {
  return (
    <MobileProvider>
      <EnhancedProgressiveProcessor />
    </MobileProvider>
  );
}

export default App;



