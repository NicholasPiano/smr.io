import React, { useState } from 'react';
import { TextInput } from './TextInput';
import { ProcessingStatus } from './ProcessingStatus';
import { ResultsDisplay } from './ResultsDisplay';
import { processText, getProcessingResults } from '../services/api';
import type { ProcessingResult, SubmissionStatus } from '../types/api';

/**
 * Main text processor component that orchestrates the entire workflow.
 * Manages state for text input, processing status, and results display.
 */
export default function TextProcessor(): JSX.Element {
  const [inputText, setInputText] = useState<string>('');
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmissionStatus>('idle');
  const [results, setResults] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle text submission for processing.
   */
  const handleSubmitText = async (text: string): Promise<void> => {
    if (!text.trim()) {
      setError('Please enter some text to process');
      return;
    }

    try {
      setStatus('processing');
      setError(null);
      setResults(null);
      setInputText(text);

      // Submit text for processing
      const response = await processText(text);
      setSubmissionId(response.submission_id);

      // Since we're processing synchronously, fetch results immediately
      if (response.status === 'completed') {
        await fetchResults(response.submission_id);
      } else if (response.status === 'failed') {
        setError(response.error || 'Processing failed');
        setStatus('failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process text';
      setError(errorMessage);
      setStatus('failed');
    }
  };

  /**
   * Fetch processing results for a completed submission.
   */
  const fetchResults = async (id: string): Promise<void> => {
    try {
      const results = await getProcessingResults(id);
      setResults(results);
      setStatus('completed');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch results';
      setError(errorMessage);
      setStatus('failed');
    }
  };

  /**
   * Reset the component to initial state.
   */
  const handleReset = (): void => {
    setInputText('');
    setSubmissionId(null);
    setStatus('idle');
    setResults(null);
    setError(null);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }}>
      {/* Text Input Section */}
      {status === 'idle' && (
        <div data-testid="text-input-section">
          <TextInput
            onSubmit={handleSubmitText}
            disabled={status !== 'idle'}
          />
        </div>
      )}

      {/* Processing Status Section */}
      {(status === 'processing' || status === 'failed') && (
        <div data-testid="processing-status-section">
          <ProcessingStatus
            status={status}
            submissionId={submissionId}
            error={error}
            onReset={handleReset}
          />
        </div>
      )}

      {/* Results Display Section */}
      {status === 'completed' && results && (
        <div data-testid="results-display-section">
          <ResultsDisplay
            results={results}
            originalText={inputText}
            onReset={handleReset}
          />
        </div>
      )}

      {/* Error Display */}
      {error && status !== 'processing' && (
        <div 
          data-testid="error-display"
          style={{
            padding: '16px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: '#fca5a5'
          }}
        >
          <h3 style={{ margin: '0 0 8px 0', color: '#ef4444' }}>Error</h3>
          <p style={{ margin: 0 }}>{error}</p>
          <button
            onClick={handleReset}
            style={{
              marginTop: '12px',
              padding: '8px 16px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
