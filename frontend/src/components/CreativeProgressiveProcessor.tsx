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
 * Enhanced progressive text processor with creative UI visualizations.
 * Features animated progress rings, timeline view, and interactive fragment cards.
 */
export default function CreativeProgressiveProcessor(): JSX.Element {
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

  // UI state
  const [selectedView, setSelectedView] = useState<'dashboard' | 'timeline' | 'fragments'>('dashboard');

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
    setSelectedView('dashboard');
  };

  return (
    <div className="creative-processor-container">
      <style>
        {`
          .creative-processor-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            min-height: 100vh;
            color: #e2e8f0;
          }

          .glass-card {
            background: rgba(15, 23, 42, 0.7);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(148, 163, 184, 0.2);
            border-radius: 16px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
          }

          .view-selector {
            display: flex;
            gap: 8px;
            margin-bottom: 24px;
            padding: 4px;
            background: rgba(30, 41, 59, 0.6);
            border-radius: 12px;
            backdrop-filter: blur(10px);
          }

          .view-button {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s ease;
            background: transparent;
            color: #94a3b8;
          }

          .view-button.active {
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            color: white;
            box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
          }

          .view-button:hover:not(.active) {
            background: rgba(59, 130, 246, 0.1);
            color: #e2e8f0;
          }

          .dashboard-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-bottom: 24px;
          }

          @media (max-width: 768px) {
            .dashboard-grid {
              grid-template-columns: 1fr;
            }
          }

          .metrics-card {
            padding: 24px;
            background: rgba(15, 23, 42, 0.8);
            border-radius: 16px;
            border: 1px solid rgba(148, 163, 184, 0.1);
            backdrop-filter: blur(20px);
          }

          .timeline-container {
            position: relative;
            padding-left: 60px;
          }

          .timeline-line {
            position: absolute;
            left: 30px;
            top: 0;
            bottom: 0;
            width: 2px;
            background: linear-gradient(to bottom, #3b82f6, #8b5cf6, #10b981);
          }

          .timeline-stage {
            position: relative;
            margin-bottom: 32px;
            padding: 20px;
            background: rgba(15, 23, 42, 0.6);
            border-radius: 12px;
            border: 1px solid rgba(148, 163, 184, 0.1);
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
          }

          .timeline-stage.active {
            border-color: rgba(59, 130, 246, 0.5);
            box-shadow: 0 0 30px rgba(59, 130, 246, 0.2);
          }

          .timeline-stage.completed {
            border-color: rgba(16, 185, 129, 0.5);
            box-shadow: 0 0 20px rgba(16, 185, 129, 0.1);
          }

          .timeline-icon {
            position: absolute;
            left: -45px;
            top: 20px;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: bold;
            transition: all 0.3s ease;
          }

          .timeline-icon.pending {
            background: rgba(107, 114, 128, 0.3);
            border: 2px solid #374151;
            color: #9ca3af;
          }

          .timeline-icon.active {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            border: 2px solid #3b82f6;
            color: white;
            animation: pulse 2s infinite;
          }

          .timeline-icon.completed {
            background: linear-gradient(135deg, #10b981, #059669);
            border: 2px solid #10b981;
            color: white;
          }

          @keyframes pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
            50% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          }

          .fragment-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 16px;
          }

          .fragment-card {
            padding: 16px;
            background: rgba(15, 23, 42, 0.6);
            border-radius: 12px;
            border: 1px solid rgba(148, 163, 184, 0.1);
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
            cursor: pointer;
          }

          .fragment-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            border-color: rgba(59, 130, 246, 0.3);
          }

          .fragment-card.verified {
            border-left: 4px solid #10b981;
          }

          .fragment-card.unverified {
            border-left: 4px solid #ef4444;
          }

          .progress-ring-container {
            display: flex;
            justify-content: center;
            gap: 40px;
            margin: 24px 0;
          }

          .progress-ring {
            position: relative;
            width: 120px;
            height: 120px;
          }

          .progress-ring svg {
            transform: rotate(-90deg);
            width: 100%;
            height: 100%;
          }

          .progress-ring-bg {
            fill: none;
            stroke: rgba(148, 163, 184, 0.2);
            stroke-width: 8;
          }

          .progress-ring-progress {
            fill: none;
            stroke-width: 8;
            stroke-linecap: round;
            transition: stroke-dasharray 1s ease;
          }

          .progress-ring.f1 .progress-ring-progress {
            stroke: url(#f1-gradient);
          }

          .progress-ring.f2 .progress-ring-progress {
            stroke: url(#f2-gradient);
          }

          .progress-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
          }

          .progress-percentage {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 4px;
          }

          .progress-label {
            font-size: 12px;
            color: #94a3b8;
          }

          .error-card {
            padding: 20px;
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 12px;
            margin-bottom: 24px;
          }

          .floating-action {
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
          }

          .floating-action:hover {
            transform: scale(1.1);
            box-shadow: 0 12px 48px rgba(59, 130, 246, 0.4);
          }

          .section-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
          }

          .section-icon {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
          }

          .text-highlight-container {
            max-height: 400px;
            overflow-y: auto;
            padding: 20px;
            background: rgba(15, 23, 42, 0.4);
            border-radius: 12px;
            line-height: 1.8;
            border: 1px solid rgba(148, 163, 184, 0.1);
          }

          .verified-fragment {
            background: rgba(59, 130, 246, 0.2);
            border: 1px solid rgba(59, 130, 246, 0.4);
            border-radius: 4px;
            padding: 2px 4px;
            margin: 0 2px;
            animation: highlight-fade-in 0.8s ease;
          }

          @keyframes highlight-fade-in {
            from { background: rgba(59, 130, 246, 0.6); }
            to { background: rgba(59, 130, 246, 0.2); }
          }

          .summary-card {
            padding: 20px;
            background: rgba(15, 23, 42, 0.6);
            border-radius: 12px;
            border: 1px solid rgba(148, 163, 184, 0.1);
            backdrop-filter: blur(10px);
            margin-bottom: 16px;
          }

          .summary-card.s1 {
            border-left: 4px solid #3b82f6;
          }

          .summary-card.s2 {
            border-left: 4px solid #8b5cf6;
          }
        `}
      </style>

      {/* SVG Gradients */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <linearGradient id="f1-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="f2-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      </svg>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '36px', 
          fontWeight: 'bold', 
          margin: '0 0 8px 0',
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          SMR.io Creative Processor
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '16px', margin: 0 }}>
          Advanced text analysis with beautiful visualizations
        </p>
      </div>

      {/* Input Stage */}
      {currentStage === 'input' && (
        <div className="glass-card" style={{ padding: '32px', marginBottom: '24px' }}>
          <div className="section-header">
            <div className="section-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
              📝
            </div>
            <h2 style={{ margin: 0, fontSize: '24px' }}>Enter Your Text</h2>
          </div>
          <TextInput
            onSubmit={handleStartProcessing}
            disabled={currentStage !== 'input'}
          />
        </div>
      )}

      {/* Processing View */}
      {currentStage !== 'input' && (
        <>
          {/* View Selector */}
          <div className="view-selector">
            <button 
              className={`view-button ${selectedView === 'dashboard' ? 'active' : ''}`}
              onClick={() => { setSelectedView('dashboard'); }}
            >
              📊 Dashboard
            </button>
            <button 
              className={`view-button ${selectedView === 'timeline' ? 'active' : ''}`}
              onClick={() => { setSelectedView('timeline'); }}
            >
              📈 Timeline
            </button>
            <button 
              className={`view-button ${selectedView === 'fragments' ? 'active' : ''}`}
              onClick={() => { setSelectedView('fragments'); }}
            >
              🧩 Fragments
            </button>
          </div>

          {/* Dashboard View */}
          {selectedView === 'dashboard' && (
            <DashboardView
              currentStage={currentStage}
              loadingStages={loadingStages}
              s1Summary={s1Summary}
              s2Summary={s2Summary}
              f1Fragments={f1Fragments}
              f2Fragments={f2Fragments}
              verificationSummary={verificationSummary}
              originalText={originalText}
            />
          )}

          {/* Timeline View */}
          {selectedView === 'timeline' && (
            <TimelineView
              currentStage={currentStage}
              loadingStages={loadingStages}
              s1Summary={s1Summary}
              s2Summary={s2Summary}
              f1Fragments={f1Fragments}
              f2Fragments={f2Fragments}
              verificationSummary={verificationSummary}
            />
          )}

          {/* Fragments View */}
          {selectedView === 'fragments' && (
            <FragmentsView
              f1Fragments={f1Fragments}
              f2Fragments={f2Fragments}
              originalText={originalText}
            />
          )}
        </>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-card">
          <h3 style={{ margin: '0 0 8px 0', color: '#ef4444' }}>⚠️ Processing Error</h3>
          <p style={{ margin: '0 0 16px 0', color: '#fca5a5' }}>{error}</p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleReset}
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Floating Reset Button */}
      {currentStage === 'completed' && (
        <button className="floating-action" onClick={handleReset} title="Process New Text">
          ↻
        </button>
      )}
    </div>
  );
}

/**
 * Dashboard view with progress rings and key metrics
 */
interface DashboardViewProps {
  currentStage: ProgressiveStage;
  loadingStages: Set<ProgressiveStage>;
  s1Summary: string | null;
  s2Summary: string | null;
  f1Fragments: Fragment[];
  f2Fragments: Fragment[];
  verificationSummary: VerificationSummary | null;
  originalText: string;
}

function DashboardView({ 
  currentStage, 
  loadingStages, 
  s1Summary, 
  s2Summary, 
  f1Fragments, 
  f2Fragments, 
  verificationSummary,
  originalText 
}: DashboardViewProps): JSX.Element {
  const f1VerificationRate = f1Fragments.length > 0 ? 
    (f1Fragments.filter(f => f.verified).length / f1Fragments.length) * 100 : 0;
  
  const f2VerificationRate = f2Fragments.length > 0 ? 
    (f2Fragments.filter(f => f.verified).length / f2Fragments.length) * 100 : 0;

  return (
    <div>
      {/* Progress Rings */}
      {(f1Fragments.length > 0 || f2Fragments.length > 0) && (
        <div className="glass-card" style={{ padding: '32px', marginBottom: '24px' }}>
          <h3 style={{ textAlign: 'center', marginBottom: '24px', fontSize: '20px' }}>
            🎯 Verification Progress
          </h3>
          <div className="progress-ring-container">
            <ProgressRing
              percentage={f1VerificationRate}
              label="F1 Fragments"
              type="f1"
              total={f1Fragments.length}
              verified={f1Fragments.filter(f => f.verified).length}
            />
            <ProgressRing
              percentage={f2VerificationRate}
              label="F2 Fragments"
              type="f2"
              total={f2Fragments.length}
              verified={f2Fragments.filter(f => f.verified).length}
            />
          </div>
        </div>
      )}

      {/* Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Summaries */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div className="section-header">
            <div className="section-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
              📄
            </div>
            <h3 style={{ margin: 0 }}>Summaries</h3>
          </div>
          
          {s1Summary && (
            <div className="summary-card s1">
              <h4 style={{ margin: '0 0 8px 0', color: '#3b82f6' }}>Primary Summary (S1)</h4>
              <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6 }}>{s1Summary}</p>
            </div>
          )}
          
          {s2Summary && (
            <div className="summary-card s2">
              <h4 style={{ margin: '0 0 8px 0', color: '#8b5cf6' }}>Secondary Summary (S2)</h4>
              <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6 }}>{s2Summary}</p>
            </div>
          )}
          
          {!s1Summary && !s2Summary && (
            <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Summaries will appear here as processing completes...</p>
          )}
        </div>

        {/* Processing Status */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div className="section-header">
            <div className="section-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              ⚡
            </div>
            <h3 style={{ margin: 0 }}>Processing Status</h3>
          </div>
          
          <ProcessingStatusGrid
            currentStage={currentStage}
            loadingStages={loadingStages}
            verificationSummary={verificationSummary}
            originalText={originalText}
          />
        </div>
      </div>

      {/* Text Highlighting */}
      {originalText && (f1Fragments.length > 0 || f2Fragments.length > 0) && (
        <div className="glass-card" style={{ padding: '24px', marginTop: '24px' }}>
          <div className="section-header">
            <div className="section-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
              ✨
            </div>
            <h3 style={{ margin: 0 }}>Verified Fragments in Context</h3>
          </div>
          
          <TextHighlightView
            originalText={originalText}
            f1Fragments={f1Fragments}
            f2Fragments={f2Fragments}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Animated progress ring component
 */
interface ProgressRingProps {
  percentage: number;
  label: string;
  type: 'f1' | 'f2';
  total: number;
  verified: number;
}

function ProgressRing({ percentage, label, type, total, verified }: ProgressRingProps): JSX.Element {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;

  return (
    <div className={`progress-ring ${type}`}>
      <svg>
        <circle
          className="progress-ring-bg"
          cx="60"
          cy="60"
          r={radius}
        />
        <circle
          className="progress-ring-progress"
          cx="60"
          cy="60"
          r={radius}
          strokeDasharray={strokeDasharray}
        />
      </svg>
      <div className="progress-text">
        <div className="progress-percentage" style={{ color: type === 'f1' ? '#3b82f6' : '#8b5cf6' }}>
          {Math.round(percentage)}%
        </div>
        <div className="progress-label">{label}</div>
        <div style={{ fontSize: '10px', color: '#64748b' }}>
          {verified}/{total}
        </div>
      </div>
    </div>
  );
}

/**
 * Processing status grid component
 */
interface ProcessingStatusGridProps {
  currentStage: ProgressiveStage;
  loadingStages: Set<ProgressiveStage>;
  verificationSummary: VerificationSummary | null;
  originalText: string;
}

function ProcessingStatusGrid({ 
  currentStage, 
  loadingStages, 
  verificationSummary, 
  originalText 
}: ProcessingStatusGridProps): JSX.Element {
  const stages = [
    { key: 's1', label: 'Primary Summary', icon: '📝' },
    { key: 'f1', label: 'Fragment Extraction', icon: '🔍' },
    { key: 's2', label: 'Secondary Summary', icon: '📋' },
    { key: 'f2', label: 'Justification Fragments', icon: '⚖️' },
    { key: 'verification', label: 'Verification', icon: '✅' }
  ];

  const getStageStatus = (stageKey: string): 'pending' | 'active' | 'completed' => {
    if (loadingStages.has(stageKey as ProgressiveStage)) {
      return 'active';
    }
    
    const stageOrder = ['input', 's1', 'f1', 's2', 'f2', 'verification', 'completed'];
    const currentIndex = stageOrder.indexOf(currentStage);
    const stageIndex = stageOrder.indexOf(stageKey);
    
    return stageIndex < currentIndex ? 'completed' : 'pending';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {stages.map((stage) => {
        const status = getStageStatus(stage.key);
        return (
          <div
            key={stage.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 
                         status === 'active' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(107, 114, 128, 0.1)',
              borderRadius: '8px',
              border: `1px solid ${status === 'completed' ? 'rgba(16, 185, 129, 0.3)' : 
                                  status === 'active' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(107, 114, 128, 0.3)'}`
            }}
          >
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: status === 'completed' ? 'linear-gradient(135deg, #10b981, #059669)' : 
                         status === 'active' ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'rgba(107, 114, 128, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px'
            }}>
              {status === 'completed' ? '✓' : status === 'active' ? '⏳' : '⏸️'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '500', fontSize: '14px' }}>{stage.icon} {stage.label}</div>
              {status === 'active' && (
                <div style={{ fontSize: '12px', color: '#3b82f6' }}>Processing...</div>
              )}
            </div>
          </div>
        );
      })}

      {verificationSummary && (
        <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#10b981' }}>📊 Final Statistics</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '12px' }}>
            <div>Text Length: {originalText.length} chars</div>
            <div>Overall Success: {Math.round(verificationSummary.overall_verification_rate * 100)}%</div>
            <div>F1 Verified: {verificationSummary.F1_verified}/{verificationSummary.F1_total}</div>
            <div>F2 Verified: {verificationSummary.F2_verified}/{verificationSummary.F2_total}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Timeline view component
 */
interface TimelineViewProps {
  currentStage: ProgressiveStage;
  loadingStages: Set<ProgressiveStage>;
  s1Summary: string | null;
  s2Summary: string | null;
  f1Fragments: Fragment[];
  f2Fragments: Fragment[];
  verificationSummary: VerificationSummary | null;
}

function TimelineView({ 
  currentStage, 
  loadingStages, 
  s1Summary, 
  s2Summary, 
  f1Fragments, 
  f2Fragments, 
  verificationSummary 
}: TimelineViewProps): JSX.Element {
  const stages = [
    { 
      key: 's1', 
      title: 'Primary Summary Generation', 
      icon: '📝',
      content: s1Summary,
      description: 'AI generates the initial summary of the input text'
    },
    { 
      key: 'f1', 
      title: 'Fragment Extraction', 
      icon: '🔍',
      content: `${f1Fragments.length} fragments extracted`,
      description: 'AI identifies key verbatim fragments from the original text'
    },
    { 
      key: 's2', 
      title: 'Secondary Summary Generation', 
      icon: '📋',
      content: s2Summary,
      description: 'AI creates a refined summary based on extracted fragments'
    },
    { 
      key: 'f2', 
      title: 'Justification Fragment Extraction', 
      icon: '⚖️',
      content: `${f2Fragments.length} justification fragments found`,
      description: 'AI finds text segments that justify the primary summary'
    },
    { 
      key: 'verification', 
      title: 'Mechanical Verification', 
      icon: '✅',
      content: verificationSummary ? `${Math.round(verificationSummary.overall_verification_rate * 100)}% verified` : 'Pending verification',
      description: 'System verifies all fragments exist in the original text'
    }
  ];

  const getStageStatus = (stageKey: string): 'pending' | 'active' | 'completed' => {
    if (loadingStages.has(stageKey as ProgressiveStage)) {
      return 'active';
    }
    
    const stageOrder = ['input', 's1', 'f1', 's2', 'f2', 'verification', 'completed'];
    const currentIndex = stageOrder.indexOf(currentStage);
    const stageIndex = stageOrder.indexOf(stageKey);
    
    return stageIndex < currentIndex ? 'completed' : 'pending';
  };

  return (
    <div className="glass-card" style={{ padding: '32px' }}>
      <div className="section-header" style={{ marginBottom: '32px' }}>
        <div className="section-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
          📈
        </div>
        <h2 style={{ margin: 0, fontSize: '24px' }}>Processing Timeline</h2>
      </div>

      <div className="timeline-container">
        <div className="timeline-line"></div>
        
        {stages.map((stage, index) => {
          const status = getStageStatus(stage.key);
          return (
            <div
              key={stage.key}
              className={`timeline-stage ${status}`}
            >
              <div className={`timeline-icon ${status}`}>
                {status === 'completed' ? '✓' : status === 'active' ? '⏳' : (index + 1)}
              </div>
              
              <div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {stage.icon} {stage.title}
                  {status === 'active' && (
                    <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 'normal' }}>
                      (Processing...)
                    </span>
                  )}
                </h3>
                
                <p style={{ margin: '0 0 12px 0', color: '#94a3b8', fontSize: '14px' }}>
                  {stage.description}
                </p>
                
                {stage.content && status !== 'pending' && (
                  <div style={{
                    padding: '12px',
                    background: 'rgba(30, 41, 59, 0.6)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    lineHeight: 1.6
                  }}>
                    {stage.key.includes('f') && !stage.key.includes('s') ? (
                      <div style={{ color: '#10b981', fontWeight: '500' }}>{stage.content}</div>
                    ) : (
                      <div>{stage.content}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Fragments view component
 */
interface FragmentsViewProps {
  f1Fragments: Fragment[];
  f2Fragments: Fragment[];
  originalText: string;
}

function FragmentsView({ f1Fragments, f2Fragments, originalText }: FragmentsViewProps): JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* F1 Fragments */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div className="section-header">
          <div className="section-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
            🔍
          </div>
          <h3 style={{ margin: 0 }}>
            F1 Fragments ({f1Fragments.length}) - {Math.round((f1Fragments.filter(f => f.verified).length / Math.max(f1Fragments.length, 1)) * 100)}% Verified
          </h3>
        </div>
        
        {f1Fragments.length > 0 ? (
          <div className="fragment-grid">
            {f1Fragments.map((fragment, index) => (
              <FragmentCard key={fragment.id} fragment={fragment} index={index} type="f1" />
            ))}
          </div>
        ) : (
          <p style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '40px' }}>
            No F1 fragments extracted yet...
          </p>
        )}
      </div>

      {/* F2 Fragments */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div className="section-header">
          <div className="section-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
            ⚖️
          </div>
          <h3 style={{ margin: 0 }}>
            F2 Justification Fragments ({f2Fragments.length}) - {Math.round((f2Fragments.filter(f => f.verified).length / Math.max(f2Fragments.length, 1)) * 100)}% Verified
          </h3>
        </div>
        
        {f2Fragments.length > 0 ? (
          <div className="fragment-grid">
            {f2Fragments.map((fragment, index) => (
              <FragmentCard key={fragment.id} fragment={fragment} index={index} type="f2" />
            ))}
          </div>
        ) : (
          <p style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '40px' }}>
            No F2 fragments extracted yet...
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Enhanced fragment card component
 */
interface FragmentCardProps {
  fragment: Fragment;
  index: number;
  type: 'f1' | 'f2';
}

function FragmentCard({ fragment, index, type }: FragmentCardProps): JSX.Element {
  return (
    <div className={`fragment-card ${fragment.verified ? 'verified' : 'unverified'}`}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{
            fontSize: '12px',
            fontWeight: '600',
            color: type === 'f1' ? '#3b82f6' : '#8b5cf6'
          }}>
            {type.toUpperCase()}-{fragment.sequence_number}
          </span>
          <div style={{
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: fragment.verified ? 
              'linear-gradient(135deg, #10b981, #059669)' : 
              'linear-gradient(135deg, #ef4444, #dc2626)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            color: 'white'
          }}>
            {fragment.verified ? '✓' : '✕'}
          </div>
        </div>
        
        <span style={{
          fontSize: '10px',
          color: fragment.verified ? '#10b981' : '#ef4444',
          fontWeight: '500',
          textTransform: 'uppercase'
        }}>
          {fragment.verified ? 'Verified' : 'Unverified'}
        </span>
      </div>

      {type === 'f2' && fragment.related_sentence && (
        <div style={{
          padding: '8px',
          background: 'rgba(139, 92, 246, 0.1)',
          borderRadius: '6px',
          marginBottom: '12px',
          border: '1px solid rgba(139, 92, 246, 0.2)'
        }}>
          <div style={{ fontSize: '10px', color: '#8b5cf6', fontWeight: '500', marginBottom: '4px' }}>
            JUSTIFIES:
          </div>
          <div style={{ fontSize: '12px', color: '#d1d5db', fontStyle: 'italic' }}>
            "{fragment.related_sentence}"
          </div>
        </div>
      )}

      <p style={{
        margin: 0,
        fontSize: '14px',
        lineHeight: 1.5,
        color: '#e2e8f0'
      }}>
        {fragment.content}
      </p>

      {fragment.verified && fragment.start_position !== null && (
        <div style={{
          marginTop: '12px',
          padding: '6px 8px',
          background: 'rgba(16, 185, 129, 0.1)',
          borderRadius: '4px',
          fontSize: '10px',
          color: '#10b981'
        }}>
          Position: {fragment.start_position}-{fragment.end_position}
        </div>
      )}
    </div>
  );
}

/**
 * Text highlighting component
 */
interface TextHighlightViewProps {
  originalText: string;
  f1Fragments: Fragment[];
  f2Fragments: Fragment[];
}

function TextHighlightView({ originalText, f1Fragments, f2Fragments }: TextHighlightViewProps): JSX.Element {
  const highlightText = (): string => {
    let result = originalText;
    const allFragments = [...f1Fragments, ...f2Fragments]
      .filter(f => f.verified && f.start_position !== null && f.end_position !== null)
      .sort((a, b) => (b.start_position || 0) - (a.start_position || 0)); // Sort in reverse order

    allFragments.forEach(fragment => {
      if (fragment.start_position !== null && fragment.end_position !== null) {
        const before = result.substring(0, fragment.start_position);
        const text = result.substring(fragment.start_position, fragment.end_position);
        const after = result.substring(fragment.end_position);
        
        const fragmentType = f1Fragments.includes(fragment) ? 'f1' : 'f2';
        const color = fragmentType === 'f1' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(139, 92, 246, 0.3)';
        const borderColor = fragmentType === 'f1' ? 'rgba(59, 130, 246, 0.6)' : 'rgba(139, 92, 246, 0.6)';
        
        result = `${before}<span class="verified-fragment" style="background: ${color}; border-color: ${borderColor}; border: 1px solid ${borderColor};" title="${fragmentType.toUpperCase()}-${fragment.sequence_number}: ${fragment.verified ? 'Verified' : 'Unverified'}">${text}</span>${after}`;
      }
    });

    return result;
  };

  return (
    <div className="text-highlight-container">
      <div 
        dangerouslySetInnerHTML={{ __html: highlightText() }}
        style={{ whiteSpace: 'pre-wrap' }}
      />
    </div>
  );
}
