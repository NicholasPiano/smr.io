/**
 * Cypress tests specifically focused on similarity calculation accuracy.
 * 
 * These tests use controlled test data to verify that similarity percentages
 * are calculated correctly using the expected algorithms and displayed accurately.
 */

describe('Similarity Calculation Accuracy', () => {
  
  describe('Formatting Function Accuracy', () => {
    it('should accurately test the formatSimilarityScore function with edge cases', () => {
      // Visit the page and access the utility functions
      cy.visit('/');
      
      // Test the formatting function with known edge cases
      cy.window().then((win) => {
        // We need to access the formatSimilarityScore function
        // This might require exposing it globally for testing or importing it
        
        // For now, we'll test the behavior by observing UI outputs
        // when we control the input data through API mocking
        cy.intercept('GET', '**/results/*', {
          fixture: 'similarity-edge-cases.json'
        }).as('getEdgeCases');
        
        // Trigger processing
        cy.get('[data-testid="text-input"]')
          .clear()
          .type('Test text for similarity edge cases');
        cy.get('[data-testid="process-button"]').click();
        
        cy.wait('@getEdgeCases');
        cy.get('[data-testid="tab-fragments"]').click();
        
        // Test specific formatting cases based on our fixture data
        
        // Perfect score (100.0) should display as "100%"
        cy.contains('F1-1').parent().should('contain', '100%');
        cy.contains('F1-1').parent().should('not.contain', '100.0%');
        
        // Near perfect (99.7) should display as "99.9%"
        cy.contains('F1-2').parent().should('contain', '99.9%');
        
        // Very close to 100 (99.95) should display as "99.9%"
        cy.contains('F1-9').parent().should('contain', '99.9%');
        
        // Decimal should be rounded to 1 place (85.3333 -> 85.3%)
        cy.contains('F1-10').parent().should('contain', '85.3%');
        
        // Zero should display as "0.0%"
        cy.contains('F1-8').parent().should('contain', '0.0%');
      });
    });
  });

  describe('Average Calculation Accuracy', () => {
    beforeEach(() => {
      cy.visit('/');
      cy.intercept('GET', '**/results/*', {
        fixture: 'similarity-edge-cases.json'
      }).as('getEdgeCases');
      
      cy.get('[data-testid="text-input"]')
        .clear()
        .type('Test text');
      cy.get('[data-testid="process-button"]').click();
      cy.wait('@getEdgeCases');
      cy.get('[data-testid="tab-fragments"]').click();
    });

    it('should calculate F1 average correctly with mixed scores', () => {
      // Based on our fixture: 100.0, 99.7, 96.3, 87.5, 72.1, 55.8, 23.4, 0.0, 99.95, 85.3333
      // Expected average: (100 + 99.7 + 96.3 + 87.5 + 72.1 + 55.8 + 23.4 + 0 + 99.95 + 85.3333) / 10 = 72.01%
      
      cy.contains('F1 Fragments').parent().should(($header) => {
        const text = $header.text();
        const avgMatch = text.match(/Avg[^:]*:\s*(\d+\.?\d*)%/i);
        
        if (avgMatch) {
          const displayedAvg = parseFloat(avgMatch[1]);
          // Allow small rounding tolerance
          expect(displayedAvg).to.be.closeTo(72.0, 0.5);
        }
      });
    });

    it('should calculate F2 average correctly', () => {
      // Based on our fixture: 100.0, 94.2
      // Expected average: (100 + 94.2) / 2 = 97.1%
      
      cy.contains('F2 Fragments').parent().should(($header) => {
        const text = $header.text();
        const avgMatch = text.match(/Avg[^:]*:\s*(\d+\.?\d*)%/i);
        
        if (avgMatch) {
          const displayedAvg = parseFloat(avgMatch[1]);
          expect(displayedAvg).to.be.closeTo(97.1, 0.1);
        }
      });
    });

    it('should exclude null/undefined scores from average calculation', () => {
      // Create a fixture with some null scores
      cy.intercept('GET', '**/results/*', {
        body: {
          submission_id: "null-test-id",
          status: "completed",
          fragments: {
            F1: [
              {
                id: "f1-null-1",
                sequence_number: 1,
                content: "Valid score",
                similarity_score: 80.0,
                verified: true
              },
              {
                id: "f1-null-2", 
                sequence_number: 2,
                content: "Null score",
                similarity_score: null,
                verified: false
              },
              {
                id: "f1-null-3",
                sequence_number: 3,
                content: "Another valid score",
                similarity_score: 60.0,
                verified: true
              }
            ]
          }
        }
      }).as('getNullScores');
      
      cy.reload();
      cy.get('[data-testid="text-input"]')
        .clear()
        .type('Test with null scores');
      cy.get('[data-testid="process-button"]').click();
      cy.wait('@getNullScores');
      cy.get('[data-testid="tab-fragments"]').click();
      
      // Average should be (80 + 60) / 2 = 70%, not including the null score
      cy.contains('F1 Fragments').parent().should(($header) => {
        const text = $header.text();
        const avgMatch = text.match(/Avg[^:]*:\s*(\d+\.?\d*)%/i);
        
        if (avgMatch) {
          const displayedAvg = parseFloat(avgMatch[1]);
          expect(displayedAvg).to.be.closeTo(70.0, 0.1);
        }
      });
    });
  });

  describe('Score Range Validation', () => {
    it('should handle boundary values correctly', () => {
      // Test with boundary values
      cy.intercept('GET', '**/results/*', {
        body: {
          submission_id: "boundary-test-id",
          status: "completed",
          fragments: {
            F1: [
              {
                id: "f1-boundary-1",
                sequence_number: 1,
                content: "Minimum boundary",
                similarity_score: 0.0,
                verified: false
              },
              {
                id: "f1-boundary-2",
                sequence_number: 2,
                content: "Maximum boundary",
                similarity_score: 100.0,
                verified: true
              },
              {
                id: "f1-boundary-3",
                sequence_number: 3,
                content: "Just above threshold",
                similarity_score: 70.1,
                verified: true
              },
              {
                id: "f1-boundary-4",
                sequence_number: 4,
                content: "Just below threshold",
                similarity_score: 69.9,
                verified: false
              }
            ]
          }
        }
      }).as('getBoundaryValues');
      
      cy.visit('/');
      cy.get('[data-testid="text-input"]')
        .clear()
        .type('Boundary test');
      cy.get('[data-testid="process-button"]').click();
      cy.wait('@getBoundaryValues');
      cy.get('[data-testid="tab-fragments"]').click();
      
      // Check boundary displays
      cy.contains('F1-1').parent().should('contain', '0.0%');
      cy.contains('F1-2').parent().should('contain', '100%');
      cy.contains('F1-3').parent().should('contain', '70.1%');
      cy.contains('F1-4').parent().should('contain', '69.9%');
      
      // Verify verification status corresponds to scores
      cy.contains('F1-3').parent().should('contain', '✓'); // 70.1% should be verified
      cy.contains('F1-4').parent().should('contain', '✕'); // 69.9% should not be verified
    });
  });

  describe('Mathematical Precision', () => {
    it('should maintain precision in calculations without floating point errors', () => {
      // Test with values that might cause floating point precision issues
      cy.intercept('GET', '**/results/*', {
        body: {
          submission_id: "precision-test-id",
          status: "completed", 
          fragments: {
            F1: [
              {
                id: "f1-precision-1",
                sequence_number: 1,
                content: "Precision test 1",
                similarity_score: 33.333333,
                verified: false
              },
              {
                id: "f1-precision-2", 
                sequence_number: 2,
                content: "Precision test 2",
                similarity_score: 66.666666,
                verified: true
              },
              {
                id: "f1-precision-3",
                sequence_number: 3,
                content: "Precision test 3", 
                similarity_score: 99.999999,
                verified: true
              }
            ]
          }
        }
      }).as('getPrecisionValues');
      
      cy.visit('/');
      cy.get('[data-testid="text-input"]')
        .clear()
        .type('Precision test');
      cy.get('[data-testid="process-button"]').click();
      cy.wait('@getPrecisionValues');
      cy.get('[data-testid="tab-fragments"]').click();
      
      // Verify proper rounding without floating point artifacts
      cy.contains('F1-1').parent().should('contain', '33.3%');
      cy.contains('F1-2').parent().should('contain', '66.7%'); 
      cy.contains('F1-3').parent().should('contain', '99.9%'); // Should cap at 99.9%
      
      // Verify average calculation: (33.333333 + 66.666666 + 99.999999) / 3 ≈ 66.7%
      cy.contains('F1 Fragments').parent().should(($header) => {
        const text = $header.text();
        const avgMatch = text.match(/Avg[^:]*:\s*(\d+\.?\d*)%/i);
        
        if (avgMatch) {
          const displayedAvg = parseFloat(avgMatch[1]);
          expect(displayedAvg).to.be.closeTo(66.7, 0.1);
        }
      });
    });
  });

  describe('Icon and Label Accuracy', () => {
    beforeEach(() => {
      cy.visit('/');
      cy.intercept('GET', '**/results/*', {
        fixture: 'similarity-edge-cases.json'
      }).as('getEdgeCases');
      
      cy.get('[data-testid="text-input"]')
        .clear()
        .type('Test text');
      cy.get('[data-testid="process-button"]').click();
      cy.wait('@getEdgeCases');
      cy.get('[data-testid="tab-fragments"]').click();
    });

    it('should display correct icons for each score range', () => {
      // Test each score range from our fixture
      
      // Excellent (≥95%): F1-1 (100%), F1-2 (99.7% -> 99.9%), F1-3 (96.3%), F1-9 (99.95% -> 99.9%)
      cy.contains('F1-1').parent().should('contain', '🎯');
      cy.contains('F1-2').parent().should('contain', '🎯');
      cy.contains('F1-3').parent().should('contain', '🎯');
      cy.contains('F1-9').parent().should('contain', '🎯');
      
      // Good (85-94%): F1-4 (87.5%), F1-10 (85.3%)
      cy.contains('F1-4').parent().should('contain', '✅');
      cy.contains('F1-10').parent().should('contain', '✅');
      
      // Fair (70-84%): F1-5 (72.1%)
      cy.contains('F1-5').parent().should('contain', '⚠️');
      
      // Poor (50-69%): F1-6 (55.8%)
      cy.contains('F1-6').parent().should('contain', '❌');
      
      // Very Poor (<50%): F1-7 (23.4%), F1-8 (0.0%)
      cy.contains('F1-7').parent().should('contain', '🚫');
      cy.contains('F1-8').parent().should('contain', '🚫');
    });

    it('should display correct labels for each score range', () => {
      // Test labels (case insensitive)
      
      // Excellent (≥95%)
      cy.contains('F1-1').parent().should(($el) => {
        expect($el.text().toLowerCase()).to.include('excellent');
      });
      
      // Good (85-94%)
      cy.contains('F1-4').parent().should(($el) => {
        expect($el.text().toLowerCase()).to.include('good');
      });
      
      // Fair (70-84%)
      cy.contains('F1-5').parent().should(($el) => {
        expect($el.text().toLowerCase()).to.include('fair');
      });
      
      // Poor (50-69%)
      cy.contains('F1-6').parent().should(($el) => {
        expect($el.text().toLowerCase()).to.include('poor');
        expect($el.text().toLowerCase()).not.to.include('very poor');
      });
      
      // Very Poor (<50%)
      cy.contains('F1-7').parent().should(($el) => {
        expect($el.text().toLowerCase()).to.include('very poor');
      });
    });
  });

  describe('Progress Bar Accuracy', () => {
    beforeEach(() => {
      cy.visit('/');
      cy.intercept('GET', '**/results/*', {
        fixture: 'similarity-edge-cases.json'
      }).as('getEdgeCases');
      
      cy.get('[data-testid="text-input"]')
        .clear()
        .type('Test text');
      cy.get('[data-testid="process-button"]').click();
      cy.wait('@getEdgeCases');
      cy.get('[data-testid="tab-fragments"]').click();
    });

    it('should display progress bars with widths matching similarity scores', () => {
      // Check that progress bar widths correspond to similarity scores
      cy.get('.fragment-item').each(($fragment) => {
        cy.wrap($fragment).within(() => {
          // Get the displayed percentage
          cy.get('body').should(($body) => {
            const text = $body.text();
            const percentageMatch = text.match(/(\d+\.?\d*)%/);
            
            if (percentageMatch) {
              const displayedPercentage = parseFloat(percentageMatch[1]);
              
              // Find progress bar elements and verify width
              cy.get('[style*="width"]').should(($progressElements) => {
                let foundMatchingBar = false;
                
                $progressElements.each((_, element) => {
                  const style = element.getAttribute('style') || '';
                  const widthMatch = style.match(/width:\s*(\d+\.?\d*)%/);
                  
                  if (widthMatch) {
                    const barWidth = parseFloat(widthMatch[1]);
                    // Allow for small rounding differences
                    if (Math.abs(barWidth - displayedPercentage) <= 1) {
                      foundMatchingBar = true;
                    }
                  }
                });
                
                // If there are progress bars, at least one should match the percentage
                if ($progressElements.length > 0) {
                  expect(foundMatchingBar).to.be.true;
                }
              });
            }
          });
        });
      });
    });

    it('should show 100% width for perfect scores', () => {
      // F1-1 has 100% score, should have 100% width progress bar
      cy.contains('F1-1').parent().within(() => {
        cy.get('[style*="width: 100%"]').should('exist');
      });
    });

    it('should show 0% width for zero scores', () => {
      // F1-8 has 0% score, should have 0% width progress bar
      cy.contains('F1-8').parent().within(() => {
        cy.get('[style*="width: 0%"]').should('exist');
      });
    });
  });
});
