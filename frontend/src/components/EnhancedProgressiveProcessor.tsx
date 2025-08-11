import React, { useState, useEffect, useRef } from 'react';
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
 * Enhanced progressive text processor with two-column layout:
 * - Left sidebar: Mini-map with progress indicators
 * - Right main body: Original text + fragments + summaries
 */
export default function EnhancedProgressiveProcessor(): JSX.Element {
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

  // UI state for highlighting
  const [hoveredFragment, setHoveredFragment] = useState<Fragment | null>(null);
  const [highlightedRanges, setHighlightedRanges] = useState<Array<{start: number, end: number, type: 'fragment' | 'sentence'}>>([]);

  // Refs for scrolling and path drawing
  const originalTextRef = useRef<HTMLDivElement>(null);
  const f1ContainerRef = useRef<HTMLDivElement>(null);
  const f2ContainerRef = useRef<HTMLDivElement>(null);
  const s1ContainerRef = useRef<HTMLDivElement>(null);
  const s2ContainerRef = useRef<HTMLDivElement>(null);

  /**
   * Start the progressive processing workflow with the new loading order.
   */
  const handleStartProcessing = async (text: string): Promise<void> => {
    if (!text.trim()) {
      setError('Please enter some text to process');
      return;
    }

    try {
      setError(null);
      setOriginalText(text);
      setCurrentStage('f1');
      setLoadingStages(new Set(['f1']));

      // Initialize processing (this gives us S1 and submission ID)
      const s1Response = await startProcessing(text);
      setSubmissionId(s1Response.submission_id);
      
      // Stage 1: Extract F1 fragments first (as per the new order)
      const f1Response = await extractF1Fragments(s1Response.submission_id);
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

      // Stage 2: Generate S2 summary
      await processS2Stage(s1Response.submission_id, s1Response.s1_summary);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start processing';
      setError(errorMessage);
      setCurrentStage('error');
      setLoadingStages(new Set());
    }
  };

  /**
   * Process S2 summary generation stage.
   */
  const processS2Stage = async (id: string, s1Content: string): Promise<void> => {
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

      // Stage 3: Set S1 summary (we already have it from the initial call)
      await processS1Stage(id, s1Content);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate S2 summary';
      setError(errorMessage);
      setCurrentStage('error');
      setLoadingStages(new Set());
    }
  };

  /**
   * Process S1 summary display stage.
   */
  const processS1Stage = async (id: string, s1Content: string): Promise<void> => {
    try {
      setCurrentStage('s1');
      setLoadingStages(prev => new Set(prev).add('s1'));

      // Set the S1 summary we already have from the initial call
      setS1Summary(s1Content);
      
      setLoadingStages(prev => {
        const newSet = new Set(prev);
        newSet.delete('s1');
        return newSet;
      });

      // Stage 4: Extract F2 fragments
      await processF2Stage(id);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to display S1 summary';
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

      // Final stage: Complete verification
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
      console.warn('Verification completed with some issues:', err);
      
      setLoadingStages(prev => {
        const newSet = new Set(prev);
        newSet.delete('verification');
        return newSet;
      });

      setCurrentStage('completed');
    }
  };

  /**
   * Handle fragment hover for highlighting.
   */
  const handleFragmentHover = (fragment: Fragment | null): void => {
    setHoveredFragment(fragment);
    
    if (!fragment) {
      setHighlightedRanges([]);
      return;
    }

    const ranges: Array<{start: number, end: number, type: 'fragment' | 'sentence'}> = [];

    // Highlight the fragment itself if it has position info
    if (fragment.start_position !== null && fragment.end_position !== null) {
      ranges.push({
        start: fragment.start_position,
        end: fragment.end_position,
        type: 'fragment'
      });

      // Auto-scroll to bring the fragment into view
      scrollToPosition(fragment.start_position);
    }

    // For F2 fragments, also highlight the related sentence in S1
    if (fragment.related_sentence && s1Summary) {
      const sentenceStart = s1Summary.indexOf(fragment.related_sentence);
      if (sentenceStart !== -1) {
        ranges.push({
          start: sentenceStart,
          end: sentenceStart + fragment.related_sentence.length,
          type: 'sentence'
        });
      }
    }

    setHighlightedRanges(ranges);
  };

  /**
   * Scroll to a specific position in the original text.
   */
  const scrollToPosition = (position: number): void => {
    if (!originalTextRef.current) return;

    // Create a temporary element to measure text position
    const textContent = originalTextRef.current.textContent || '';
    const beforeText = textContent.substring(0, position);
    const lines = beforeText.split('\n').length;
    const lineHeight = 24; // Approximate line height
    const targetScrollTop = (lines - 1) * lineHeight - 100; // Offset for better visibility

    originalTextRef.current.scrollTop = Math.max(0, targetScrollTop);
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
    setHoveredFragment(null);
    setHighlightedRanges([]);
  };

  /**
   * Render highlighted text with ranges.
   */
  const renderHighlightedText = (text: string): JSX.Element => {
    if (highlightedRanges.length === 0) {
      return <span>{text}</span>;
    }

    const sortedRanges = [...highlightedRanges].sort((a, b) => a.start - b.start);
    const elements: JSX.Element[] = [];
    let lastIndex = 0;

    sortedRanges.forEach((range, index) => {
      // Add text before the highlight
      if (range.start > lastIndex) {
        elements.push(
          <span key={`text-${index}`}>
            {text.substring(lastIndex, range.start)}
          </span>
        );
      }

      // Add highlighted text
      const highlightClass = range.type === 'fragment' ? 'highlight-fragment' : 'highlight-sentence';
      elements.push(
        <span key={`highlight-${index}`} className={highlightClass}>
          {text.substring(range.start, range.end)}
        </span>
      );

      lastIndex = range.end;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      elements.push(
        <span key="text-end">
          {text.substring(lastIndex)}
        </span>
      );
    }

    return <>{elements}</>;
  };

  return (
    <div className="enhanced-processor">
      <style>
        {`
          .enhanced-processor {
            display: flex;
            height: 100vh;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #e2e8f0;
            font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
          }

          .sidebar {
            width: 280px;
            background: rgba(15, 23, 42, 0.8);
            border-right: 1px solid rgba(148, 163, 184, 0.2);
            padding: 24px;
            backdrop-filter: blur(20px);
            overflow-y: auto;
          }

          .main-body {
            flex: 1;
            padding: 24px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            gap: 20px;
          }

          .content-box {
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(148, 163, 184, 0.2);
            border-radius: 12px;
            padding: 20px;
            backdrop-filter: blur(10px);
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }

          .original-text-box {
            height: 35%;
            min-height: 300px;
          }

          .content-row {
            display: flex;
            gap: 20px;
            height: 32.5%;
            min-height: 250px;
          }

          .content-row .content-box {
            flex: 1;
          }

          .box-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid rgba(148, 163, 184, 0.2);
          }

          .box-title {
            font-size: 18px;
            font-weight: 600;
            margin: 0;
          }

          .loading-indicator {
            width: 20px;
            height: 20px;
            border: 2px solid rgba(59, 130, 246, 0.3);
            border-top: 2px solid #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          .success-indicator {
            width: 20px;
            height: 20px;
            background: linear-gradient(135deg, #10b981, #059669);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
          }

          .verification-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            background: rgba(16, 185, 129, 0.2);
            border: 1px solid rgba(16, 185, 129, 0.4);
            border-radius: 6px;
            font-size: 12px;
            color: #10b981;
          }

          .scrollable-content {
            flex: 1;
            overflow-y: auto;
            padding-right: 8px;
          }

          .scrollable-content::-webkit-scrollbar {
            width: 6px;
          }

          .scrollable-content::-webkit-scrollbar-track {
            background: rgba(30, 41, 59, 0.4);
            border-radius: 3px;
          }

          .scrollable-content::-webkit-scrollbar-thumb {
            background: rgba(59, 130, 246, 0.5);
            border-radius: 3px;
          }

          .scrollable-content::-webkit-scrollbar-thumb:hover {
            background: rgba(59, 130, 246, 0.7);
          }

          .fragment-item {
            padding: 12px;
            margin-bottom: 8px;
            background: rgba(30, 41, 59, 0.4);
            border-radius: 8px;
            border: 1px solid rgba(148, 163, 184, 0.1);
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
          }

          .fragment-item:hover {
            background: rgba(59, 130, 246, 0.1);
            border-color: rgba(59, 130, 246, 0.3);
            transform: translateY(-1px);
          }

          .fragment-item.f1 {
            border-left: 4px solid #3b82f6;
          }

          .fragment-item.f2 {
            border-left: 4px solid #8b5cf6;
          }

          .fragment-header {
            display: flex;
            justify-content: between;
            align-items: center;
            margin-bottom: 8px;
          }

          .fragment-number {
            font-size: 12px;
            font-weight: 600;
            color: #94a3b8;
          }

          .fragment-status {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            color: white;
          }

          .fragment-status.verified {
            background: linear-gradient(135deg, #10b981, #059669);
          }

          .fragment-status.unverified {
            background: linear-gradient(135deg, #ef4444, #dc2626);
          }

          .fragment-content {
            font-size: 14px;
            line-height: 1.5;
            color: #e2e8f0;
          }

          .related-sentence {
            margin-top: 8px;
            padding: 8px;
            background: rgba(139, 92, 246, 0.1);
            border-radius: 6px;
            border: 1px solid rgba(139, 92, 246, 0.2);
            font-size: 12px;
            color: #c4b5fd;
          }

          .mini-map {
            margin-bottom: 32px;
          }

          .mini-map-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #f1f5f9;
          }

          .mini-map-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            margin-bottom: 8px;
            background: rgba(30, 41, 59, 0.4);
            border-radius: 8px;
            border: 1px solid rgba(148, 163, 184, 0.1);
          }

          .mini-map-item.active {
            background: rgba(59, 130, 246, 0.2);
            border-color: rgba(59, 130, 246, 0.4);
          }

          .mini-map-item.completed {
            background: rgba(16, 185, 129, 0.1);
            border-color: rgba(16, 185, 129, 0.3);
          }

          .mini-map-icon {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            flex-shrink: 0;
          }

          .mini-map-icon.pending {
            background: rgba(107, 114, 128, 0.3);
            border: 2px solid #374151;
            color: #9ca3af;
          }

          .mini-map-icon.loading {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            border: 2px solid #3b82f6;
            color: white;
          }

          .mini-map-icon.completed {
            background: linear-gradient(135deg, #10b981, #059669);
            border: 2px solid #10b981;
            color: white;
          }

          .mini-map-content {
            flex: 1;
          }

          .mini-map-label {
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 2px;
          }

          .mini-map-detail {
            font-size: 12px;
            color: #94a3b8;
          }

          .highlight-fragment {
            background: rgba(59, 130, 246, 0.3);
            border: 1px solid rgba(59, 130, 246, 0.6);
            border-radius: 3px;
            padding: 1px 2px;
            animation: highlight-pulse 1.5s ease-in-out infinite;
          }

          .highlight-sentence {
            background: rgba(139, 92, 246, 0.3);
            border: 1px solid rgba(139, 92, 246, 0.6);
            border-radius: 3px;
            padding: 1px 2px;
            animation: highlight-pulse 1.5s ease-in-out infinite;
          }

          @keyframes highlight-pulse {
            0%, 100% { opacity: 0.8; }
            50% { opacity: 1; }
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .input-container {
            padding: 32px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
          }

          .input-header {
            text-align: center;
            margin-bottom: 32px;
          }

          .input-title {
            font-size: 32px;
            font-weight: bold;
            margin: 0 0 8px 0;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          .input-subtitle {
            font-size: 16px;
            color: #94a3b8;
            margin: 0;
          }

          .error-banner {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 20px;
            color: #fca5a5;
          }

          .reset-button {
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3);
            transition: all 0.3s ease;
            z-index: 1000;
          }

          .reset-button:hover {
            transform: scale(1.1);
            box-shadow: 0 12px 48px rgba(59, 130, 246, 0.4);
          }
        `}
      </style>

      {currentStage === 'input' ? (
        <div className="input-container">
          <div className="input-header">
            <h1 className="input-title">SMR.io Enhanced Processor</h1>
            <p className="input-subtitle">Advanced text analysis with interactive visualization</p>
          </div>
          {error && (
            <div className="error-banner">
              <strong>Error:</strong> {error}
            </div>
          )}
          <TextInput
            onSubmit={handleStartProcessing}
            disabled={false}
          />
        </div>
      ) : (
        <>
          {/* Left Sidebar - Mini Map */}
          <div className="sidebar">
            <MiniMap
              currentStage={currentStage}
              loadingStages={loadingStages}
              f1Fragments={f1Fragments}
              f2Fragments={f2Fragments}
              verificationSummary={verificationSummary}
            />
          </div>

          {/* Right Main Body */}
          <div className="main-body">
            {/* Original Text Box */}
            <div className="content-box original-text-box">
              <div className="box-header">
                <h2 className="box-title">📄 Original Text</h2>
              </div>
              <div className="scrollable-content" ref={originalTextRef}>
                <div style={{ lineHeight: '1.8', fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                  {originalText ? renderHighlightedText(originalText) : 'No text loaded'}
                </div>
              </div>
            </div>

            {/* Fragments Row */}
            <div className="content-row">
              {/* F1 Fragments */}
              <div className="content-box">
                <div className="box-header">
                  <h2 className="box-title">🔍 F1 Fragments</h2>
                  {loadingStages.has('f1') && <div className="loading-indicator" />}
                  {!loadingStages.has('f1') && f1Fragments.length > 0 && (
                    <div className="verification-badge">
                      ✓ {f1Fragments.filter(f => f.verified).length}/{f1Fragments.length} verified
                    </div>
                  )}
                </div>
                <div className="scrollable-content" ref={f1ContainerRef}>
                  {f1Fragments.map((fragment) => (
                    <FragmentItem
                      key={fragment.id}
                      fragment={fragment}
                      type="f1"
                      onHover={handleFragmentHover}
                    />
                  ))}
                  {f1Fragments.length === 0 && !loadingStages.has('f1') && (
                    <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>No fragments extracted yet</p>
                  )}
                </div>
              </div>

              {/* F2 Fragments */}
              <div className="content-box">
                <div className="box-header">
                  <h2 className="box-title">⚖️ F2 Justification Fragments</h2>
                  {loadingStages.has('f2') && <div className="loading-indicator" />}
                  {!loadingStages.has('f2') && f2Fragments.length > 0 && (
                    <div className="verification-badge">
                      ✓ {f2Fragments.filter(f => f.verified).length}/{f2Fragments.length} verified
                    </div>
                  )}
                </div>
                <div className="scrollable-content" ref={f2ContainerRef}>
                  {f2Fragments.map((fragment) => (
                    <FragmentItem
                      key={fragment.id}
                      fragment={fragment}
                      type="f2"
                      onHover={handleFragmentHover}
                    />
                  ))}
                  {f2Fragments.length === 0 && !loadingStages.has('f2') && (
                    <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>No justification fragments yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* Summaries Row */}
            <div className="content-row">
              {/* S2 Summary */}
              <div className="content-box">
                <div className="box-header">
                  <h2 className="box-title">📋 S2 Secondary Summary</h2>
                  {loadingStages.has('s2') && <div className="loading-indicator" />}
                  {!loadingStages.has('s2') && s2Summary && <div className="success-indicator">✓</div>}
                </div>
                <div className="scrollable-content" ref={s2ContainerRef}>
                  {s2Summary ? (
                    <div style={{ lineHeight: '1.6', fontSize: '14px' }}>
                      {s2Summary}
                    </div>
                  ) : (
                    <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                      Secondary summary will be generated from F1 fragments
                    </p>
                  )}
                </div>
              </div>

              {/* S1 Summary */}
              <div className="content-box">
                <div className="box-header">
                  <h2 className="box-title">📝 S1 Primary Summary</h2>
                  {loadingStages.has('s1') && <div className="loading-indicator" />}
                  {!loadingStages.has('s1') && s1Summary && <div className="success-indicator">✓</div>}
                </div>
                <div className="scrollable-content" ref={s1ContainerRef}>
                  {s1Summary ? (
                    <div style={{ lineHeight: '1.6', fontSize: '14px' }}>
                      {renderHighlightedText(s1Summary)}
                    </div>
                  ) : (
                    <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                      Primary summary will be generated from original text
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Reset Button */}
          {currentStage === 'completed' && (
            <button className="reset-button" onClick={handleReset} title="Process New Text">
              ↻
            </button>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Mini-map sidebar component showing processing progress
 */
interface MiniMapProps {
  currentStage: ProgressiveStage;
  loadingStages: Set<ProgressiveStage>;
  f1Fragments: Fragment[];
  f2Fragments: Fragment[];
  verificationSummary: VerificationSummary | null;
}

function MiniMap({ 
  currentStage, 
  loadingStages, 
  f1Fragments, 
  f2Fragments, 
  verificationSummary 
}: MiniMapProps): JSX.Element {
  const stages = [
    { 
      key: 'f1', 
      label: 'F1 Fragment Extraction', 
      icon: '🔍',
      detail: f1Fragments.length > 0 ? `${f1Fragments.filter(f => f.verified).length}/${f1Fragments.length} verified` : 'Extracting fragments...'
    },
    { 
      key: 's2', 
      label: 'S2 Secondary Summary', 
      icon: '📋',
      detail: 'From extracted fragments'
    },
    { 
      key: 's1', 
      label: 'S1 Primary Summary', 
      icon: '📝',
      detail: 'From original text'
    },
    { 
      key: 'f2', 
      label: 'F2 Justification Fragments', 
      icon: '⚖️',
      detail: f2Fragments.length > 0 ? `${f2Fragments.filter(f => f.verified).length}/${f2Fragments.length} verified` : 'Finding justifications...'
    },
    { 
      key: 'verification', 
      label: 'Final Verification', 
      icon: '✅',
      detail: verificationSummary ? `${Math.round(verificationSummary.overall_verification_rate * 100)}% success` : 'Verifying fragments...'
    }
  ];

  const getStageStatus = (stageKey: string): 'pending' | 'loading' | 'completed' => {
    if (loadingStages.has(stageKey as ProgressiveStage)) {
      return 'loading';
    }
    
    const stageOrder = ['input', 'f1', 's2', 's1', 'f2', 'verification', 'completed'];
    const currentIndex = stageOrder.indexOf(currentStage);
    const stageIndex = stageOrder.indexOf(stageKey);
    
    return stageIndex < currentIndex ? 'completed' : 'pending';
  };

  return (
    <div className="mini-map">
      <h3 className="mini-map-title">📊 Processing Progress</h3>
      
      {stages.map((stage) => {
        const status = getStageStatus(stage.key);
        return (
          <div
            key={stage.key}
            className={`mini-map-item ${status}`}
          >
            <div className={`mini-map-icon ${status}`}>
              {status === 'completed' ? '✓' : status === 'loading' ? '⏳' : stage.icon}
            </div>
            <div className="mini-map-content">
              <div className="mini-map-label">{stage.label}</div>
              <div className="mini-map-detail">{stage.detail}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Fragment item component with hover handling
 */
interface FragmentItemProps {
  fragment: Fragment;
  type: 'f1' | 'f2';
  onHover: (fragment: Fragment | null) => void;
}

function FragmentItem({ fragment, type, onHover }: FragmentItemProps): JSX.Element {
  return (
    <div
      className={`fragment-item ${type}`}
      onMouseEnter={() => { onHover(fragment); }}
      onMouseLeave={() => { onHover(null); }}
    >
      <div className="fragment-header">
        <span className="fragment-number">
          {type.toUpperCase()}-{fragment.sequence_number}
        </span>
        <div className={`fragment-status ${fragment.verified ? 'verified' : 'unverified'}`}>
          {fragment.verified ? '✓' : '✕'}
        </div>
      </div>
      
      {type === 'f2' && fragment.related_sentence && (
        <div className="related-sentence">
          <strong>Justifies:</strong> "{fragment.related_sentence}"
        </div>
      )}
      
      <div className="fragment-content">
        {fragment.content}
      </div>
    </div>
  );
}
