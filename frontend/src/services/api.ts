/**
 * API service for communicating with the Django backend.
 */

import type { 
  ProcessTextResponse, 
  ProcessingStatusResponse, 
  ProcessingResult 
} from '../types/api';

const API_BASE_URL = 'http://localhost:8001/api';

/**
 * Custom error class for API errors.
 */
export class ApiError extends Error {
  public status: number;
  public details?: string | Record<string, string[]>;

  constructor(message: string, status: number, details?: string | Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Generic fetch wrapper with error handling.
 */
async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);
    
    // Parse response body
    let data: any;
    try {
      data = await response.json();
    } catch (parseError) {
      throw new ApiError(
        'Failed to parse response JSON',
        response.status,
        'Invalid JSON response from server'
      );
    }

    // Handle non-2xx responses
    if (!response.ok) {
      const errorMessage = data.error || data.message || `HTTP ${response.status}`;
      const errorDetails = data.details || data.detail || undefined;
      
      throw new ApiError(errorMessage, response.status, errorDetails);
    }

    return data as T;
  } catch (error) {
    // Re-throw ApiError instances
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new ApiError(
        'Unable to connect to the server. Please ensure the backend is running.',
        0,
        'Network connection error'
      );
    }

    // Handle other errors
    throw new ApiError(
      `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      0,
      'Unexpected error occurred'
    );
  }
}

/**
 * Start text processing and get S1 summary.
 */
export async function startProcessing(text: string): Promise<{
  submission_id: string;
  status: string;
  s1_summary: string;
  created_at: string;
}> {
  return apiRequest('/text/start/', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

/**
 * Extract F1 fragments.
 */
export async function extractF1Fragments(submissionId: string): Promise<{
  submission_id: string;
  status: string;
  f1_fragments: Array<{
    id: string;
    sequence_number: number;
    content: string;
    verified: boolean;
    start_position: number | null;
    end_position: number | null;
    created_at: string;
  }>;
}> {
  return apiRequest(`/text/${submissionId}/extract-f1/`, {
    method: 'POST',
  });
}

/**
 * Generate S2 summary.
 */
export async function generateS2Summary(submissionId: string): Promise<{
  submission_id: string;
  status: string;
  s2_summary: string;
}> {
  return apiRequest(`/text/${submissionId}/generate-s2/`, {
    method: 'POST',
  });
}

/**
 * Extract F2 justification fragments.
 */
export async function extractF2Fragments(submissionId: string): Promise<{
  submission_id: string;
  status: string;
  f2_fragments: Array<{
    id: string;
    sequence_number: number;
    content: string;
    verified: boolean;
    related_sentence: string;
    start_position: number | null;
    end_position: number | null;
    created_at: string;
  }>;
}> {
  return apiRequest(`/text/${submissionId}/extract-f2/`, {
    method: 'POST',
  });
}

/**
 * Complete verification and finalize processing.
 */
export async function completeVerification(submissionId: string): Promise<{
  submission_id: string;
  status: string;
  verification_summary: {
    F1_total: number;
    F1_verified: number;
    F1_verification_rate: number;
    F2_total: number;
    F2_verified: number;
    F2_verification_rate: number;
    overall_verification_rate: number;
  };
  processing_completed_at: string;
}> {
  return apiRequest(`/text/${submissionId}/verify/`, {
    method: 'POST',
  });
}

/**
 * Legacy: Submit text for processing (redirects to start processing).
 */
export async function processText(text: string): Promise<ProcessTextResponse> {
  return apiRequest<ProcessTextResponse>('/text/process/', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

/**
 * Get processing status for a submission.
 */
export async function getProcessingStatus(submissionId: string): Promise<ProcessingStatusResponse> {
  return apiRequest<ProcessingStatusResponse>(`/text/status/${submissionId}/`);
}

/**
 * Get complete processing results for a completed submission.
 */
export async function getProcessingResults(submissionId: string): Promise<ProcessingResult> {
  return apiRequest<ProcessingResult>(`/text/results/${submissionId}/`);
}

/**
 * Get API information.
 */
export async function getApiInfo(): Promise<any> {
  return apiRequest<any>('/info/');
}

/**
 * List recent submissions (for debugging/monitoring).
 */
export async function listSubmissions(
  limit: number = 10, 
  status?: string
): Promise<any> {
  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  if (status) {
    params.append('status', status);
  }
  
  return apiRequest<any>(`/text/submissions/?${params.toString()}`);
}

/**
 * Health check for the API.
 */
export async function healthCheck(): Promise<{ status: string }> {
  return apiRequest<{ status: string }>('/health/', {
    method: 'GET',
  });
}
