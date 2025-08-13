/**
 * Cypress helper functions for similarity testing.
 * 
 * These utilities assist with testing similarity percentage accuracy
 * by providing reusable commands and mock data generation.
 */

// Type definitions for similarity test data
export interface SimilarityTestFragment {
  id: string;
  sequence_number: number;
  content: string;
  similarity_score: number | null;
  verified: boolean;
  start_position?: number | null;
  end_position?: number | null;
  related_sentence?: string;
}

export interface SimilarityTestData {
  submission_id: string;
  status: string;
  fragments: {
    F1?: SimilarityTestFragment[];
    F2?: SimilarityTestFragment[];
  };
}

// Custom Cypress commands for similarity testing
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Set up a test with specific similarity scores
       */
      setupSimilarityTest(f1Scores: number[], f2Scores?: number[]): Chainable<Element>;
      
      /**
       * Verify that a fragment displays the expected similarity percentage
       */
      verifyFragmentSimilarity(fragmentId: string, expectedScore: number): Chainable<Element>;
      
      /**
       * Verify that the average similarity is calculated correctly
       */
      verifyAverageSimilarity(fragmentType: 'F1' | 'F2', expectedAverage: number): Chainable<Element>;
      
      /**
       * Check that similarity icons match the score ranges
       */
      verifySimilarityIcon(score: number, expectedIcon: string): Chainable<Element>;
      
      /**
       * Check that similarity labels match the score ranges
       */
      verifySimilarityLabel(score: number, expectedLabel: string): Chainable<Element>;
    }
  }
}

/**
 * Generate mock API response with specific similarity scores
 */
export function generateSimilarityTestData(
  f1Scores: number[], 
  f2Scores: number[] = [],
  submissionId: string = 'similarity-test-id'
): SimilarityTestData {
  const f1Fragments: SimilarityTestFragment[] = f1Scores.map((score, index) => ({
    id: `f1-test-${index + 1}`,
    sequence_number: index + 1,
    content: `F1 test fragment ${index + 1}`,
    similarity_score: score,
    verified: score >= 70,
    start_position: score >= 70 ? index * 20 : null,
    end_position: score >= 70 ? (index + 1) * 20 : null
  }));

  const f2Fragments: SimilarityTestFragment[] = f2Scores.map((score, index) => ({
    id: `f2-test-${index + 1}`,
    sequence_number: index + 1,
    content: `F2 test fragment ${index + 1}`,
    similarity_score: score,
    verified: score >= 70,
    start_position: score >= 70 ? index * 25 : null,
    end_position: score >= 70 ? (index + 1) * 25 : null,
    related_sentence: `Related sentence for F2-${index + 1}`
  }));

  return {
    submission_id: submissionId,
    status: 'completed',
    fragments: {
      F1: f1Fragments,
      F2: f2Fragments.length > 0 ? f2Fragments : undefined
    }
  };
}

/**
 * Expected formatting for similarity scores based on the formatSimilarityScore function
 */
export function expectedFormattedScore(score: number | null | undefined): string {
  if (score === null || score === undefined || isNaN(score)) return '0.0%';
  if (score === 100) return '100%';
  if (score >= 99.5) return '99.9%';
  return `${score.toFixed(1)}%`;
}

/**
 * Expected icon for similarity score based on getSimilarityIcon function
 */
export function expectedSimilarityIcon(score: number | null | undefined): string {
  const safeScore = score === null || score === undefined || isNaN(score) ? 0 : score;
  if (safeScore >= 95) return '🎯';
  if (safeScore >= 85) return '✅';
  if (safeScore >= 70) return '⚠️';
  if (safeScore >= 50) return '❌';
  return '🚫';
}

/**
 * Expected label for similarity score based on getSimilarityLabel function
 */
export function expectedSimilarityLabel(score: number | null | undefined): string {
  const safeScore = score === null || score === undefined || isNaN(score) ? 0 : score;
  if (safeScore >= 95) return 'Excellent';
  if (safeScore >= 85) return 'Good';
  if (safeScore >= 70) return 'Fair';
  if (safeScore >= 50) return 'Poor';
  return 'Very Poor';
}

/**
 * Calculate expected average similarity
 */
export function calculateExpectedAverage(scores: (number | null | undefined)[]): number {
  const validScores = scores.filter((score): score is number => 
    score !== null && score !== undefined && !isNaN(score)
  );
  
  if (validScores.length === 0) return 0;
  return validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
}

// Register custom commands
Cypress.Commands.add('setupSimilarityTest', (f1Scores: number[], f2Scores: number[] = []) => {
  const testData = generateSimilarityTestData(f1Scores, f2Scores);
  
  cy.intercept('GET', '**/results/*', {
    body: testData
  }).as('getSimilarityTestData');
  
  cy.visit('/');
  cy.get('[data-testid="text-input"]')
    .clear()
    .type('Similarity test text');
  cy.get('[data-testid="submit-button"]').click();
  cy.wait('@getSimilarityTestData');
  // Wait for fragments to appear (no tab switching needed in Enhanced UI)
  cy.contains('F1 Fragments', { timeout: 15000 }).should('be.visible');
});

Cypress.Commands.add('verifyFragmentSimilarity', (fragmentId: string, expectedScore: number) => {
  const formattedScore = expectedFormattedScore(expectedScore);
  
  cy.contains(fragmentId).parent().should('contain', formattedScore);
});

Cypress.Commands.add('verifyAverageSimilarity', (fragmentType: 'F1' | 'F2', expectedAverage: number) => {
  const formattedAverage = expectedFormattedScore(expectedAverage);
  
  cy.contains(`${fragmentType} Fragments`).parent().should(($header) => {
    const text = $header.text();
    const avgMatch = text.match(/Avg[^:]*:\s*(\d+\.?\d*)%/i);
    
    if (avgMatch) {
      const displayedAvg = parseFloat(avgMatch[1]);
      expect(displayedAvg).to.be.closeTo(expectedAverage, 0.1);
    }
  });
});

Cypress.Commands.add('verifySimilarityIcon', (score: number, expectedIcon: string) => {
  cy.get('body').should('contain', expectedIcon);
});

Cypress.Commands.add('verifySimilarityLabel', (score: number, expectedLabel: string) => {
  cy.get('body').should(($body) => {
    expect($body.text().toLowerCase()).to.include(expectedLabel.toLowerCase());
  });
});

// Utility function to test all similarity ranges
export function testAllSimilarityRanges(): void {
  describe('All Similarity Ranges', () => {
    const testCases = [
      { score: 100, icon: '🎯', label: 'Excellent', formatted: '100%' },
      { score: 99.95, icon: '🎯', label: 'Excellent', formatted: '99.9%' },
      { score: 99.5, icon: '🎯', label: 'Excellent', formatted: '99.9%' },
      { score: 99.49, icon: '🎯', label: 'Excellent', formatted: '99.5%' },
      { score: 95, icon: '🎯', label: 'Excellent', formatted: '95.0%' },
      { score: 94.9, icon: '✅', label: 'Good', formatted: '94.9%' },
      { score: 85, icon: '✅', label: 'Good', formatted: '85.0%' },
      { score: 84.9, icon: '⚠️', label: 'Fair', formatted: '84.9%' },
      { score: 70, icon: '⚠️', label: 'Fair', formatted: '70.0%' },
      { score: 69.9, icon: '❌', label: 'Poor', formatted: '69.9%' },
      { score: 50, icon: '❌', label: 'Poor', formatted: '50.0%' },
      { score: 49.9, icon: '🚫', label: 'Very Poor', formatted: '49.9%' },
      { score: 0, icon: '🚫', label: 'Very Poor', formatted: '0.0%' }
    ];

    testCases.forEach(({ score, icon, label, formatted }) => {
      it(`should handle score ${score} correctly`, () => {
        cy.setupSimilarityTest([score]);
        cy.verifyFragmentSimilarity('F1-1', score);
        cy.contains('F1-1').parent().should('contain', icon);
        cy.contains('F1-1').parent().should(($el) => {
          expect($el.text().toLowerCase()).to.include(label.toLowerCase());
        });
      });
    });
  });
}

// Export test data generators for reuse
export const SimilarityTestFixtures = {
  perfectScores: [100, 100, 100],
  mixedScores: [100, 95.5, 87.2, 72.1, 55.8, 23.4, 0],
  edgeCases: [99.95, 99.5, 99.49, 95, 85, 70, 50, 0],
  nullHandling: [80, null, 60, undefined, 90],
  precisionTests: [33.333333, 66.666666, 99.999999],
  boundaryTests: [95.0, 94.99, 85.0, 84.99, 70.0, 69.99, 50.0, 49.99]
};
