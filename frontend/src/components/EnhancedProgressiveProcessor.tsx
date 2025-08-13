import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TextInput } from './TextInput';
import logoSvg from '../assets/logo.svg';
import { 
  startProcessing, 
  extractF1Fragments, 
  generateS2Summary, 
  extractF2Fragments, 
  completeVerification 
} from '../services/api';
import type { ProgressiveStage, Fragment, VerificationSummary } from '../types/api';
import { 
  formatSimilarityScore, 
  getSimilarityColor, 
  getSimilarityLabel, 
  getSimilarityIcon,
  calculateAverageSimilarity 
} from '../utils/similarity';

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

  // Collapsed sections state
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Sticky S1 state
  const [isS1Sticky, setIsS1Sticky] = useState<boolean>(false);

  // Refs for scrolling
  const originalTextRef = useRef<HTMLDivElement>(null);
  const f1ContainerRef = useRef<HTMLDivElement>(null);
  const f2ContainerRef = useRef<HTMLDivElement>(null);
  const s1ContainerRef = useRef<HTMLDivElement>(null);
  const s2ContainerRef = useRef<HTMLDivElement>(null);
  const summaryColumnRef = useRef<HTMLDivElement>(null);
  const s1SectionRef = useRef<HTMLDivElement>(null);

  /**
   * Handle scroll events to manage S1 sticky behavior with throttling.
   */
  useEffect(() => {
    let rafId: number | null = null;
    let isScrolling = false;

    const handleScroll = (): void => {
      if (isScrolling) return;
      
      isScrolling = true;
      rafId = requestAnimationFrame(() => {
        if (!summaryColumnRef.current || !s1SectionRef.current) {
          isScrolling = false;
          return;
        }

        const summaryColumn = summaryColumnRef.current;
        const s1Section = s1SectionRef.current;
        const scrollTop = summaryColumn.scrollTop;
        
        // Calculate threshold more accurately - account for F1 and S2 sections
        const f1Section = summaryColumn.querySelector('.summary-section:nth-child(1)');
        const s2Section = summaryColumn.querySelector('.summary-section:nth-child(2)');
        
        let threshold = 0;
        if (f1Section && !collapsedSections.has('f1')) {
          threshold += (f1Section as HTMLElement).offsetHeight;
        }
        if (s2Section && !collapsedSections.has('s2')) {
          threshold += (s2Section as HTMLElement).offsetHeight;
        }
        
        // Add some buffer to prevent flickering at the exact boundary
        const buffer = 10;
        const shouldBeSticky = scrollTop > (threshold - buffer);
        
        setIsS1Sticky(shouldBeSticky);
        isScrolling = false;
      });
    };

    const summaryColumn = summaryColumnRef.current;
    if (summaryColumn) {
      summaryColumn.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        summaryColumn.removeEventListener('scroll', handleScroll);
        if (rafId) {
          cancelAnimationFrame(rafId);
        }
      };
    }
  }, [currentStage, collapsedSections]); // Re-run when stage or collapsed sections change

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
        
        // Auto-scroll S1 summary to bring the related sentence into view
        scrollToS1Position(sentenceStart);
      }
    }

    setOriginalTextHighlights(originalTextRanges);
    setS1SummaryHighlights(s1SummaryRanges);
  };

  /**
   * Scroll to a specific character position in a text container using DOM Range API.
   */
  const scrollToPosition = (position: number): void => {
    if (!originalTextRef.current) return;

    try {
      // Get the text content and find the text node containing our position
      const walker = document.createTreeWalker(
        originalTextRef.current,
        NodeFilter.SHOW_TEXT,
        null
      );

      let currentPosition = 0;
      let targetNode: Text | null = null;
      let targetOffset = 0;

      let node: Text | null = walker.nextNode() as Text;
      while (node) {
        const nodeLength = node.textContent?.length || 0;
        
        if (currentPosition + nodeLength >= position) {
          targetNode = node;
          targetOffset = position - currentPosition;
          break;
        }
        
        currentPosition += nodeLength;
        node = walker.nextNode() as Text;
      }

      if (!targetNode) {
        // Fallback: scroll to the bottom if position not found
        originalTextRef.current.scrollTop = originalTextRef.current.scrollHeight;
        return;
      }

      // Create a range at the target position
      const range = document.createRange();
      range.setStart(targetNode, Math.min(targetOffset, targetNode.textContent?.length || 0));
      range.collapse(true);

      // Create a temporary element to get the position
      const tempElement = document.createElement('span');
      tempElement.style.position = 'absolute';
      tempElement.style.visibility = 'hidden';
      range.insertNode(tempElement);

      // Calculate scroll position with offset for better visibility
      const elementTop = tempElement.offsetTop;
      const containerHeight = originalTextRef.current.clientHeight;
      const targetScrollTop = elementTop - (containerHeight / 3); // Center in upper third

      // Clean up the temporary element
      tempElement.remove();

      // Smooth scroll to the position
      originalTextRef.current.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth'
      });

    } catch (error) {
      console.warn('Error scrolling to position:', error);
      // Fallback to simple scrolling
      const textContent = originalTextRef.current.textContent || '';
      const beforeText = textContent.substring(0, position);
      const lines = beforeText.split('\n').length;
      const lineHeight = 24;
      const targetScrollTop = (lines - 1) * lineHeight - 100;
      originalTextRef.current.scrollTop = Math.max(0, targetScrollTop);
    }
  };

  /**
   * Scroll to a specific character position in the S1 summary container.
   */
  const scrollToS1Position = (position: number): void => {
    if (!s1ContainerRef.current) return;

    try {
      // Get the text content and find the text node containing our position
      const walker = document.createTreeWalker(
        s1ContainerRef.current,
        NodeFilter.SHOW_TEXT,
        null
      );

      let currentPosition = 0;
      let targetNode: Text | null = null;
      let targetOffset = 0;

      let node: Text | null = walker.nextNode() as Text;
      while (node) {
        const nodeLength = node.textContent?.length || 0;
        
        if (currentPosition + nodeLength >= position) {
          targetNode = node;
          targetOffset = position - currentPosition;
          break;
        }
        
        currentPosition += nodeLength;
        node = walker.nextNode() as Text;
      }

      if (!targetNode) {
        // Fallback: scroll to the bottom if position not found
        s1ContainerRef.current.scrollTop = s1ContainerRef.current.scrollHeight;
        return;
      }

      // Create a range at the target position
      const range = document.createRange();
      range.setStart(targetNode, Math.min(targetOffset, targetNode.textContent?.length || 0));
      range.collapse(true);

      // Create a temporary element to get the position
      const tempElement = document.createElement('span');
      tempElement.style.position = 'absolute';
      tempElement.style.visibility = 'hidden';
      range.insertNode(tempElement);

      // Calculate scroll position with offset for better visibility
      const elementTop = tempElement.offsetTop;
      const containerHeight = s1ContainerRef.current.clientHeight;
      const targetScrollTop = elementTop - (containerHeight / 3); // Center in upper third

      // Clean up the temporary element
      tempElement.remove();

      // Smooth scroll to the position
      s1ContainerRef.current.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth'
      });

    } catch (error) {
      console.warn('Error scrolling S1 to position:', error);
      // Fallback: no scrolling rather than error
    }
  };



  /**
   * Toggle collapse state for a section.
   */
  const toggleSectionCollapse = (sectionId: string): void => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
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
    setCollapsedSections(new Set());
    setIsS1Sticky(false);
  };

  /**
   * Memoized S1 section className to prevent unnecessary re-renders.
   */
  const s1SectionClassName = useMemo(() => {
    const classes = ['content-box', 'summary-section'];
    if (collapsedSections.has('s1')) {
      classes.push('collapsed');
    }
    if (isS1Sticky) {
      classes.push('sticky');
    }
    return classes.join(' ');
  }, [collapsedSections, isS1Sticky]);

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

          .processing-layout {
            display: flex;
            flex-direction: column;
            height: 100vh;
            width: 100%;
          }

          .processing-header {
            background: rgba(15, 23, 42, 0.8);
            border-bottom: 1px solid rgba(148, 163, 184, 0.2);
            padding: 12px 20px;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            backdrop-filter: blur(10px);
          }

          .processing-logo {
            height: 40px;
            width: auto;
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
          }

          .side-layout {
            display: flex;
            height: calc(100vh - 65px);
            width: 100%;
          }

          .original-text-column {
            width: 50%;
            padding: 20px;
            border-right: 2px solid rgba(148, 163, 184, 0.3);
            display: flex;
            flex-direction: column;
          }

          .summary-column {
            width: 50%;
            padding: 20px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .main-body.input-stage {
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100vh;
            display: flex;
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
            flex: 1;
            min-height: 0;
          }

          .summary-section {
            flex: 0 0 auto;
            min-height: 200px;
          }

          .summary-section.collapsed {
            min-height: auto;
          }

          .summary-section.collapsed .scrollable-content {
            display: none;
          }

          .summary-section.sticky {
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(20px);
            border: 2px solid rgba(34, 197, 94, 0.3);
            background: rgba(15, 23, 42, 0.95);
            transition: box-shadow 0.3s ease, backdrop-filter 0.3s ease, border-color 0.3s ease;
          }

          .summary-section.sticky::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.1));
            border-radius: 14px;
            z-index: -1;
          }

          .box-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid rgba(148, 163, 184, 0.2);
          }

          .collapse-button {
            background: transparent;
            border: 1px solid rgba(148, 163, 184, 0.3);
            border-radius: 6px;
            color: #94a3b8;
            cursor: pointer;
            font-size: 12px;
            padding: 4px 8px;
            transition: all 0.2s ease;
            margin-left: auto;
          }

          .collapse-button:hover {
            background: rgba(148, 163, 184, 0.1);
            border-color: rgba(148, 163, 184, 0.5);
            color: #e2e8f0;
          }

          .section-explanation {
            font-size: 13px;
            color: #94a3b8;
            line-height: 1.5;
            margin-bottom: 16px;
            padding: 8px 12px;
            background: rgba(30, 41, 59, 0.3);
            border-radius: 6px;
            border-left: 3px solid rgba(148, 163, 184, 0.3);
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

          .logo-header {
            display: flex;
            justify-content: center;
            margin-bottom: 24px;
          }

          .app-logo {
            height: 60px;
            width: auto;
            filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
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
        <div className="main-body input-stage">
          <div className="input-container">
            <div className="input-header">
              <div className="logo-header">
                <img src={logoSvg} alt="SMR.io" className="app-logo" />
              </div>
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
      ) : (
        <div className="processing-layout">
          {/* Processing Header */}
          <div className="processing-header">
            <img src={logoSvg} alt="SMR.io" className="processing-logo" />
          </div>
          
          <div className="side-layout">
          {/* Left Column - Original Text */}
          <div className="original-text-column">
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
          </div>

          {/* Right Column - Summary Sections (F1, S2, S1, F2) */}
          <div className="summary-column" ref={summaryColumnRef}>
            {/* F1 Fragments */}
            <div className={`content-box summary-section ${collapsedSections.has('f1') ? 'collapsed' : ''}`}>
              <div className="box-header">
                <h2 className="box-title">🔍 F1 Fragments</h2>
                {loadingStages.has('f1') && <div className="loading-indicator" />}
                {!loadingStages.has('f1') && f1Fragments.length > 0 && (
                  <div className="verification-badge">
                    ✓ {f1Fragments.filter(f => f.verified).length}/{f1Fragments.length} verified • 
                    Avg: {formatSimilarityScore(calculateAverageSimilarity(f1Fragments))}
                  </div>
                )}
                <button 
                  className="collapse-button"
                  onClick={() => toggleSectionCollapse('f1')}
                  title={collapsedSections.has('f1') ? 'Expand section' : 'Collapse section'}
                >
                  {collapsedSections.has('f1') ? '▼' : '▲'}
                </button>
              </div>
              {!collapsedSections.has('f1') && (
                <div className="section-explanation">
                  Key verbatim fragments extracted directly from the original text. These segments represent the most important content identified by AI analysis, with similarity scores showing how closely they match the source material.
                </div>
              )}
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

            {/* S2 Secondary Summary */}
            <div className={`content-box summary-section ${collapsedSections.has('s2') ? 'collapsed' : ''}`}>
              <div className="box-header">
                <h2 className="box-title">📋 S2 Secondary Summary</h2>
                {loadingStages.has('s2') && <div className="loading-indicator" />}
                {!loadingStages.has('s2') && s2Summary && <div className="success-indicator">✓</div>}
                <button 
                  className="collapse-button"
                  onClick={() => toggleSectionCollapse('s2')}
                  title={collapsedSections.has('s2') ? 'Expand section' : 'Collapse section'}
                >
                  {collapsedSections.has('s2') ? '▼' : '▲'}
                </button>
              </div>
              {!collapsedSections.has('s2') && (
                <div className="section-explanation">
                  A refined summary generated from the F1 fragments above. This secondary summary focuses on synthesizing the key extracted segments into a cohesive overview, providing a distilled perspective based on the most important content.
                </div>
              )}
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

            {/* S1 Primary Summary */}
            <div 
              ref={s1SectionRef}
              className={s1SectionClassName}
            >
              <div className="box-header">
                <h2 className="box-title">📝 S1 Primary Summary</h2>
                {loadingStages.has('s1') && <div className="loading-indicator" />}
                {!loadingStages.has('s1') && s1Summary && <div className="success-indicator">✓</div>}
                <button 
                  className="collapse-button"
                  onClick={() => toggleSectionCollapse('s1')}
                  title={collapsedSections.has('s1') ? 'Expand section' : 'Collapse section'}
                >
                  {collapsedSections.has('s1') ? '▼' : '▲'}
                </button>
              </div>
              {!collapsedSections.has('s1') && (
                <div className="section-explanation">
                  The initial AI-generated summary of the entire original text. This primary summary serves as the foundation for fragment extraction and provides a comprehensive overview of the main themes and key points from the source material.
                </div>
              )}
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

            {/* F2 Justification Fragments */}
            <div className={`content-box summary-section ${collapsedSections.has('f2') ? 'collapsed' : ''}`}>
              <div className="box-header">
                <h2 className="box-title">⚖️ F2 Justification Fragments</h2>
                {loadingStages.has('f2') && <div className="loading-indicator" />}
                {!loadingStages.has('f2') && f2Fragments.length > 0 && (
                  <div className="verification-badge">
                    ✓ {f2Fragments.filter(f => f.verified).length}/{f2Fragments.length} verified • 
                    Avg: {formatSimilarityScore(calculateAverageSimilarity(f2Fragments))}
                  </div>
                )}
                <button 
                  className="collapse-button"
                  onClick={() => toggleSectionCollapse('f2')}
                  title={collapsedSections.has('f2') ? 'Expand section' : 'Collapse section'}
                >
                  {collapsedSections.has('f2') ? '▼' : '▲'}
                </button>
              </div>
              {!collapsedSections.has('f2') && (
                <div className="section-explanation">
                  Supporting fragments from the original text that justify and validate claims made in the primary summary. Each fragment shows which specific sentence from S1 it supports, helping to verify the accuracy of the summarization process.
                </div>
              )}
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

          {/* Reset Button */}
          {currentStage === 'completed' && (
            <button className="reset-button" onClick={handleReset} title="Process New Text">
              ↻
            </button>
          )}
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
  // Provide default similarity score if missing
  const similarityScore = fragment.similarity_score ?? 0;
  const similarityColors = getSimilarityColor(similarityScore);
  
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
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: '600',
            color: similarityColors.text,
            display: 'flex',
            alignItems: 'center',
            gap: '3px'
          }}>
            <span style={{ fontSize: '10px' }}>
              {getSimilarityIcon(similarityScore)}
            </span>
            {formatSimilarityScore(similarityScore)}
          </div>
          <div className={`fragment-status ${fragment.verified ? 'verified' : 'unverified'}`}>
            {fragment.verified ? '✓' : '✕'}
          </div>
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
      
      {/* Similarity Progress Bar */}
      <div style={{
        marginTop: '8px',
        width: '100%',
        height: '3px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '2px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${similarityScore}%`,
          height: '100%',
          background: similarityColors.background,
          borderRadius: '2px',
          transition: 'width 0.3s ease'
        }} />
      </div>
    </div>
  );
}
