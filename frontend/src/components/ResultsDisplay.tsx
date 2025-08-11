import React, { useState } from 'react';
import type { ProcessingResult } from '../types/api';

interface ResultsDisplayProps {
  results: ProcessingResult;
  originalText: string;
  onReset: () => void;
}

/**
 * Component to display complete processing results including summaries,
 * fragments, and verification status.
 */
export function ResultsDisplay({ 
  results, 
  originalText, 
  onReset 
}: ResultsDisplayProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<'overview' | 'summaries' | 'fragments' | 'verification'>('overview');

  const { summaries, fragments, verification_summary } = results;

  const highlightFragmentInText = (text: string, fragment: any): string => {
    if (!fragment.verified || fragment.start_position === null || fragment.end_position === null) {
      return text;
    }

    const before = text.substring(0, fragment.start_position);
    const highlighted = text.substring(fragment.start_position, fragment.end_position);
    const after = text.substring(fragment.end_position);

    return `${before}<mark style="background-color: rgba(59, 130, 246, 0.3); padding: 2px 4px; border-radius: 3px;">${highlighted}</mark>${after}`;
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'summaries', label: 'Summaries', icon: '📝' },
    { id: 'fragments', label: 'Fragments', icon: '🧩' },
    { id: 'verification', label: 'Verification', icon: '✓' }
  ] as const;

  return (
    <div style={{
      backgroundColor: 'rgba(17, 24, 39, 0.6)',
      borderRadius: '16px',
      padding: '24px',
      border: '1px solid rgba(255,255,255,0.08)'
    }}>
      {/* Header */}
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
          Processing Results
        </h2>
        
        <button
          onClick={onReset}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Analyze New Text
        </button>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '24px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        paddingBottom: '16px'
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); }}
            data-testid={`tab-${tab.id}`}
            style={{
              padding: '10px 16px',
              backgroundColor: activeTab === tab.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              border: `1px solid ${activeTab === tab.id ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '6px',
              color: activeTab === tab.id ? '#60a5fa' : '#9ca3af',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div data-testid="overview-tab">
          <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
            <div style={{
              padding: '16px',
              backgroundColor: 'rgba(31, 41, 55, 0.4)',
              borderRadius: '8px'
            }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#3b82f6' }}>Processing Summary</h3>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#9ca3af' }}>
                <strong>Status:</strong> {results.status}
              </p>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#9ca3af' }}>
                <strong>Processed:</strong> {new Date(results.processing_completed_at || '').toLocaleString()}
              </p>
              <p style={{ margin: 0, fontSize: '14px', color: '#9ca3af' }}>
                <strong>Text Length:</strong> {originalText.length} characters
              </p>
            </div>

            <div style={{
              padding: '16px',
              backgroundColor: 'rgba(31, 41, 55, 0.4)',
              borderRadius: '8px'
            }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#10b981' }}>Verification Stats</h3>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#9ca3af' }}>
                <strong>Overall Rate:</strong> {Math.round(verification_summary.overall_verification_rate * 100)}%
              </p>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#9ca3af' }}>
                <strong>F1 Verified:</strong> {verification_summary.F1_verified}/{verification_summary.F1_total}
              </p>
              <p style={{ margin: 0, fontSize: '14px', color: '#9ca3af' }}>
                <strong>F2 Verified:</strong> {verification_summary.F2_verified}/{verification_summary.F2_total}
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'summaries' && (
        <div data-testid="summaries-tab">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h3 style={{ margin: '0 0 12px 0', color: '#3b82f6' }}>Primary Summary (S1)</h3>
              <div style={{
                padding: '16px',
                backgroundColor: 'rgba(31, 41, 55, 0.4)',
                borderRadius: '8px',
                border: '1px solid rgba(59, 130, 246, 0.2)'
              }}>
                <p style={{ margin: 0, lineHeight: 1.6, color: '#e5e7eb' }}>
                  {summaries.S1?.content || 'No primary summary generated'}
                </p>
              </div>
            </div>

            <div>
              <h3 style={{ margin: '0 0 12px 0', color: '#8b5cf6' }}>Secondary Summary (S2)</h3>
              <div style={{
                padding: '16px',
                backgroundColor: 'rgba(31, 41, 55, 0.4)',
                borderRadius: '8px',
                border: '1px solid rgba(139, 92, 246, 0.2)'
              }}>
                <p style={{ margin: 0, lineHeight: 1.6, color: '#e5e7eb' }}>
                  {summaries.S2?.content || 'No secondary summary generated'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'fragments' && (
        <div data-testid="fragments-tab">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h3 style={{ margin: '0 0 16px 0', color: '#3b82f6' }}>
                Extracted Fragments (F1) - {fragments.F1?.length || 0} items
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {fragments.F1?.map((fragment, index) => (
                  <div
                    key={fragment.id}
                    style={{
                      padding: '12px',
                      backgroundColor: 'rgba(31, 41, 55, 0.4)',
                      borderRadius: '6px',
                      border: `1px solid ${fragment.verified ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px'
                    }}
                  >
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: fragment.verified ? '#10b981' : '#ef4444',
                      color: 'white',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {fragment.verified ? '✓' : '✕'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', color: '#e5e7eb', lineHeight: 1.5 }}>
                        {fragment.content}
                      </div>
                      {fragment.verified && (
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                          Position: {fragment.start_position}-{fragment.end_position}
                        </div>
                      )}
                    </div>
                  </div>
                )) || (
                  <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>No fragments extracted</p>
                )}
              </div>
            </div>

            <div>
              <h3 style={{ margin: '0 0 16px 0', color: '#8b5cf6' }}>
                Justification Fragments (F2) - {fragments.F2?.length || 0} items
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {fragments.F2?.map((fragment, index) => (
                  <div
                    key={fragment.id}
                    style={{
                      padding: '12px',
                      backgroundColor: 'rgba(31, 41, 55, 0.4)',
                      borderRadius: '6px',
                      border: `1px solid ${fragment.verified ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      marginBottom: '8px'
                    }}>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: fragment.verified ? '#10b981' : '#ef4444',
                        color: 'white',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {fragment.verified ? '✓' : '✕'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: '#8b5cf6', marginBottom: '4px' }}>
                          Justifies: "{fragment.related_sentence}"
                        </div>
                        <div style={{ fontSize: '14px', color: '#e5e7eb', lineHeight: 1.5 }}>
                          {fragment.content}
                        </div>
                      </div>
                    </div>
                  </div>
                )) || (
                  <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>No justification fragments found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'verification' && (
        <div data-testid="verification-tab">
          <div style={{
            padding: '16px',
            backgroundColor: 'rgba(31, 41, 55, 0.4)',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#10b981' }}>Verification Summary</h3>
            <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                  {Math.round(verification_summary.overall_verification_rate * 100)}%
                </div>
                <div style={{ fontSize: '14px', color: '#9ca3af' }}>Overall Verification Rate</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
                  {verification_summary.F1_verified}/{verification_summary.F1_total}
                </div>
                <div style={{ fontSize: '14px', color: '#9ca3af' }}>F1 Fragments Verified</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>
                  {verification_summary.F2_verified}/{verification_summary.F2_total}
                </div>
                <div style={{ fontSize: '14px', color: '#9ca3af' }}>F2 Fragments Verified</div>
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ margin: '0 0 16px 0', color: '#f9fafb' }}>Original Text with Verified Fragments Highlighted</h3>
            <div style={{
              padding: '16px',
              backgroundColor: 'rgba(31, 41, 55, 0.4)',
              borderRadius: '8px',
              maxHeight: '400px',
              overflowY: 'auto',
              lineHeight: 1.6,
              fontSize: '14px',
              color: '#e5e7eb'
            }}>
              <div 
                dangerouslySetInnerHTML={{
                  __html: (() => {
                    let highlightedText = originalText;
                    // Sort fragments by position (descending) to avoid position shifts
                    const allFragments = [
                      ...(fragments.F1 || []),
                      ...(fragments.F2 || [])
                    ].filter(f => f.verified && f.start_position !== null)
                      .sort((a, b) => (b.start_position || 0) - (a.start_position || 0));

                    allFragments.forEach(fragment => {
                      if (fragment.start_position !== null && fragment.end_position !== null) {
                        const before = highlightedText.substring(0, fragment.start_position);
                        const highlighted = highlightedText.substring(fragment.start_position, fragment.end_position);
                        const after = highlightedText.substring(fragment.end_position);
                        highlightedText = `${before}<mark style="background-color: rgba(59, 130, 246, 0.3); padding: 2px 4px; border-radius: 3px; border: 1px solid rgba(59, 130, 246, 0.5);">${highlighted}</mark>${after}`;
                      }
                    });

                    return highlightedText;
                  })()
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
