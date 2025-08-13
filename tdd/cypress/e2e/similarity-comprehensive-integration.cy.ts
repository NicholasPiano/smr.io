/**
 * Comprehensive integration test for similarity percentage accuracy.
 * 
 * This test suite demonstrates the complete functionality of similarity 
 * percentage display across all components and edge cases.
 */

import { 
  SimilarityTestFixtures, 
  calculateExpectedAverage, 
  expectedFormattedScore,
  expectedSimilarityIcon,
  expectedSimilarityLabel 
} from '../support/similarity-helpers';

describe('Similarity Percentage Accuracy - Comprehensive Integration', () => {
  
  describe('Real-world Similarity Testing Scenarios', () => {
    it('should accurately display mixed F1 and F2 similarity scores', () => {
      // Use realistic mixed scores that would occur in actual processing
      const f1Scores = [100, 95.7, 88.3, 72.1, 55.8, 23.4];
      const f2Scores = [97.2, 89.5, 71.3];
      
      cy.setupSimilarityTest(f1Scores, f2Scores);
      
      // Verify individual F1 fragment scores
      f1Scores.forEach((score, index) => {
        const fragmentId = `F1-${index + 1}`;
        const expectedScore = expectedFormattedScore(score);
        const expectedIcon = expectedSimilarityIcon(score);
        const expectedLabel = expectedSimilarityLabel(score);
        
        cy.contains(fragmentId).parent().should('contain', expectedScore);
        cy.contains(fragmentId).parent().should('contain', expectedIcon);
        cy.contains(fragmentId).parent().should(($el) => {
          expect($el.text().toLowerCase()).to.include(expectedLabel.toLowerCase());
        });
      });
      
      // Verify individual F2 fragment scores
      f2Scores.forEach((score, index) => {
        const fragmentId = `F2-${index + 1}`;
        const expectedScore = expectedFormattedScore(score);
        const expectedIcon = expectedSimilarityIcon(score);
        const expectedLabel = expectedSimilarityLabel(score);
        
        cy.contains(fragmentId).parent().should('contain', expectedScore);
        cy.contains(fragmentId).parent().should('contain', expectedIcon);
        cy.contains(fragmentId).parent().should(($el) => {
          expect($el.text().toLowerCase()).to.include(expectedLabel.toLowerCase());
        });
      });
      
      // Verify average calculations
      const f1Average = calculateExpectedAverage(f1Scores);
      const f2Average = calculateExpectedAverage(f2Scores);
      
      cy.verifyAverageSimilarity('F1', f1Average);
      cy.verifyAverageSimilarity('F2', f2Average);
    });

    it('should handle edge case scores accurately', () => {
      cy.setupSimilarityTest(SimilarityTestFixtures.edgeCases);
      
      // Test specific edge cases
      cy.contains('F1-1').parent().should('contain', '99.9%'); // 99.95 -> 99.9%
      cy.contains('F1-2').parent().should('contain', '99.9%'); // 99.5 -> 99.9%
      cy.contains('F1-3').parent().should('contain', '99.5%'); // 99.49 -> 99.5%
      cy.contains('F1-4').parent().should('contain', '95.0%'); // 95 -> 95.0%
      cy.contains('F1-5').parent().should('contain', '85.0%'); // 85 -> 85.0%
      cy.contains('F1-6').parent().should('contain', '70.0%'); // 70 -> 70.0%
      cy.contains('F1-7').parent().should('contain', '50.0%'); // 50 -> 50.0%
      cy.contains('F1-8').parent().should('contain', '0.0%');  // 0 -> 0.0%
    });

    it('should handle null and undefined scores gracefully', () => {
      cy.setupSimilarityTest(SimilarityTestFixtures.nullHandling);
      
      // Valid scores should display normally
      cy.contains('F1-1').parent().should('contain', '80.0%');
      cy.contains('F1-3').parent().should('contain', '60.0%');
      cy.contains('F1-5').parent().should('contain', '90.0%');
      
      // Null and undefined should display as 0.0%
      cy.contains('F1-2').parent().should('contain', '0.0%');
      cy.contains('F1-4').parent().should('contain', '0.0%');
      
      // Average should exclude null/undefined: (80 + 60 + 90) / 3 = 76.7%
      cy.verifyAverageSimilarity('F1', 76.7);
    });

    it('should maintain precision without floating point errors', () => {
      cy.setupSimilarityTest(SimilarityTestFixtures.precisionTests);
      
      // Verify proper decimal rounding
      cy.contains('F1-1').parent().should('contain', '33.3%');
      cy.contains('F1-2').parent().should('contain', '66.7%');
      cy.contains('F1-3').parent().should('contain', '99.9%'); // 99.999999 -> 99.9%
      
      // Verify average calculation handles precision correctly
      const expectedAvg = (33.333333 + 66.666666 + 99.999999) / 3;
      cy.verifyAverageSimilarity('F1', expectedAvg);
    });
  });

  describe('Visual Consistency and Accuracy', () => {
    beforeEach(() => {
      cy.setupSimilarityTest(SimilarityTestFixtures.mixedScores);
    });

    it('should display consistent color coding across all score ranges', () => {
      // Test each score range has appropriate visual styling
      cy.get('.fragment-item').each(($fragment) => {
        cy.wrap($fragment).within(() => {
          cy.get('body').should(($body) => {
            const text = $body.text();
            const percentageMatch = text.match(/(\d+\.?\d*)%/);
            
            if (percentageMatch) {
              const score = parseFloat(percentageMatch[1]);
              
              // Verify styled elements exist for visual feedback
              const styledElements = $body.find('[style*="color"], [class*="color"]');
              expect(styledElements.length).to.be.at.least(1);
              
              // Verify appropriate verification status
              if (score >= 70) {
                expect(text).to.include('✓');
              } else {
                expect(text).to.include('✕');
              }
            }
          });
        });
      });
    });

    it('should display progress bars with accurate widths', () => {
      cy.get('.fragment-item').each(($fragment) => {
        cy.wrap($fragment).within(() => {
          cy.get('body').should(($body) => {
            const text = $body.text();
            const percentageMatch = text.match(/(\d+\.?\d*)%/);
            
            if (percentageMatch) {
              const displayedPercentage = parseFloat(percentageMatch[1]);
              
              // Check for progress bar elements
              cy.get('[style*="width"]').should(($progressElements) => {
                if ($progressElements.length > 0) {
                  let foundMatchingBar = false;
                  
                  $progressElements.each((_, element) => {
                    const style = element.getAttribute('style') || '';
                    const widthMatch = style.match(/width:\s*(\d+\.?\d*)%/);
                    
                    if (widthMatch) {
                      const barWidth = parseFloat(widthMatch[1]);
                      if (Math.abs(barWidth - displayedPercentage) <= 1) {
                        foundMatchingBar = true;
                      }
                    }
                  });
                  
                  expect(foundMatchingBar).to.be.true;
                }
              });
            }
          });
        });
      });
    });
  });

  describe('Cross-Component Consistency', () => {
    it('should maintain consistent scores when switching between views', () => {
      cy.setupSimilarityTest([95.5, 87.2, 72.1]);
      
      // Record scores from fragments view
      let fragmentScores: { [key: string]: string } = {};
      
      cy.get('.fragment-item').each(($fragment) => {
        cy.wrap($fragment).within(() => {
          cy.get('body').should(($body) => {
            const text = $body.text();
            const idMatch = text.match(/(F\d+-\d+)/);
            const percentageMatch = text.match(/(\d+\.?\d*)%/);
            
            if (idMatch && percentageMatch) {
              fragmentScores[idMatch[1]] = percentageMatch[0];
            }
          });
        });
      }).then(() => {
        // Switch to overview tab and back
        cy.get('[data-testid="tab-overview"]').click();
        cy.wait(1000);
        cy.get('[data-testid="tab-fragments"]').click();
        
        // Verify scores remain consistent
        Object.entries(fragmentScores).forEach(([fragmentId, expectedScore]) => {
          cy.contains(fragmentId).parent().should('contain', expectedScore);
        });
      });
    });

    it('should show identical scores in both Enhanced and Creative views', () => {
      cy.setupSimilarityTest([88.7, 75.3]);
      
      // Get scores from current (Enhanced) view
      let enhancedScores: { [key: string]: string } = {};
      
      cy.get('.fragment-item').each(($fragment) => {
        cy.wrap($fragment).within(() => {
          cy.get('body').should(($body) => {
            const text = $body.text();
            const idMatch = text.match(/(F\d+-\d+)/);
            const percentageMatch = text.match(/(\d+\.?\d*)%/);
            
            if (idMatch && percentageMatch) {
              enhancedScores[idMatch[1]] = percentageMatch[0];
            }
          });
        });
      }).then(() => {
        // Switch to Creative view (overview) if available
        cy.get('body').then(($body) => {
          if ($body.find('[data-testid="tab-overview"]').length > 0) {
            cy.get('[data-testid="tab-overview"]').click();
            
            // Look for fragment cards in Creative view and compare
            cy.get('.fragment-card, .fragment-item').each(($creativeFragment) => {
              cy.wrap($creativeFragment).within(() => {
                cy.get('body').should(($body) => {
                  const text = $body.text();
                  const idMatch = text.match(/(F\d+-\d+)/);
                  const percentageMatch = text.match(/(\d+\.?\d*)%/);
                  
                  if (idMatch && percentageMatch && enhancedScores[idMatch[1]]) {
                    expect(percentageMatch[0]).to.equal(enhancedScores[idMatch[1]]);
                  }
                });
              });
            });
          }
        });
      });
    });
  });

  describe('Performance and Stability', () => {
    it('should handle large numbers of fragments without accuracy loss', () => {
      // Create a large set of fragments with varied scores
      const largeScoreSet = Array.from({ length: 50 }, (_, i) => Math.random() * 100);
      
      cy.setupSimilarityTest(largeScoreSet);
      
      // Verify all fragments display valid percentages
      cy.get('.fragment-item').should('have.length', largeScoreSet.length);
      
      cy.get('.fragment-item').each(($fragment) => {
        cy.wrap($fragment).within(() => {
          cy.get('body').should(($body) => {
            const text = $body.text();
            const percentageMatch = text.match(/(\d+\.?\d*)%/);
            
            expect(percentageMatch).to.not.be.null;
            
            if (percentageMatch) {
              const score = parseFloat(percentageMatch[1]);
              expect(score).to.be.at.least(0);
              expect(score).to.be.at.most(100);
            }
          });
        });
      });
      
      // Verify average calculation still works correctly
      const expectedAverage = calculateExpectedAverage(largeScoreSet);
      cy.verifyAverageSimilarity('F1', expectedAverage);
    });

    it('should handle rapid score updates without display issues', () => {
      // Test multiple quick score changes
      const scoreSets = [
        [90, 80, 70],
        [95, 85, 75],
        [100, 90, 80]
      ];
      
      scoreSets.forEach((scores, index) => {
        cy.setupSimilarityTest(scores);
        
        // Verify scores update correctly each time
        scores.forEach((score, scoreIndex) => {
          const fragmentId = `F1-${scoreIndex + 1}`;
          const expectedScore = expectedFormattedScore(score);
          cy.contains(fragmentId).parent().should('contain', expectedScore);
        });
        
        // Verify average updates correctly
        const expectedAverage = calculateExpectedAverage(scores);
        cy.verifyAverageSimilarity('F1', expectedAverage);
      });
    });
  });

  describe('Accessibility and User Experience', () => {
    beforeEach(() => {
      cy.setupSimilarityTest([96.5, 87.2, 73.8, 58.3, 31.7]);
    });

    it('should provide clear visual hierarchy for different score ranges', () => {
      // Verify that excellent scores are most visually prominent
      cy.contains('F1-1').parent().should(($fragment) => {
        const text = $fragment.text();
        expect(text).to.include('🎯');
        expect(text.toLowerCase()).to.include('excellent');
      });
      
      // Verify poor scores have appropriate warning indicators
      cy.contains('F1-5').parent().should(($fragment) => {
        const text = $fragment.text();
        expect(text).to.include('🚫');
        expect(text.toLowerCase()).to.include('very poor');
      });
    });

    it('should provide consistent and intuitive score formatting', () => {
      cy.get('.fragment-item').each(($fragment) => {
        cy.wrap($fragment).within(() => {
          cy.get('body').should(($body) => {
            const text = $body.text();
            const percentageMatches = text.match(/(\d+\.?\d*)%/g);
            
            if (percentageMatches) {
              percentageMatches.forEach((match) => {
                // All percentages should follow consistent format
                expect(match).to.match(/^\d+\.?\d*%$/);
                
                // No unnecessary precision
                const numberPart = match.replace('%', '');
                if (numberPart.includes('.')) {
                  const decimalPart = numberPart.split('.')[1];
                  expect(decimalPart.length).to.be.at.most(1);
                }
              });
            }
          });
        });
      });
    });

    it('should display verification status consistent with similarity scores', () => {
      cy.get('.fragment-item').each(($fragment) => {
        cy.wrap($fragment).within(() => {
          cy.get('body').should(($body) => {
            const text = $body.text();
            const percentageMatch = text.match(/(\d+\.?\d*)%/);
            
            if (percentageMatch) {
              const score = parseFloat(percentageMatch[1]);
              
              // Verification status should match score threshold (70%)
              if (score >= 70) {
                expect(text).to.include('✓');
                expect(text.toLowerCase()).to.satisfy((text: string) =>
                  text.includes('verified') || text.includes('excellent') || 
                  text.includes('good') || text.includes('fair')
                );
              } else {
                expect(text).to.include('✕');
                expect(text.toLowerCase()).to.satisfy((text: string) =>
                  text.includes('unverified') || text.includes('poor') || text.includes('very poor')
                );
              }
            }
          });
        });
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed API responses gracefully', () => {
      // Test with missing similarity_score fields
      cy.intercept('GET', '**/results/*', {
        body: {
          submission_id: 'malformed-test',
          status: 'completed',
          fragments: {
            F1: [
              { id: 'f1-1', sequence_number: 1, content: 'test', verified: true },
              { id: 'f1-2', sequence_number: 2, content: 'test', similarity_score: 'invalid', verified: false },
              { id: 'f1-3', sequence_number: 3, content: 'test', similarity_score: -5, verified: false }
            ]
          }
        }
      }).as('getMalformedData');
      
      cy.visit('/');
      cy.get('[data-testid="text-input"]').clear().type('Malformed test');
      cy.get('[data-testid="process-button"]').click();
      cy.wait('@getMalformedData');
      cy.get('[data-testid="tab-fragments"]').click();
      
      // All fragments should display valid percentages (defaulting to 0.0% for invalid data)
      cy.get('.fragment-item').each(($fragment) => {
        cy.wrap($fragment).within(() => {
          cy.get('body').should(($body) => {
            const text = $body.text();
            const percentageMatch = text.match(/(\d+\.?\d*)%/);
            
            expect(percentageMatch).to.not.be.null;
            if (percentageMatch) {
              const score = parseFloat(percentageMatch[1]);
              expect(score).to.be.at.least(0);
              expect(score).to.be.at.most(100);
              expect(isNaN(score)).to.be.false;
            }
          });
        });
      });
    });

    it('should handle empty fragment arrays without errors', () => {
      cy.intercept('GET', '**/results/*', {
        body: {
          submission_id: 'empty-test',
          status: 'completed',
          fragments: {
            F1: [],
            F2: []
          }
        }
      }).as('getEmptyData');
      
      cy.visit('/');
      cy.get('[data-testid="text-input"]').clear().type('Empty test');
      cy.get('[data-testid="process-button"]').click();
      cy.wait('@getEmptyData');
      cy.get('[data-testid="tab-fragments"]').click();
      
      // Should display appropriate empty states
      cy.contains('F1 Fragments').should('be.visible');
      cy.contains('F2 Fragments').should('be.visible');
      
      // Average should either not be shown or show 0.0%
      cy.get('body').should(($body) => {
        const text = $body.text();
        if (text.includes('Avg:')) {
          expect(text).to.match(/Avg[^:]*:\s*0\.0%/i);
        }
      });
    });
  });
});
