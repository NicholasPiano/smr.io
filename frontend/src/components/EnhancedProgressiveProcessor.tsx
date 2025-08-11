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
  const [originalTextHighlights, setOriginalTextHighlights] = useState<Array<{start: number, end: number, type: 'fragment' | 'sentence'}>>([]);
  const [s1SummaryHighlights, setS1SummaryHighlights] = useState<Array<{start: number, end: number, type: 'fragment' | 'sentence'}>>([]);

  // Refs for scrolling and path drawing
  const mainBodyRef = useRef<HTMLDivElement>(null);
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
      setOriginalTextHighlights([]);
      setS1SummaryHighlights([]);
      return;
    }

    const originalTextRanges: Array<{start: number, end: number, type: 'fragment' | 'sentence'}> = [];
    const s1SummaryRanges: Array<{start: number, end: number, type: 'fragment' | 'sentence'}> = [];

    // Highlight the fragment itself in the original text if it has position info
    if (fragment.start_position !== null && fragment.end_position !== null) {
      originalTextRanges.push({
        start: fragment.start_position,
        end: fragment.end_position,
        type: 'fragment'
      });

      // Auto-scroll to bring the fragment into view
      scrollToPosition(fragment.start_position);
    }

    // For F2 fragments, also highlight the related sentence in S1 summary
    if (fragment.related_sentence && s1Summary) {
      const sentenceStart = s1Summary.indexOf(fragment.related_sentence);
      if (sentenceStart !== -1) {
        s1SummaryRanges.push({
          start: sentenceStart,
          end: sentenceStart + fragment.related_sentence.length,
          type: 'sentence'
        });
      }
    }

    setOriginalTextHighlights(originalTextRanges);
    setS1SummaryHighlights(s1SummaryRanges);
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
   * Scroll to a specific section in the main body.
   */
  const scrollToSection = (sectionRef: React.RefObject<HTMLDivElement>): void => {
    if (!mainBodyRef.current || !sectionRef.current) return;

    const mainBodyRect = mainBodyRef.current.getBoundingClientRect();
    const sectionRect = sectionRef.current.getBoundingClientRect();
    
    // Calculate the scroll position to bring the section into view
    const scrollTop = mainBodyRef.current.scrollTop + (sectionRect.top - mainBodyRect.top) - 20; // 20px offset
    
    mainBodyRef.current.scrollTo({
      top: scrollTop,
      behavior: 'smooth'
    });
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
    setOriginalTextHighlights([]);
    setS1SummaryHighlights([]);
  };

  /**
   * Render highlighted text with specific ranges.
   */
  const renderHighlightedText = (
    text: string, 
    ranges: Array<{start: number, end: number, type: 'fragment' | 'sentence'}>
  ): JSX.Element => {
    if (ranges.length === 0) {
      return <span>{text}</span>;
    }

    const sortedRanges = [...ranges].sort((a, b) => a.start - b.start);
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
            width: 360px;
            background: rgba(15, 23, 42, 0.95);
            border-right: 2px solid rgba(148, 163, 184, 0.3);
            padding: 24px;
            backdrop-filter: blur(20px);
            overflow-y: auto;
            position: relative;
          }

          .main-body {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 16px;
            max-width: calc(100vw - 360px);
          }

          .main-body.input-stage {
            align-items: center;
            justify-content: center;
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
            min-height: 600px;
          }

          .content-row {
            display: flex;
            gap: 20px;
            height: 32.5%;
            min-height: 500px;
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
            margin-bottom: 24px;
          }

          .mini-map-title {
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 12px;
            color: #f1f5f9;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .mini-map-grid {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 20px;
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95));
            border-radius: 12px;
            border: 2px solid rgba(148, 163, 184, 0.4);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(20px);
          }

          .mini-map-row {
            display: flex;
            gap: 12px;
          }

          .mini-map-section {
            flex: 1;
            height: 64px;
            border-radius: 8px;
            border: 2px solid;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 700;
            position: relative;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
          }

          .mini-map-section.original-text {
            background: linear-gradient(135deg, #475569, #64748b);
            border-color: #64748b;
            color: #ffffff;
          }

          .mini-map-section.f1 {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            border-color: #1d4ed8;
            color: #ffffff;
          }

          .mini-map-section.f2 {
            background: linear-gradient(135deg, #8b5cf6, #7c3aed);
            border-color: #7c3aed;
            color: #ffffff;
          }

          .mini-map-section.s1 {
            background: linear-gradient(135deg, #22c55e, #16a34a);
            border-color: #16a34a;
            color: #ffffff;
          }

          .mini-map-section.s2 {
            background: linear-gradient(135deg, #a855f7, #9333ea);
            border-color: #9333ea;
            color: #ffffff;
          }

          .mini-map-section:hover {
            transform: scale(1.05) translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            z-index: 10;
          }

          .mini-map-section.original-text:hover {
            border-color: rgba(71, 85, 105, 1);
            background: linear-gradient(135deg, rgba(71, 85, 105, 0.8), rgba(71, 85, 105, 1));
          }

          .mini-map-section.f1:hover {
            border-color: rgba(59, 130, 246, 1);
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.7), rgba(59, 130, 246, 0.9));
          }

          .mini-map-section.f2:hover {
            border-color: rgba(139, 92, 246, 1);
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.7), rgba(139, 92, 246, 0.9));
          }

          .mini-map-section.s1:hover {
            border-color: rgba(34, 197, 94, 1);
            background: linear-gradient(135deg, rgba(34, 197, 94, 0.7), rgba(34, 197, 94, 0.9));
          }

          .mini-map-section.s2:hover {
            border-color: rgba(168, 85, 247, 1);
            background: linear-gradient(135deg, rgba(168, 85, 247, 0.7), rgba(168, 85, 247, 0.9));
          }

          .mini-map-section.pending {
            opacity: 0.5;
            filter: grayscale(50%);
          }

          .mini-map-section.loading {
            position: relative;
            animation: pulse 1.5s ease-in-out infinite;
          }

          .mini-map-section.loading::after {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
            animation: shimmer 1.2s infinite;
          }

          .mini-map-section.completed {
            position: relative;
          }

          .mini-map-section.completed::before {
            content: '✓';
            position: absolute;
            top: 2px;
            right: 3px;
            font-size: 8px;
            color: #ffffff;
            background: rgba(16, 185, 129, 0.8);
            border-radius: 50%;
            width: 12px;
            height: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
          }

          /* Fragment-specific completion indicators */
          .mini-map-section.f1.completed::after,
          .mini-map-section.f2.completed::after {
            content: attr(data-verified-count);
            position: absolute;
            bottom: 2px;
            right: 3px;
            font-size: 7px;
            color: #ffffff;
            background: rgba(16, 185, 129, 0.8);
            border-radius: 8px;
            padding: 1px 3px;
            line-height: 1;
            font-weight: bold;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
          }

          .mini-map-verification {
            margin-top: 12px;
            padding: 8px;
            background: rgba(15, 23, 42, 0.6);
            border-radius: 6px;
            border: 1px solid rgba(148, 163, 184, 0.1);
          }

          .mini-map-verification-title {
            font-size: 12px;
            font-weight: 500;
            color: #94a3b8;
            margin-bottom: 4px;
          }

          .mini-map-verification-stats {
            display: flex;
            gap: 8px;
            font-size: 10px;
          }

          .mini-map-verification-stat {
            flex: 1;
            text-align: center;
            padding: 4px;
            background: rgba(30, 41, 59, 0.4);
            border-radius: 4px;
            border: 1px solid rgba(148, 163, 184, 0.1);
          }

          .mini-map-verification-stat.f1 {
            border-color: rgba(59, 130, 246, 0.3);
            color: #93c5fd;
          }

          .mini-map-verification-stat.f2 {
            border-color: rgba(139, 92, 246, 0.3);
            color: #c4b5fd;
          }

          @keyframes shimmer {
            0% { left: -100%; }
            100% { left: 100%; }
          }

          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
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
            width: 100%;
            max-width: 600px;
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
        <>
          {/* Left Sidebar - Mini Map Preview */}
          <div className="sidebar">
            <div className="mini-map">
              <h3 className="mini-map-title">🗺️ Layout Preview</h3>
              
              <div className="mini-map-grid">
                {/* Original Text Row */}
                <div className="mini-map-row">
                  <div className="mini-map-section original-text pending">
                    ORIGINAL TEXT
                  </div>
                </div>
                
                {/* Fragments Row */}
                <div className="mini-map-row">
                  <div className="mini-map-section f1 pending">
                    F1 FRAGMENTS
                  </div>
                  <div className="mini-map-section f2 pending">
                    F2 FRAGMENTS
                  </div>
                </div>
                
                {/* Summaries Row */}
                <div className="mini-map-row">
                  <div className="mini-map-section s2 pending">
                    S2 SUMMARY
                  </div>
                  <div className="mini-map-section s1 pending">
                    S1 SUMMARY
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
                Click sections to navigate after processing starts
              </div>
            </div>
          </div>

          <div className="main-body input-stage">
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
          </div>
        </>
      ) : (
        <>
          {/* Left Sidebar - Mini Map */}
          <div className="sidebar">
            <VisualMiniMap
              currentStage={currentStage}
              loadingStages={loadingStages}
              f1Fragments={f1Fragments}
              f2Fragments={f2Fragments}
              verificationSummary={verificationSummary}
              onSectionClick={scrollToSection}
              originalTextRef={originalTextRef}
              f1ContainerRef={f1ContainerRef}
              f2ContainerRef={f2ContainerRef}
              s1ContainerRef={s1ContainerRef}
              s2ContainerRef={s2ContainerRef}
            />
          </div>

          {/* Right Main Body */}
          <div className="main-body" ref={mainBodyRef}>
            {/* Original Text Box */}
            <div className="content-box original-text-box">
              <div className="box-header">
                <h2 className="box-title">📄 Original Text</h2>
              </div>
              <div className="scrollable-content" ref={originalTextRef}>
                <div style={{ lineHeight: '1.8', fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                  {originalText ? renderHighlightedText(originalText, originalTextHighlights) : 'No text loaded'}
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
                      {renderHighlightedText(s1Summary, s1SummaryHighlights)}
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
 * Visual mini-map sidebar component showing layout structure
 */
interface VisualMiniMapProps {
  currentStage: ProgressiveStage;
  loadingStages: Set<ProgressiveStage>;
  f1Fragments: Fragment[];
  f2Fragments: Fragment[];
  verificationSummary: VerificationSummary | null;
  onSectionClick: (sectionRef: React.RefObject<HTMLDivElement>) => void;
  originalTextRef: React.RefObject<HTMLDivElement>;
  f1ContainerRef: React.RefObject<HTMLDivElement>;
  f2ContainerRef: React.RefObject<HTMLDivElement>;
  s1ContainerRef: React.RefObject<HTMLDivElement>;
  s2ContainerRef: React.RefObject<HTMLDivElement>;
}

function VisualMiniMap({ 
  currentStage, 
  loadingStages, 
  f1Fragments, 
  f2Fragments, 
  verificationSummary,
  onSectionClick,
  originalTextRef,
  f1ContainerRef,
  f2ContainerRef,
  s1ContainerRef,
  s2ContainerRef
}: VisualMiniMapProps): JSX.Element {
  const getSectionStatus = (sectionKey: string): 'pending' | 'loading' | 'completed' => {
    if (loadingStages.has(sectionKey as ProgressiveStage)) {
      return 'loading';
    }
    
    const stageOrder = ['input', 'f1', 's2', 's1', 'f2', 'verification', 'completed'];
    const currentIndex = stageOrder.indexOf(currentStage);
    const sectionIndex = stageOrder.indexOf(sectionKey);
    
    return sectionIndex < currentIndex ? 'completed' : 'pending';
  };

  const sections = [
    { 
      key: 'original-text', 
      label: 'Original Text', 
      ref: originalTextRef,
      status: currentStage !== 'input' ? 'completed' : 'pending',
      className: 'original-text'
    },
    { 
      key: 'f1', 
      label: 'F1', 
      ref: f1ContainerRef,
      status: getSectionStatus('f1'),
      className: 'f1'
    },
    { 
      key: 'f2', 
      label: 'F2', 
      ref: f2ContainerRef,
      status: getSectionStatus('f2'),
      className: 'f2'
    },
    { 
      key: 's2', 
      label: 'S2', 
      ref: s2ContainerRef,
      status: getSectionStatus('s2'),
      className: 's2'
    },
    { 
      key: 's1', 
      label: 'S1', 
      ref: s1ContainerRef,
      status: getSectionStatus('s1'),
      className: 's1'
    }
  ];

  return (
    <div className="mini-map">
      <h3 className="mini-map-title">🗺️ Layout Map</h3>
      
      <div className="mini-map-grid">
        {/* Original Text Row */}
        <div className="mini-map-row">
          <div
            className={`mini-map-section original-text ${sections[0]?.status || 'pending'}`}
            onClick={() => { sections[0] && onSectionClick(sections[0].ref); }}
            title="Click to scroll to Original Text"
          >
            ORIGINAL TEXT
          </div>
        </div>
        
        {/* Fragments Row */}
        <div className="mini-map-row">
          <div
            className={`mini-map-section f1 ${sections[1]?.status || 'pending'}`}
            onClick={() => { sections[1] && onSectionClick(sections[1].ref); }}
            title={`Click to scroll to F1 Fragments${f1Fragments.length > 0 ? ` (${f1Fragments.filter(f => f.verified).length}/${f1Fragments.length} verified)` : ''}`}
            data-verified-count={f1Fragments.length > 0 ? `${f1Fragments.filter(f => f.verified).length}/${f1Fragments.length}` : ''}
          >
            F1 FRAGMENTS
          </div>
          <div
            className={`mini-map-section f2 ${sections[2]?.status || 'pending'}`}
            onClick={() => { sections[2] && onSectionClick(sections[2].ref); }}
            title={`Click to scroll to F2 Fragments${f2Fragments.length > 0 ? ` (${f2Fragments.filter(f => f.verified).length}/${f2Fragments.length} verified)` : ''}`}
            data-verified-count={f2Fragments.length > 0 ? `${f2Fragments.filter(f => f.verified).length}/${f2Fragments.length}` : ''}
          >
            F2 FRAGMENTS
          </div>
        </div>
        
        {/* Summaries Row */}
        <div className="mini-map-row">
          <div
            className={`mini-map-section s2 ${sections[3]?.status || 'pending'}`}
            onClick={() => { sections[3] && onSectionClick(sections[3].ref); }}
            title="Click to scroll to S2 Summary"
          >
            S2 SUMMARY
          </div>
          <div
            className={`mini-map-section s1 ${sections[4]?.status || 'pending'}`}
            onClick={() => { sections[4] && onSectionClick(sections[4].ref); }}
            title="Click to scroll to S1 Summary"
          >
            S1 SUMMARY
          </div>
        </div>
      </div>

      {/* Verification Statistics */}
      {verificationSummary && (
        <div className="mini-map-verification">
          <div className="mini-map-verification-title">Verification Stats</div>
          <div className="mini-map-verification-stats">
            <div className="mini-map-verification-stat f1">
              F1: {Math.round(verificationSummary.F1_verification_rate * 100)}%
            </div>
            <div className="mini-map-verification-stat f2">
              F2: {Math.round(verificationSummary.F2_verification_rate * 100)}%
            </div>
          </div>
        </div>
      )}
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
