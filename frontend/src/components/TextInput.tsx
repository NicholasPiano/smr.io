import React, { useState } from 'react';

interface TextInputProps {
  onSubmit: (text: string) => Promise<void>;
  disabled?: boolean;
}

/**
 * Text input component for entering text to be processed.
 * Includes validation and example text functionality.
 */
export function TextInput({ onSubmit, disabled = false }: TextInputProps): JSX.Element {
  const [text, setText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const exampleText = `Climate change represents one of the most pressing challenges of our time, requiring unprecedented global cooperation and innovative solutions. The scientific consensus is clear: human activities, particularly the emission of greenhouse gases from burning fossil fuels, are the primary driver of rising global temperatures. The effects are already visible worldwide, from melting ice caps and rising sea levels to more frequent extreme weather events and shifts in agricultural patterns.

The transition to renewable energy sources such as solar, wind, and hydroelectric power is essential for reducing carbon emissions. Governments, businesses, and individuals must work together to implement sustainable practices, invest in clean technologies, and adapt to the changing climate. This includes developing more efficient transportation systems, improving building energy efficiency, and protecting natural ecosystems that serve as carbon sinks.

While the challenge is enormous, there are reasons for optimism. Technological advances have made renewable energy more affordable than ever before. Many countries have committed to net-zero emissions targets, and young people around the world are demanding action from their leaders. The key is to act swiftly and decisively, as the window for limiting global warming to manageable levels is rapidly closing.`;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    if (!text.trim()) {
      return;
    }

    if (text.length < 50) {
      alert('Please enter at least 50 characters for meaningful analysis.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(text);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUseExample = (): void => {
    setText(exampleText);
  };

  const characterCount = text.length;
  const isValid = characterCount >= 50 && characterCount <= 10000;

  return (
    <div style={{
      backgroundColor: 'rgba(17, 24, 39, 0.6)',
      borderRadius: '16px',
      padding: '24px',
      border: '1px solid rgba(255,255,255,0.08)'
    }}>
      <h2 style={{ 
        margin: '0 0 16px 0',
        fontSize: '24px',
        color: '#f9fafb'
      }}>
        Enter Text for Analysis
      </h2>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <textarea
            data-testid="text-input"
            value={text}
            onChange={(e) => { setText(e.target.value); }}
            placeholder="Enter your text here for AI-powered summarization and fragment extraction..."
            disabled={disabled || isSubmitting}
            style={{
              width: '100%',
              minHeight: '200px',
              padding: '16px',
              backgroundColor: 'rgba(31, 41, 55, 0.8)',
              border: `2px solid ${isValid || characterCount === 0 ? 'rgba(59, 130, 246, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
              borderRadius: '8px',
              color: '#e5e7eb',
              fontSize: '16px',
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none',
              transition: 'border-color 0.2s ease'
            }}
          />
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '8px',
            fontSize: '14px'
          }}>
            <span style={{
              color: isValid || characterCount === 0 ? '#9ca3af' : '#ef4444'
            }}>
              {characterCount}/10,000 characters (minimum 50)
            </span>
            
            <button
              type="button"
              onClick={handleUseExample}
              disabled={disabled || isSubmitting}
              style={{
                padding: '6px 12px',
                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                borderRadius: '6px',
                color: '#a78bfa',
                cursor: disabled || isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                opacity: disabled || isSubmitting ? 0.5 : 1
              }}
            >
              Use Example Text
            </button>
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center'
        }}>
          <button
            data-testid="submit-button"
            type="submit"
            disabled={!isValid || disabled || isSubmitting}
            style={{
              padding: '12px 24px',
              backgroundColor: isValid && !disabled && !isSubmitting ? '#3b82f6' : '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: isValid && !disabled && !isSubmitting ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.2s ease',
              opacity: disabled || isSubmitting ? 0.6 : 1
            }}
          >
            {isSubmitting ? 'Processing...' : 'Analyze Text'}
          </button>

          {isSubmitting && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#9ca3af'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(156, 163, 175, 0.3)',
                borderTop: '2px solid #9ca3af',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <span>Analyzing your text...</span>
            </div>
          )}
        </div>
      </form>

      <div style={{
        marginTop: '16px',
        padding: '12px',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: '6px',
        fontSize: '14px',
        color: '#93c5fd'
      }}>
        <strong>What happens next:</strong>
        <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li>AI generates a primary summary (S1)</li>
          <li>Extracts 10 verbatim fragments (F1[])</li>
          <li>Creates a secondary summary from fragments (S2)</li>
          <li>Finds justification fragments for each summary sentence (F2[])</li>
          <li>Mechanically verifies all fragments against original text</li>
        </ol>
      </div>
    </div>
  );
}
