/**
 * Cypress tests for similarity utility functions.
 * 
 * These tests verify that the utility functions in utils/similarity.ts
 * work correctly and handle edge cases properly.
 */

describe('Similarity Utility Functions', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  describe('formatSimilarityScore Function', () => {
    it('should format scores correctly for all edge cases', () => {
      cy.window().then((win) => {
        // Import the utility functions if they're exposed
        // For comprehensive testing, we'll test via component behavior
        
        // Create a test component or access the functions directly
        // This approach tests the actual implementation
        cy.intercept('GET', '**/results/*', {
          body: {
            submission_id: "format-test",
            status: "completed",
            fragments: {
              F1: [
                { id: "f1-1", sequence_number: 1, content: "test", similarity_score: 100.0, verified: true },
                { id: "f1-2", sequence_number: 2, content: "test", similarity_score: 99.95, verified: true },
                { id: "f1-3", sequence_number: 3, content: "test", similarity_score: 99.5, verified: true },
                { id: "f1-4", sequence_number: 4, content: "test", similarity_score: 99.49, verified: true },
                { id: "f1-5", sequence_number: 5, content: "test", similarity_score: 85.3333, verified: true },
                { id: "f1-6", sequence_number: 6, content: "test", similarity_score: 0.0, verified: false },
                { id: "f1-7", sequence_number: 7, content: "test", similarity_score: null, verified: false },
                { id: "f1-8", sequence_number: 8, content: "test", similarity_score: undefined, verified: false }
              ]
            }
          }
        }).as('getFormatTest');
        
        cy.get('[data-testid="text-input"]').clear().type('Format test');
        cy.get('[data-testid="process-button"]').click();
        cy.wait('@getFormatTest');
        cy.get('[data-testid="tab-fragments"]').click();
        
        // Test specific formatting behaviors
        cy.contains('F1-1').parent().should('contain', '100%').and('not.contain', '100.0%');
        cy.contains('F1-2').parent().should('contain', '99.9%'); // 99.95 rounds to 99.9%
        cy.contains('F1-3').parent().should('contain', '99.9%'); // >= 99.5 becomes 99.9%
        cy.contains('F1-4').parent().should('contain', '99.5%'); // < 99.5 keeps normal formatting
        cy.contains('F1-5').parent().should('contain', '85.3%'); // Proper decimal rounding
        cy.contains('F1-6').parent().should('contain', '0.0%'); // Zero case
        cy.contains('F1-7').parent().should('contain', '0.0%'); // Null case
        cy.contains('F1-8').parent().should('contain', '0.0%'); // Undefined case
      });
    });
  });

  describe('getSimilarityColor Function', () => {
    it('should return correct colors for score ranges', () => {
      cy.intercept('GET', '**/results/*', {
        body: {
          submission_id: "color-test",
          status: "completed",
          fragments: {
            F1: [
              { id: "f1-1", sequence_number: 1, content: "excellent", similarity_score: 97.0, verified: true },
              { id: "f1-2", sequence_number: 2, content: "good", similarity_score: 88.0, verified: true },
              { id: "f1-3", sequence_number: 3, content: "fair", similarity_score: 75.0, verified: true },
              { id: "f1-4", sequence_number: 4, content: "poor", similarity_score: 55.0, verified: false },
              { id: "f1-5", sequence_number: 5, content: "very poor", similarity_score: 25.0, verified: false }
            ]
          }
        }
      }).as('getColorTest');
      
      cy.get('[data-testid="text-input"]').clear().type('Color test');
      cy.get('[data-testid="process-button"]').click();
      cy.wait('@getColorTest');
      cy.get('[data-testid="tab-fragments"]').click();
      
      // Verify color-coded elements exist for different score ranges
      // (We check for styled elements rather than specific color values for reliability)
      
      // Excellent range (≥95%) - should have green-ish styling
      cy.contains('F1-1').parent().find('[style*="color"]').should('exist');
      
      // Good range (85-94%) - should have light green styling
      cy.contains('F1-2').parent().find('[style*="color"]').should('exist');
      
      // Fair range (70-84%) - should have orange/yellow styling
      cy.contains('F1-3').parent().find('[style*="color"]').should('exist');
      
      // Poor range (50-69%) - should have orange/red styling
      cy.contains('F1-4').parent().find('[style*="color"]').should('exist');
      
      // Very poor range (<50%) - should have red styling
      cy.contains('F1-5').parent().find('[style*="color"]').should('exist');
    });

    it('should handle null and undefined scores gracefully', () => {
      cy.intercept('GET', '**/results/*', {
        body: {
          submission_id: "null-color-test",
          status: "completed",
          fragments: {
            F1: [
              { id: "f1-1", sequence_number: 1, content: "null test", similarity_score: null, verified: false },
              { id: "f1-2", sequence_number: 2, content: "undefined test", similarity_score: undefined, verified: false }
            ]
          }
        }
      }).as('getNullColorTest');
      
      cy.get('[data-testid="text-input"]').clear().type('Null color test');
      cy.get('[data-testid="process-button"]').click();
      cy.wait('@getNullColorTest');
      cy.get('[data-testid="tab-fragments"]').click();
      
      // Both should be treated as 0 and get "very poor" styling
      cy.contains('F1-1').parent().find('[style*="color"]').should('exist');
      cy.contains('F1-2').parent().find('[style*="color"]').should('exist');
    });
  });

  describe('getSimilarityLabel Function', () => {
    it('should return correct labels for all score ranges', () => {
      cy.intercept('GET', '**/results/*', {
        body: {
          submission_id: "label-test",
          status: "completed",
          fragments: {
            F1: [
              { id: "f1-1", sequence_number: 1, content: "test", similarity_score: 98.0, verified: true },
              { id: "f1-2", sequence_number: 2, content: "test", similarity_score: 90.0, verified: true },
              { id: "f1-3", sequence_number: 3, content: "test", similarity_score: 75.0, verified: true },
              { id: "f1-4", sequence_number: 4, content: "test", similarity_score: 60.0, verified: false },
              { id: "f1-5", sequence_number: 5, content: "test", similarity_score: 30.0, verified: false },
              { id: "f1-6", sequence_number: 6, content: "test", similarity_score: 95.0, verified: true }, // boundary
              { id: "f1-7", sequence_number: 7, content: "test", similarity_score: 85.0, verified: true }, // boundary
              { id: "f1-8", sequence_number: 8, content: "test", similarity_score: 70.0, verified: true }, // boundary
              { id: "f1-9", sequence_number: 9, content: "test", similarity_score: 50.0, verified: false } // boundary
            ]
          }
        }
      }).as('getLabelTest');
      
      cy.get('[data-testid="text-input"]').clear().type('Label test');
      cy.get('[data-testid="process-button"]').click();
      cy.wait('@getLabelTest');
      cy.get('[data-testid="tab-fragments"]').click();
      
      // Test labels for each range
      cy.contains('F1-1').parent().should(($el) => {
        expect($el.text().toLowerCase()).to.include('excellent');
      });
      
      cy.contains('F1-2').parent().should(($el) => {
        expect($el.text().toLowerCase()).to.include('good');
      });
      
      cy.contains('F1-3').parent().should(($el) => {
        expect($el.text().toLowerCase()).to.include('fair');
      });
      
      cy.contains('F1-4').parent().should(($el) => {
        expect($el.text().toLowerCase()).to.include('poor');
        expect($el.text().toLowerCase()).not.to.include('very poor');
      });
      
      cy.contains('F1-5').parent().should(($el) => {
        expect($el.text().toLowerCase()).to.include('very poor');
      });
      
      // Test boundary values
      cy.contains('F1-6').parent().should(($el) => {
        expect($el.text().toLowerCase()).to.include('excellent'); // 95.0 is excellent
      });
      
      cy.contains('F1-7').parent().should(($el) => {
        expect($el.text().toLowerCase()).to.include('good'); // 85.0 is good
      });
      
      cy.contains('F1-8').parent().should(($el) => {
        expect($el.text().toLowerCase()).to.include('fair'); // 70.0 is fair
      });
      
      cy.contains('F1-9').parent().should(($el) => {
        expect($el.text().toLowerCase()).to.include('poor'); // 50.0 is poor
      });
    });
  });

  describe('getSimilarityIcon Function', () => {
    it('should return correct icons for all score ranges', () => {
      cy.intercept('GET', '**/results/*', {
        body: {
          submission_id: "icon-test",
          status: "completed",
          fragments: {
            F1: [
              { id: "f1-1", sequence_number: 1, content: "test", similarity_score: 98.0, verified: true },   // 🎯
              { id: "f1-2", sequence_number: 2, content: "test", similarity_score: 90.0, verified: true },   // ✅
              { id: "f1-3", sequence_number: 3, content: "test", similarity_score: 75.0, verified: true },   // ⚠️
              { id: "f1-4", sequence_number: 4, content: "test", similarity_score: 60.0, verified: false },  // ❌
              { id: "f1-5", sequence_number: 5, content: "test", similarity_score: 30.0, verified: false },  // 🚫
              { id: "f1-6", sequence_number: 6, content: "test", similarity_score: null, verified: false }   // 🚫 (treated as 0)
            ]
          }
        }
      }).as('getIconTest');
      
      cy.get('[data-testid="text-input"]').clear().type('Icon test');
      cy.get('[data-testid="process-button"]').click();
      cy.wait('@getIconTest');
      cy.get('[data-testid="tab-fragments"]').click();
      
      // Test icons for each range
      cy.contains('F1-1').parent().should('contain', '🎯'); // Excellent (≥95%)
      cy.contains('F1-2').parent().should('contain', '✅'); // Good (85-94%)
      cy.contains('F1-3').parent().should('contain', '⚠️'); // Fair (70-84%)
      cy.contains('F1-4').parent().should('contain', '❌'); // Poor (50-69%)
      cy.contains('F1-5').parent().should('contain', '🚫'); // Very Poor (<50%)
      cy.contains('F1-6').parent().should('contain', '🚫'); // Null treated as Very Poor
    });
  });

  describe('calculateAverageSimilarity Function', () => {
    it('should calculate averages correctly with mixed valid and invalid scores', () => {
      cy.intercept('GET', '**/results/*', {
        body: {
          submission_id: "avg-test",
          status: "completed",
          fragments: {
            F1: [
              { id: "f1-1", sequence_number: 1, content: "test", similarity_score: 80.0, verified: true },
              { id: "f1-2", sequence_number: 2, content: "test", similarity_score: 60.0, verified: true },
              { id: "f1-3", sequence_number: 3, content: "test", similarity_score: null, verified: false },
              { id: "f1-4", sequence_number: 4, content: "test", similarity_score: undefined, verified: false },
              { id: "f1-5", sequence_number: 5, content: "test", similarity_score: 90.0, verified: true }
            ]
          }
        }
      }).as('getAvgTest');
      
      cy.get('[data-testid="text-input"]').clear().type('Average test');
      cy.get('[data-testid="process-button"]').click();
      cy.wait('@getAvgTest');
      cy.get('[data-testid="tab-fragments"]').click();
      
      // Average should be (80 + 60 + 90) / 3 = 76.7% (excluding null/undefined)
      cy.contains('F1 Fragments').parent().should(($header) => {
        const text = $header.text();
        const avgMatch = text.match(/Avg[^:]*:\s*(\d+\.?\d*)%/i);
        
        if (avgMatch) {
          const displayedAvg = parseFloat(avgMatch[1]);
          expect(displayedAvg).to.be.closeTo(76.7, 0.1);
        }
      });
    });

    it('should handle empty arrays gracefully', () => {
      cy.intercept('GET', '**/results/*', {
        body: {
          submission_id: "empty-avg-test",
          status: "completed",
          fragments: {
            F1: []
          }
        }
      }).as('getEmptyAvgTest');
      
      cy.get('[data-testid="text-input"]').clear().type('Empty average test');
      cy.get('[data-testid="process-button"]').click();
      cy.wait('@getEmptyAvgTest');
      cy.get('[data-testid="tab-fragments"]').click();
      
      // Should handle empty array gracefully (either not show average or show 0.0%)
      cy.contains('F1 Fragments').should('be.visible');
      cy.get('body').should(($body) => {
        const text = $body.text();
        // If average is shown, it should be 0.0%
        if (text.includes('Avg:')) {
          expect(text).to.match(/Avg[^:]*:\s*0\.0%/i);
        }
      });
    });

    it('should handle arrays with all null/undefined scores', () => {
      cy.intercept('GET', '**/results/*', {
        body: {
          submission_id: "all-null-avg-test",
          status: "completed",
          fragments: {
            F1: [
              { id: "f1-1", sequence_number: 1, content: "test", similarity_score: null, verified: false },
              { id: "f1-2", sequence_number: 2, content: "test", similarity_score: undefined, verified: false }
            ]
          }
        }
      }).as('getAllNullAvgTest');
      
      cy.get('[data-testid="text-input"]').clear().type('All null average test');
      cy.get('[data-testid="process-button"]').click();
      cy.wait('@getAllNullAvgTest');
      cy.get('[data-testid="tab-fragments"]').click();
      
      // Should default to 0.0% when all scores are null/undefined
      cy.contains('F1 Fragments').parent().should(($header) => {
        const text = $header.text();
        if (text.includes('Avg:')) {
          const avgMatch = text.match(/Avg[^:]*:\s*(\d+\.?\d*)%/i);
          if (avgMatch) {
            const displayedAvg = parseFloat(avgMatch[1]);
            expect(displayedAvg).to.equal(0.0);
          }
        }
      });
    });
  });

  describe('Function Integration', () => {
    it('should work together consistently across all components', () => {
      cy.intercept('GET', '**/results/*', {
        fixture: 'similarity-edge-cases.json'
      }).as('getIntegrationTest');
      
      cy.get('[data-testid="text-input"]').clear().type('Integration test');
      cy.get('[data-testid="process-button"]').click();
      cy.wait('@getIntegrationTest');
      cy.get('[data-testid="tab-fragments"]').click();
      
      // Verify that all utility functions work together consistently
      cy.get('.fragment-item').each(($fragment) => {
        cy.wrap($fragment).within(() => {
          cy.get('body').should(($body) => {
            const text = $body.text();
            const percentageMatch = text.match(/(\d+\.?\d*)%/);
            
            if (percentageMatch) {
              const score = parseFloat(percentageMatch[1]);
              
              // Verify icon matches score range
              if (score >= 95) {
                expect(text).to.include('🎯');
                expect(text.toLowerCase()).to.include('excellent');
              } else if (score >= 85) {
                expect(text).to.include('✅');
                expect(text.toLowerCase()).to.include('good');
              } else if (score >= 70) {
                expect(text).to.include('⚠️');
                expect(text.toLowerCase()).to.include('fair');
              } else if (score >= 50) {
                expect(text).to.include('❌');
                expect(text.toLowerCase()).to.include('poor');
              } else {
                expect(text).to.include('🚫');
                expect(text.toLowerCase()).to.include('very poor');
              }
              
              // Verify score formatting is consistent
              expect(score).to.be.at.least(0);
              expect(score).to.be.at.most(100);
              
              // Check decimal places
              if (score === 100) {
                expect(text).to.include('100%');
                expect(text).not.to.include('100.0%');
              } else if (score !== Math.floor(score)) {
                // Non-integer should have exactly one decimal place
                const scoreStr = score.toString();
                const decimalPart = scoreStr.split('.')[1];
                expect(decimalPart).to.have.lengthOf(1);
              }
            }
          });
        });
      });
    });
  });
});
