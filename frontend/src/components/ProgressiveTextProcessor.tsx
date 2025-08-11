import React, { useState, useEffect } from 'react';
import { TextInput } from './TextInput';
import { 
  startProcessing, 
  extractF1Fragments, 
  generateS2Summary, 
  extractF2Fragments, 
  completeVerification 
} from '../services/api';
import type { ProgressiveStage, Fragment, VerificationSummary } from '../types/api';

/**
 * Progressive text processor with animated stage reveal.
 * Shows each processing stage as it completes with blur-in animations.
 */
export default function ProgressiveTextProcessor(): JSX.Element {
  // Processing state
  const [currentStage, setCurrentStage] = useState<ProgressiveStage>('input');
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [originalText, setOriginalText] = useState<string>('');

  // Stage data
  const [s1Summary, setS1Summary] = useState<string | null>(null);
  const [f1Fragments, setF1Fragments] = useState<Fragment[]>([]);
  const [s2Summary, setS2Summary] = useState<string | null>(null);
  const [f2Fragments, setF2Fragments] = useState<Fragment[]>([]);
  const [verificationSummary, setVerificationSummary] = useState<VerificationSummary | null>(null);

  // Loading states for each stage
  const [loadingStages, setLoadingStages] = useState<Set<ProgressiveStage>>(new Set());

  /**
   * Start the progressive processing workflow.
   */
  const handleStartProcessing = async (text: string): Promise<void> => {
    if (!text.trim()) {
      setError('Please enter some text to process');
      return;
    }

    try {
      setError(null);
      setOriginalText(text);
      setCurrentStage('s1');
      setLoadingStages(new Set(['s1']));

      // Stage 1: Start processing and get S1 summary
      const s1Response = await startProcessing(text);
      setSubmissionId(s1Response.submission_id);
      setS1Summary(s1Response.s1_summary);
      setLoadingStages(prev => {
        const newSet = new Set(prev);
        newSet.delete('s1');
        return newSet;
      });

      // Automatically proceed to F1 extraction
      await processF1Stage(s1Response.submission_id);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start processing';
      setError(errorMessage);
      setCurrentStage('error');
      setLoadingStages(new Set());
    }
  };

  /**
   * Process F1 fragment extraction stage.
   */
  const processF1Stage = async (id: string): Promise<void> => {
    try {
      setCurrentStage('f1');
      setLoadingStages(prev => new Set(prev).add('f1'));

      const f1Response = await extractF1Fragments(id);
      setF1Fragments(f1Response.f1_fragments.map(fragment => ({
        ...fragment,
        verified: fragment.verified,
        start_position: fragment.start_position,
        end_position: fragment.end_position,
        created_at: fragment.created_at,
      })));
      
      setLoadingStages(prev => {
        const newSet = new Set(prev);
        newSet.delete('f1');
        return newSet;
      });

      // Automatically proceed to S2 generation
      await processS2Stage(id);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to extract F1 fragments';
      setError(errorMessage);
      setCurrentStage('error');
      setLoadingStages(new Set());
    }
  };

  /**
   * Process S2 summary generation stage.
   */
  const processS2Stage = async (id: string): Promise<void> => {
    try {
      setCurrentStage('s2');
      setLoadingStages(prev => new Set(prev).add('s2'));

      const s2Response = await generateS2Summary(id);
      setS2Summary(s2Response.s2_summary);
      
      setLoadingStages(prev => {
        const newSet = new Set(prev);
        newSet.delete('s2');
        return newSet;
      });

      // Automatically proceed to F2 extraction
      await processF2Stage(id);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate S2 summary';
      setError(errorMessage);
      setCurrentStage('error');
      setLoadingStages(new Set());
    }
  };

  /**
   * Process F2 fragment extraction stage.
   */
  const processF2Stage = async (id: string): Promise<void> => {
    try {
      setCurrentStage('f2');
      setLoadingStages(prev => new Set(prev).add('f2'));

      const f2Response = await extractF2Fragments(id);
      setF2Fragments(f2Response.f2_fragments.map(fragment => ({
        ...fragment,
        verified: fragment.verified,
        related_sentence: fragment.related_sentence,
        start_position: fragment.start_position,
        end_position: fragment.end_position,
        created_at: fragment.created_at,
      })));
      
      setLoadingStages(prev => {
        const newSet = new Set(prev);
        newSet.delete('f2');
        return newSet;
      });

      // Automatically proceed to verification
      await processVerificationStage(id);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to extract F2 fragments';
      setError(errorMessage);
      setCurrentStage('error');
      setLoadingStages(new Set());
    }
  };

  /**
   * Process final verification stage.
   */
  const processVerificationStage = async (id: string): Promise<void> => {
    try {
      setCurrentStage('verification');
      setLoadingStages(prev => new Set(prev).add('verification'));

      const verificationResponse = await completeVerification(id);
      setVerificationSummary(verificationResponse.verification_summary);
      
      setLoadingStages(prev => {
        const newSet = new Set(prev);
        newSet.delete('verification');
        return newSet;
      });

      setCurrentStage('completed');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete verification';
      setError(errorMessage);
      setCurrentStage('error');
      setLoadingStages(new Set());
    }
  };

  /**
   * Reset the component to initial state.
   */
  const handleReset = (): void => {
    setCurrentStage('input');
    setSubmissionId(null);
    setError(null);
    setOriginalText('');
    setS1Summary(null);
    setF1Fragments([]);
    setS2Summary(null);
    setF2Fragments([]);
    setVerificationSummary(null);
    setLoadingStages(new Set());
  };

  /**
   * Dismiss error and restore UI to last successful stage.
   */
  const handleDismissError = (): void => {
    setError(null);
    
    // Determine the last successful stage based on what data we have
    if (verificationSummary) {
      setCurrentStage('completed');
    } else if (f2Fragments.length > 0) {
      setCurrentStage('f2');
    } else if (s2Summary) {
      setCurrentStage('s2');
    } else if (f1Fragments.length > 0) {
      setCurrentStage('f1');
    } else if (s1Summary) {
      setCurrentStage('s1');
    } else {
      setCurrentStage('input');
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      {/* Input Stage */}
      <StageContainer
        title="Text Input"
        stage="input"
        currentStage={currentStage}
        isLoading={false}
      >
        <TextInput
          onSubmit={handleStartProcessing}
          disabled={currentStage !== 'input'}
        />
      </StageContainer>

      {/* S1 Summary Stage */}
      {(currentStage !== 'input') && (
        <StageContainer
          title="Primary Summary (S1)"
          stage="s1"
          currentStage={currentStage}
          isLoading={loadingStages.has('s1')}
        >
          {s1Summary && (
            <div style={{
              padding: '16px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '8px',
              color: '#e5e7eb'
            }}>
              <p style={{ margin: 0, lineHeight: 1.6 }}>{s1Summary}</p>
            </div>
          )}
        </StageContainer>
      )}

      {/* F1 Fragments Stage */}
      {(['f1', 's2', 'f2', 'verification', 'completed'].includes(currentStage)) && (
        <StageContainer
          title="Extracted Fragments (F1)"
          stage="f1"
          currentStage={currentStage}
          isLoading={loadingStages.has('f1')}
        >
          {f1Fragments.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {f1Fragments.map((fragment, index) => (
                <FragmentCard key={fragment.id} fragment={fragment} index={index} />
              ))}
            </div>
          )}
        </StageContainer>
      )}

      {/* S2 Summary Stage */}
      {(['s2', 'f2', 'verification', 'completed'].includes(currentStage)) && (
        <StageContainer
          title="Secondary Summary (S2)"
          stage="s2"
          currentStage={currentStage}
          isLoading={loadingStages.has('s2')}
        >
          {s2Summary && (
            <div style={{
              padding: '16px',
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '8px',
              color: '#e5e7eb'
            }}>
              <p style={{ margin: 0, lineHeight: 1.6 }}>{s2Summary}</p>
            </div>
          )}
        </StageContainer>
      )}

      {/* F2 Fragments Stage */}
      {(['f2', 'verification', 'completed'].includes(currentStage)) && (
        <StageContainer
          title="Justification Fragments (F2)"
          stage="f2"
          currentStage={currentStage}
          isLoading={loadingStages.has('f2')}
        >
          {f2Fragments.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {f2Fragments.map((fragment, index) => (
                <JustificationFragmentCard key={fragment.id} fragment={fragment} index={index} />
              ))}
            </div>
          )}
        </StageContainer>
      )}

      {/* Verification Stage */}
      {(['verification', 'completed'].includes(currentStage)) && (
        <StageContainer
          title="Verification Results"
          stage="verification"
          currentStage={currentStage}
          isLoading={loadingStages.has('verification')}
        >
          {verificationSummary && (
            <VerificationResults summary={verificationSummary} />
          )}
        </StageContainer>
      )}

      {/* Error Display */}
      {error && (
        <div 
          style={{
            padding: '16px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: '#fca5a5',
            position: 'relative'
          }}
        >
          <button
            onClick={handleDismissError}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'none',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: 'bold',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              hover: {
                backgroundColor: 'rgba(239, 68, 68, 0.2)'
              }
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
            title="Dismiss error"
          >
            ×
          </button>
          <h3 style={{ margin: '0 0 8px 0', color: '#ef4444', paddingRight: '32px' }}>Error</h3>
          <p style={{ margin: '0 0 12px 0', paddingRight: '32px' }}>{error}</p>
          <div style={{ display: 'flex', gap: '8px', paddingRight: '32px' }}>
            <button
              onClick={handleReset}
              style={{
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
            <button
              onClick={handleDismissError}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: '#ef4444',
                border: '1px solid #ef4444',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Reset Button */}
      {currentStage === 'completed' && (
        <button
          onClick={handleReset}
          style={{
            padding: '12px 24px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500',
            alignSelf: 'center'
          }}
        >
          Process New Text
        </button>
      )}
    </div>
  );
}

/**
 * Stage container component with animation and loading states.
 */
interface StageContainerProps {
  title: string;
  stage: ProgressiveStage;
  currentStage: ProgressiveStage;
  isLoading: boolean;
  children: React.ReactNode;
}

function StageContainer({ title, stage, currentStage, isLoading, children }: StageContainerProps): JSX.Element {
  const stageOrder: ProgressiveStage[] = ['input', 's1', 'f1', 's2', 'f2', 'verification', 'completed'];
  const currentIndex = stageOrder.indexOf(currentStage);
  const stageIndex = stageOrder.indexOf(stage);
  
  const isActive = stageIndex <= currentIndex;
  const isCurrentlyProcessing = stage === currentStage && isLoading;
  
  return (
    <div
      style={{
        opacity: isActive ? 1 : 0.3,
        transform: isActive ? 'translateY(0)' : 'translateY(20px)',
        filter: isActive ? 'blur(0px)' : 'blur(4px)',
        transition: 'all 0.6s ease-in-out',
        padding: '20px',
        backgroundColor: 'rgba(55, 65, 81, 0.3)',
        border: '1px solid rgba(75, 85, 99, 0.5)',
        borderRadius: '12px',
        backdropFilter: 'blur(10px)'
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '16px',
        gap: '12px'
      }}>
        <h3 style={{
          margin: 0,
          color: isActive ? '#e5e7eb' : '#9ca3af',
          fontSize: '18px',
          fontWeight: '600'
        }}>
          {title}
        </h3>
        
        {isCurrentlyProcessing && (
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid rgba(59, 130, 246, 0.3)',
            borderTop: '2px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        )}
        
        {isActive && !isCurrentlyProcessing && stage !== 'input' && (
          <div style={{
            width: '16px',
            height: '16px',
            backgroundColor: '#10b981',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{ color: 'white', fontSize: '10px' }}>✓</span>
          </div>
        )}
      </div>
      
      <div style={{ opacity: isActive ? 1 : 0.5 }}>
        {children}
      </div>
    </div>
  );
}

/**
 * Fragment card component for displaying F1 fragments.
 */
interface FragmentCardProps {
  fragment: Fragment;
  index: number;
}

function FragmentCard({ fragment, index }: FragmentCardProps): JSX.Element {
  return (
    <div style={{
      padding: '12px',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      border: '1px solid rgba(34, 197, 94, 0.3)',
      borderRadius: '6px',
      borderLeft: fragment.verified ? '4px solid #22c55e' : '4px solid #ef4444'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <span style={{
          fontSize: '12px',
          color: '#9ca3af',
          fontWeight: '500'
        }}>
          Fragment {fragment.sequence_number}
        </span>
        <span style={{
          fontSize: '12px',
          color: fragment.verified ? '#22c55e' : '#ef4444',
          fontWeight: '500'
        }}>
          {fragment.verified ? 'Verified' : 'Unverified'}
        </span>
      </div>
      <p style={{
        margin: 0,
        color: '#e5e7eb',
        lineHeight: 1.5,
        fontSize: '14px'
      }}>
        {fragment.content}
      </p>
    </div>
  );
}

/**
 * Justification fragment card component for displaying F2 fragments.
 */
function JustificationFragmentCard({ fragment, index }: FragmentCardProps): JSX.Element {
  return (
    <div style={{
      padding: '12px',
      backgroundColor: 'rgba(168, 85, 247, 0.1)',
      border: '1px solid rgba(168, 85, 247, 0.3)',
      borderRadius: '6px',
      borderLeft: fragment.verified ? '4px solid #a855f7' : '4px solid #ef4444'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <span style={{
          fontSize: '12px',
          color: '#9ca3af',
          fontWeight: '500'
        }}>
          Justification {fragment.sequence_number}
        </span>
        <span style={{
          fontSize: '12px',
          color: fragment.verified ? '#a855f7' : '#ef4444',
          fontWeight: '500'
        }}>
          {fragment.verified ? 'Verified' : 'Unverified'}
        </span>
      </div>
      
      {fragment.related_sentence && (
        <div style={{
          padding: '8px',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          borderRadius: '4px',
          marginBottom: '8px'
        }}>
          <span style={{
            fontSize: '11px',
            color: '#a855f7',
            fontWeight: '500'
          }}>
            Justifies: 
          </span>
          <span style={{
            fontSize: '12px',
            color: '#d1d5db',
            fontStyle: 'italic'
          }}>
            {fragment.related_sentence}
          </span>
        </div>
      )}
      
      <p style={{
        margin: 0,
        color: '#e5e7eb',
        lineHeight: 1.5,
        fontSize: '14px'
      }}>
        {fragment.content}
      </p>
    </div>
  );
}

/**
 * Verification results component.
 */
interface VerificationResultsProps {
  summary: VerificationSummary;
}

function VerificationResults({ summary }: VerificationResultsProps): JSX.Element {
  return (
    <div style={{
      padding: '16px',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      border: '1px solid rgba(16, 185, 129, 0.3)',
      borderRadius: '8px'
    }}>
      <h4 style={{
        margin: '0 0 16px 0',
        color: '#10b981',
        fontSize: '16px',
        fontWeight: '600'
      }}>
        Verification Summary
      </h4>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        <VerificationMetric
          label="F1 Fragments"
          verified={summary.F1_verified}
          total={summary.F1_total}
          rate={summary.F1_verification_rate}
        />
        <VerificationMetric
          label="F2 Fragments"
          verified={summary.F2_verified}
          total={summary.F2_total}
          rate={summary.F2_verification_rate}
        />
        <VerificationMetric
          label="Overall"
          verified={summary.F1_verified + summary.F2_verified}
          total={summary.F1_total + summary.F2_total}
          rate={summary.overall_verification_rate}
        />
      </div>
    </div>
  );
}

/**
 * Individual verification metric component.
 */
interface VerificationMetricProps {
  label: string;
  verified: number;
  total: number;
  rate: number;
}

function VerificationMetric({ label, verified, total, rate }: VerificationMetricProps): JSX.Element {
  return (
    <div style={{
      padding: '12px',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderRadius: '6px'
    }}>
      <div style={{
        fontSize: '14px',
        color: '#9ca3af',
        marginBottom: '4px'
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '18px',
        color: '#e5e7eb',
        fontWeight: '600',
        marginBottom: '4px'
      }}>
        {verified}/{total}
      </div>
      <div style={{
        fontSize: '12px',
        color: rate >= 0.8 ? '#10b981' : rate >= 0.6 ? '#f59e0b' : '#ef4444'
      }}>
        {(rate * 100).toFixed(1)}% verified
      </div>
    </div>
  );
}

// Add CSS animation for the loading spinner
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);
