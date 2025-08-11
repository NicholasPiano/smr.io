import React from 'react';
import type { SubmissionStatus } from '../types/api';

interface ProcessingStatusProps {
  status: SubmissionStatus;
  submissionId: string | null;
  error: string | null;
  onReset: () => void;
}

/**
 * Component to display processing status and progress indicators.
 */
export function ProcessingStatus({ 
  status, 
  submissionId, 
  error, 
  onReset 
}: ProcessingStatusProps): JSX.Element {
  const getStatusMessage = (): string => {
    switch (status) {
      case 'processing':
        return 'Processing your text through AI analysis...';
      case 'failed':
        return 'Processing failed';
      default:
        return 'Preparing to process...';
    }
  };

  const getStatusColor = (): string => {
    switch (status) {
      case 'processing':
        return '#3b82f6';
      case 'failed':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const processingSteps = [
    { label: 'Generating primary summary', stage: 1 },
    { label: 'Extracting verbatim fragments', stage: 2 },
    { label: 'Creating secondary summary', stage: 3 },
    { label: 'Finding justification fragments', stage: 4 },
    { label: 'Verifying all fragments', stage: 5 }
  ];

  return (
    <div style={{
      backgroundColor: 'rgba(17, 24, 39, 0.6)',
      borderRadius: '16px',
      padding: '24px',
      border: '1px solid rgba(255,255,255,0.08)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px'
      }}>
        <h2 style={{ 
          margin: 0,
          fontSize: '24px',
          color: '#f9fafb'
        }}>
          Processing Status
        </h2>
        
        {status !== 'processing' && (
          <button
            onClick={onReset}
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(107, 114, 128, 0.2)',
              border: '1px solid rgba(107, 114, 128, 0.4)',
              borderRadius: '6px',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Start Over
          </button>
        )}
      </div>

      {submissionId && (
        <div style={{
          marginBottom: '16px',
          padding: '12px',
          backgroundColor: 'rgba(31, 41, 55, 0.4)',
          borderRadius: '6px',
          fontSize: '14px',
          color: '#9ca3af'
        }}>
          <strong>Submission ID:</strong> {submissionId}
        </div>
      )}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px'
      }}>
        {status === 'processing' && (
          <div style={{
            width: '24px',
            height: '24px',
            border: '3px solid rgba(59, 130, 246, 0.3)',
            borderTop: '3px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        )}
        
        {status === 'failed' && (
          <div style={{
            width: '24px',
            height: '24px',
            backgroundColor: '#ef4444',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            ✕
          </div>
        )}

        <div>
          <div style={{
            fontSize: '18px',
            fontWeight: '500',
            color: getStatusColor(),
            marginBottom: '4px'
          }}>
            {getStatusMessage()}
          </div>
          
          {status === 'processing' && (
            <div style={{
              fontSize: '14px',
              color: '#9ca3af'
            }}>
              This may take 30-60 seconds depending on text length
            </div>
          )}
        </div>
      </div>

      {status === 'processing' && (
        <div style={{
          backgroundColor: 'rgba(31, 41, 55, 0.4)',
          borderRadius: '8px',
          padding: '16px'
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '16px',
            color: '#e5e7eb'
          }}>
            Processing Pipeline
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {processingSteps.map((step, index) => (
              <div
                key={step.stage}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: '#374151',
                  border: '2px solid #6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: '#9ca3af'
                }}>
                  {step.stage}
                </div>
                
                <span style={{
                  color: '#9ca3af',
                  fontSize: '14px'
                }}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div style={{
          marginTop: '16px',
          padding: '16px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px'
        }}>
          <h4 style={{
            margin: '0 0 8px 0',
            color: '#ef4444',
            fontSize: '16px'
          }}>
            Error Details
          </h4>
          <p style={{
            margin: 0,
            color: '#fca5a5',
            fontSize: '14px'
          }}>
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
