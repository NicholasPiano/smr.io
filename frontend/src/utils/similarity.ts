/**
 * Utility functions for handling similarity scores and their visual representation.
 */

/**
 * Format similarity score for display
 */
export function formatSimilarityScore(score: number | undefined | null): string {
  if (score === null || score === undefined || isNaN(score)) return '0.0%';
  if (score === 100) return '100%';
  if (score >= 99.5) return '99.9%';
  return `${score.toFixed(1)}%`;
}

/**
 * Get color scheme for similarity score
 */
export function getSimilarityColor(score: number | undefined | null): {
  background: string;
  border: string;
  text: string;
} {
  // Default to 0 if score is null/undefined
  const safeScore = score === null || score === undefined || isNaN(score) ? 0 : score;
  
  if (safeScore >= 95) {
    return {
      background: 'linear-gradient(135deg, #10b981, #059669)',
      border: '#10b981',
      text: '#10b981'
    };
  } else if (safeScore >= 85) {
    return {
      background: 'linear-gradient(135deg, #22c55e, #16a34a)',
      border: '#22c55e',
      text: '#22c55e'
    };
  } else if (safeScore >= 70) {
    return {
      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
      border: '#f59e0b',
      text: '#f59e0b'
    };
  } else if (safeScore >= 50) {
    return {
      background: 'linear-gradient(135deg, #f97316, #ea580c)',
      border: '#f97316',
      text: '#f97316'
    };
  } else {
    return {
      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
      border: '#ef4444',
      text: '#ef4444'
    };
  }
}

/**
 * Get similarity score label
 */
export function getSimilarityLabel(score: number | undefined | null): string {
  const safeScore = score === null || score === undefined || isNaN(score) ? 0 : score;
  if (safeScore >= 95) return 'Excellent';
  if (safeScore >= 85) return 'Good';
  if (safeScore >= 70) return 'Fair';
  if (safeScore >= 50) return 'Poor';
  return 'Very Poor';
}

/**
 * Get similarity score icon
 */
export function getSimilarityIcon(score: number | undefined | null): string {
  const safeScore = score === null || score === undefined || isNaN(score) ? 0 : score;
  if (safeScore >= 95) return '🎯';
  if (safeScore >= 85) return '✅';
  if (safeScore >= 70) return '⚠️';
  if (safeScore >= 50) return '❌';
  return '🚫';
}

/**
 * Calculate average similarity score for an array of fragments
 */
export function calculateAverageSimilarity(fragments: Array<{ similarity_score: number | undefined | null }>): number {
  if (fragments.length === 0) return 0;
  const validScores = fragments
    .map(f => f.similarity_score)
    .filter((score): score is number => score !== null && score !== undefined && !isNaN(score));
  
  if (validScores.length === 0) return 0;
  const sum = validScores.reduce((acc, score) => acc + score, 0);
  return sum / validScores.length;
}
