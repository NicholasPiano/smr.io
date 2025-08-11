/**
 * Type definitions for the text processing API.
 */

export type SubmissionStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed';

export type ProgressiveStage = 'input' | 's1' | 'f1' | 's2' | 'f2' | 'verification' | 'completed' | 'error';

export interface Fragment {
  id: string;
  sequence_number: number;
  content: string;
  verified: boolean;
  start_position: number | null;
  end_position: number | null;
  created_at: string;
  related_sentence?: string; // Only for F2 fragments
}

export interface Summary {
  content: string;
  created_at: string;
}

export interface VerificationSummary {
  F1_total: number;
  F1_verified: number;
  F1_verification_rate: number;
  F2_total: number;
  F2_verified: number;
  F2_verification_rate: number;
  overall_verification_rate: number;
}

export interface ProcessingResult {
  submission_id: string;
  status: string;
  created_at: string;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  original_text: string;
  summaries: {
    S1: Summary | null;
    S2: Summary | null;
  };
  fragments: {
    F1: Fragment[];
    F2: Fragment[];
  };
  verification_summary: VerificationSummary;
}

export interface ProcessTextResponse {
  submission_id: string;
  status: 'completed' | 'failed';
  message: string;
  error?: string;
}

export interface ProcessingStatusResponse {
  submission_id: string;
  status: SubmissionStatus;
  created_at: string;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  error_message: string | null;
}

export interface ApiError {
  error: string;
  details?: string | Record<string, string[]>;
}
