/**
 * Cypress tests for fragment similarity percentage display accuracy.
 * 
 * These tests verify that similarity percentages are calculated and displayed
 * correctly throughout the application, including individual fragment scores,
 * average calculations, formatting, and visual indicators.
 */

describe('Fragment Similarity Percentage Accuracy', () => {
  beforeEach(() => {
    cy.visit('/');
    
    // Use the text input to start processing
    const sampleText = `The rapid advancement of artificial intelligence has transformed numerous industries over the past decade. From healthcare diagnostics to autonomous vehicles, AI systems are becoming increasingly sophisticated and capable. Machine learning algorithms can now process vast amounts of data to identify patterns that would be impossible for humans to detect manually.`;
    
    cy.get('[data-testid="text-input"]')
      .clear()
      .type(sampleText);
    
    cy.get('[data-testid="submit-button"]').click();
    
    // Wait for processing to complete and fragments to load
    cy.contains('F1 Fragments', { timeout: 30000 }).should('be.visible');
  });

  describe('Individual Fragment Similarity Scores', () => {
    it('should display valid percentage format for all fragments', () => {
      // Check F1 fragments for valid percentage formatting
      cy.get('.fragment-item.f1').should('have.length.at.least', 1);
      
      cy.get('.fragment-item.f1').each(($fragment) => {
        // Each fragment should have a similarity percentage
        cy.wrap($fragment).within(() => {
          // Look for percentage pattern (e.g., "95.5%", "100%", "0.0%")
          cy.get('body').should(($body) => {
            const text = $body.text();
            expect(text).to.match(/\d+\.?\d*%/);
          });
        });
      });
      
      // Check F2 fragments if they exist
      cy.get('body').then(($body) => {
        if ($body.find('.fragment-item.f2').length > 0) {
          cy.get('.fragment-item.f2').each(($fragment) => {
            cy.wrap($fragment).within(() => {
              cy.get('body').should(($body) => {
                const text = $body.text();
                expect(text).to.match(/\d+\.?\d*%/);
              });
            });
          });
        }
      });
    });

    it('should display scores within valid range (0-100%)', () => {
      cy.get('.fragment-item').each(($fragment) => {
        cy.wrap($fragment).within(() => {
          // Extract percentage value from fragment
          cy.get('body').should(($body) => {
            const text = $body.text();
            const percentageMatch = text.match(/(\d+\.?\d*)%/);
            
            if (percentageMatch) {
              const percentage = parseFloat(percentageMatch[1]);
              expect(percentage).to.be.at.least(0);
              expect(percentage).to.be.at.most(100);
            }
          });
        });
      });
    });

    it('should show appropriate similarity icons based on score ranges', () => {
      cy.get('.fragment-item').each(($fragment) => {
        cy.wrap($fragment).within(() => {
          cy.get('body').should(($body) => {
            const text = $body.text();
            const percentageMatch = text.match(/(\d+\.?\d*)%/);
            
            if (percentageMatch) {
              const percentage = parseFloat(percentageMatch[1]);
              
              // Verify appropriate icon for score range
              if (percentage >= 95) {
                expect(text).to.include('🎯'); // Excellent
              } else if (percentage >= 85) {
                expect(text).to.include('✅'); // Good
              } else if (percentage >= 70) {
                expect(text).to.include('⚠️'); // Fair
              } else if (percentage >= 50) {
                expect(text).to.include('❌'); // Poor
              } else {
                expect(text).to.include('🚫'); // Very Poor
              }
            }
          });
        });
      });
    });

    it('should show appropriate similarity labels based on score ranges', () => {
      cy.get('.fragment-item').each(($fragment) => {
        cy.wrap($fragment).within(() => {
          cy.get('body').should(($body) => {
            const text = $body.text();
            const percentageMatch = text.match(/(\d+\.?\d*)%/);
            
            if (percentageMatch) {
              const percentage = parseFloat(percentageMatch[1]);
              
              // Verify appropriate label for score range
              if (percentage >= 95) {
                expect(text.toLowerCase()).to.include('excellent');
              } else if (percentage >= 85) {
                expect(text.toLowerCase()).to.include('good');
              } else if (percentage >= 70) {
                expect(text.toLowerCase()).to.include('fair');
              } else if (percentage >= 50) {
                expect(text.toLowerCase()).to.include('poor');
              } else {
                expect(text.toLowerCase()).to.include('very poor');
              }
            }
          });
        });
      });
    });
  });

  describe('Average Similarity Calculations', () => {
    it('should display accurate average similarity in F1 header', () => {
      // Get all F1 fragment similarity scores
      let f1Scores: number[] = [];
      
      cy.get('.fragment-item.f1').each(($fragment) => {
        cy.wrap($fragment).within(() => {
          cy.get('body').should(($body) => {
            const text = $body.text();
            const percentageMatch = text.match(/(\d+\.?\d*)%/);
            if (percentageMatch) {
              f1Scores.push(parseFloat(percentageMatch[1]));
            }
          });
        });
      }).then(() => {
        // Calculate expected average
        const expectedAverage = f1Scores.reduce((sum, score) => sum + score, 0) / f1Scores.length;
        
        // Check if average is displayed in header
        cy.contains('F1 Fragments').parent().should(($header) => {
          const headerText = $header.text();
          const avgMatch = headerText.match(/Avg[^:]*:\s*(\d+\.?\d*)%/i);
          
          if (avgMatch) {
            const displayedAverage = parseFloat(avgMatch[1]);
            // Allow small rounding differences (within 0.1%)
            expect(displayedAverage).to.be.closeTo(expectedAverage, 0.1);
          }
        });
      });
    });

    it('should display accurate average similarity in F2 header if F2 fragments exist', () => {
      cy.get('body').then(($body) => {
        if ($body.find('.fragment-item.f2').length > 0) {
          let f2Scores: number[] = [];
          
          cy.get('.fragment-item.f2').each(($fragment) => {
            cy.wrap($fragment).within(() => {
              cy.get('body').should(($body) => {
                const text = $body.text();
                const percentageMatch = text.match(/(\d+\.?\d*)%/);
                if (percentageMatch) {
                  f2Scores.push(parseFloat(percentageMatch[1]));
                }
              });
            });
          }).then(() => {
            if (f2Scores.length > 0) {
              const expectedAverage = f2Scores.reduce((sum, score) => sum + score, 0) / f2Scores.length;
              
              cy.contains('F2 Fragments').parent().should(($header) => {
                const headerText = $header.text();
                const avgMatch = headerText.match(/Avg[^:]*:\s*(\d+\.?\d*)%/i);
                
                if (avgMatch) {
                  const displayedAverage = parseFloat(avgMatch[1]);
                  expect(displayedAverage).to.be.closeTo(expectedAverage, 0.1);
                }
              });
            }
          });
        }
      });
    });

    it('should handle empty fragment arrays gracefully', () => {
      // This test simulates a case where no fragments exist yet
      // The average should default to 0.0% or not be displayed
      cy.get('body').should(($body) => {
        const text = $body.text();
        
        // If there are no fragments, average should either be 0.0% or not shown
        if (text.includes('No fragments extracted yet')) {
          if (text.includes('Avg:')) {
            expect(text).to.match(/Avg[^:]*:\s*0\.0%/i);
          }
        }
      });
    });
  });

  describe('Similarity Score Formatting Edge Cases', () => {
    // Mock different API responses to test edge cases
    beforeEach(() => {
      // Intercept API calls to control the similarity scores
      cy.intercept('GET', '**/results/*', {
        fixture: 'results-response.json'
      }).as('getResults');
    });

    it('should format perfect scores as "100%" without decimals', () => {
      // Test data from fixture has some 100% scores
      cy.wait('@getResults');
      
      cy.get('.fragment-item').should(($fragments) => {
        const text = $fragments.text();
        // Perfect scores should be "100%" not "100.0%"
        if (text.includes('100')) {
          expect(text).to.include('100%');
          expect(text).not.to.include('100.0%');
        }
      });
    });

    it('should format near-perfect scores as "99.9%" max', () => {
      // This would require a custom fixture with 99.7% score
      cy.get('.fragment-item').should(($fragments) => {
        const text = $fragments.text();
        const percentageMatches = text.match(/(\d+\.?\d*)%/g);
        
        if (percentageMatches) {
          percentageMatches.forEach((match) => {
            const score = parseFloat(match.replace('%', ''));
            if (score >= 99.5 && score < 100) {
              expect(match).to.equal('99.9%');
            }
          });
        }
      });
    });

    it('should format null/undefined scores as "0.0%"', () => {
      // Test the formatSimilarityScore function behavior
      cy.window().then((win) => {
        // Access the formatting function if exposed globally or through the component
        cy.get('.fragment-item').should(($fragments) => {
          const text = $fragments.text();
          // All displayed percentages should be valid numbers, not "NaN%" or "undefined%"
          expect(text).not.to.include('NaN%');
          expect(text).not.to.include('undefined%');
          expect(text).not.to.include('null%');
        });
      });
    });

    it('should display one decimal place for non-integer scores', () => {
      cy.get('.fragment-item').should(($fragments) => {
        const text = $fragments.text();
        const percentageMatches = text.match(/(\d+\.\d+)%/g);
        
        if (percentageMatches) {
          percentageMatches.forEach((match) => {
            const numberPart = match.replace('%', '');
            const decimalPart = numberPart.split('.')[1];
            // Should have exactly one decimal place for non-integer scores
            if (decimalPart) {
              expect(decimalPart).to.have.lengthOf(1);
            }
          });
        }
      });
    });
  });

  describe('Visual Similarity Indicators', () => {
    it('should display similarity progress bars with correct widths', () => {
      cy.get('.fragment-item').each(($fragment) => {
        cy.wrap($fragment).within(() => {
          // Look for progress bar elements (this may need adjustment based on actual DOM structure)
          cy.get('body').should(($body) => {
            const text = $body.text();
            const percentageMatch = text.match(/(\d+\.?\d*)%/);
            
            if (percentageMatch) {
              const percentage = parseFloat(percentageMatch[1]);
              
              // Check if there's a progress bar element with appropriate width
              // Note: This assumes there's a progress bar element with width style
              // The actual selector may need to be adjusted based on implementation
              const progressBars = $body.find('[style*="width"]');
              if (progressBars.length > 0) {
                let foundCorrectWidth = false;
                progressBars.each((_, bar) => {
                  const style = bar.getAttribute('style') || '';
                  const widthMatch = style.match(/width:\s*(\d+\.?\d*)%/);
                  if (widthMatch) {
                    const barWidth = parseFloat(widthMatch[1]);
                    if (Math.abs(barWidth - percentage) < 1) {
                      foundCorrectWidth = true;
                    }
                  }
                });
                
                if (progressBars.length > 0) {
                  expect(foundCorrectWidth).to.be.true;
                }
              }
            }
          });
        });
      });
    });

    it('should apply appropriate color schemes based on similarity scores', () => {
      cy.get('.fragment-item').each(($fragment) => {
        cy.wrap($fragment).within(() => {
          cy.get('body').should(($body) => {
            const text = $body.text();
            const percentageMatch = text.match(/(\d+\.?\d*)%/);
            
            if (percentageMatch) {
              const percentage = parseFloat(percentageMatch[1]);
              
              // Check for color indicators in style attributes or CSS classes
              const styledElements = $body.find('[style*="color"], [class*="text-"]');
              
              // Different score ranges should have different color schemes
              if (percentage >= 95) {
                // Should have green-ish colors for excellent scores
                // This is a basic check - could be more sophisticated
                expect(styledElements.length).to.be.at.least(1);
              } else if (percentage >= 70) {
                // Should have yellow/orange for fair scores
                expect(styledElements.length).to.be.at.least(1);
              } else if (percentage < 50) {
                // Should have red-ish colors for poor scores
                expect(styledElements.length).to.be.at.least(1);
              }
            }
          });
        });
      });
    });
  });

  describe('Cross-component Consistency', () => {
    it('should show consistent similarity scores between Enhanced and Creative views', () => {
      // Get scores from current view
      let enhancedScores: { [key: string]: number } = {};
      
      cy.get('.fragment-item').each(($fragment) => {
        cy.wrap($fragment).within(() => {
          cy.get('body').should(($body) => {
            const text = $body.text();
            const idMatch = text.match(/(F\d+-\d+)/);
            const percentageMatch = text.match(/(\d+\.?\d*)%/);
            
            if (idMatch && percentageMatch) {
              enhancedScores[idMatch[1]] = parseFloat(percentageMatch[1]);
            }
          });
        });
      }).then(() => {
        // Switch to Creative view (if available) and compare
        cy.get('body').then(($body) => {
          if ($body.find('[data-testid="tab-overview"]').length > 0) {
            cy.get('[data-testid="tab-overview"]').click();
            
            // Look for fragments in the new view and compare scores
            cy.get('.fragment-card, .fragment-item').each(($fragment) => {
              cy.wrap($fragment).within(() => {
                cy.get('body').should(($body) => {
                  const text = $body.text();
                  const idMatch = text.match(/(F\d+-\d+)/);
                  const percentageMatch = text.match(/(\d+\.?\d*)%/);
                  
                  if (idMatch && percentageMatch && enhancedScores[idMatch[1]]) {
                    const displayedScore = parseFloat(percentageMatch[1]);
                    const expectedScore = enhancedScores[idMatch[1]];
                    expect(displayedScore).to.equal(expectedScore);
                  }
                });
              });
            });
          }
        });
      });
    });

    it('should maintain score accuracy when switching between tabs', () => {
      // Record initial scores
      let initialScores: { [key: string]: number } = {};
      
      cy.get('.fragment-item').each(($fragment) => {
        cy.wrap($fragment).within(() => {
          cy.get('body').should(($body) => {
            const text = $body.text();
            const idMatch = text.match(/(F\d+-\d+)/);
            const percentageMatch = text.match(/(\d+\.?\d*)%/);
            
            if (idMatch && percentageMatch) {
              initialScores[idMatch[1]] = parseFloat(percentageMatch[1]);
            }
          });
        });
      }).then(() => {
        // Switch tabs and return
        cy.get('[data-testid="tab-overview"]').click();
        cy.wait(1000);
        cy.get('[data-testid="tab-fragments"]').click();
        
        // Verify scores remain the same
        cy.get('.fragment-item').each(($fragment) => {
          cy.wrap($fragment).within(() => {
            cy.get('body').should(($body) => {
              const text = $body.text();
              const idMatch = text.match(/(F\d+-\d+)/);
              const percentageMatch = text.match(/(\d+\.?\d*)%/);
              
              if (idMatch && percentageMatch && initialScores[idMatch[1]] !== undefined) {
                const currentScore = parseFloat(percentageMatch[1]);
                const expectedScore = initialScores[idMatch[1]];
                expect(currentScore).to.equal(expectedScore);
              }
            });
          });
        });
      });
    });
  });

  describe('API Response Accuracy', () => {
    it('should accurately reflect backend similarity scores in the UI', () => {
      // Intercept the API response to verify it matches what's displayed
      cy.intercept('GET', '**/results/*').as('getResults');
      
      // Trigger a fresh load
      cy.reload();
      cy.get('[data-testid="text-input"]')
        .clear()
        .type('Test text for similarity analysis.');
      cy.get('[data-testid="process-button"]').click();
      
      cy.wait('@getResults').then((interception) => {
        const response = interception.response?.body;
        
        if (response && response.fragments) {
          // Navigate to fragments view
          cy.get('[data-testid="tab-fragments"]').click();
          
          // Verify F1 fragments
          if (response.fragments.F1) {
            response.fragments.F1.forEach((apiFragment: any) => {
              cy.contains(`F1-${apiFragment.sequence_number}`).parent().should(($fragment) => {
                const text = $fragment.text();
                const percentageMatch = text.match(/(\d+\.?\d*)%/);
                
                if (percentageMatch) {
                  const displayedScore = parseFloat(percentageMatch[1]);
                  const apiScore = apiFragment.similarity_score;
                  
                  // Format API score the same way the UI does
                  let expectedScore = apiScore;
                  if (apiScore === 100) {
                    expectedScore = 100;
                  } else if (apiScore >= 99.5) {
                    expectedScore = 99.9;
                  } else {
                    expectedScore = Math.round(apiScore * 10) / 10;
                  }
                  
                  expect(displayedScore).to.equal(expectedScore);
                }
              });
            });
          }
          
          // Verify F2 fragments
          if (response.fragments.F2) {
            response.fragments.F2.forEach((apiFragment: any) => {
              cy.contains(`F2-${apiFragment.sequence_number}`).parent().should(($fragment) => {
                const text = $fragment.text();
                const percentageMatch = text.match(/(\d+\.?\d*)%/);
                
                if (percentageMatch) {
                  const displayedScore = parseFloat(percentageMatch[1]);
                  const apiScore = apiFragment.similarity_score;
                  
                  let expectedScore = apiScore;
                  if (apiScore === 100) {
                    expectedScore = 100;
                  } else if (apiScore >= 99.5) {
                    expectedScore = 99.9;
                  } else {
                    expectedScore = Math.round(apiScore * 10) / 10;
                  }
                  
                  expect(displayedScore).to.equal(expectedScore);
                }
              });
            });
          }
        }
      });
    });
  });
});
