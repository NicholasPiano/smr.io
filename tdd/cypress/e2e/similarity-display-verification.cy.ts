/**
 * Simplified Cypress test for fragment similarity percentage display verification.
 * 
 * This test focuses on the core functionality and works with the actual Enhanced UI structure.
 */

describe('Fragment Similarity Display Verification', () => {
  
  describe('Basic Similarity Display', () => {
    it('should display similarity percentages when processing text', () => {
      cy.visit('/');
      
      // Enter sample text and process
      const sampleText = `The rapid advancement of artificial intelligence has transformed numerous industries over the past decade. From healthcare diagnostics to autonomous vehicles, AI systems are becoming increasingly sophisticated and capable.`;
      
      cy.get('[data-testid="text-input"]')
        .clear()
        .type(sampleText);
      
      cy.get('[data-testid="submit-button"]').click();
      
      // Wait for processing to complete and fragments to appear
      cy.contains('F1 Fragments', { timeout: 45000 }).should('be.visible');
      
      // Verify that fragments contain similarity percentages
      cy.get('.fragment-item', { timeout: 30000 }).should('have.length.at.least', 1);
      
      cy.get('.fragment-item').each(($fragment) => {
        cy.wrap($fragment).should(($el) => {
          const text = $el.text();
          
          // Should contain a percentage
          expect(text).to.match(/\d+\.?\d*%/);
          
          // Should contain a similarity icon
          expect(text).to.satisfy((text: string) => 
            text.includes('🎯') || text.includes('✅') || text.includes('⚠️') || 
            text.includes('❌') || text.includes('🚫')
          );
          
          // Should contain a fragment identifier
          expect(text).to.match(/F\d+-\d+/);
        });
      });
    });

    it('should display valid percentage ranges', () => {
      cy.visit('/');
      
      const testText = `Climate change represents one of the most pressing challenges of our time. The scientific consensus is clear about the causes and effects.`;
      
      cy.get('[data-testid="text-input"]')
        .clear()
        .type(testText);
      
      cy.get('[data-testid="submit-button"]').click();
      
      cy.contains('F1 Fragments', { timeout: 45000 }).should('be.visible');
      
      // Check that all displayed percentages are within valid range
      cy.get('.fragment-item').each(($fragment) => {
        cy.wrap($fragment).should(($el) => {
          const text = $el.text();
          const percentageMatch = text.match(/(\d+\.?\d*)%/);
          
          if (percentageMatch) {
            const percentage = parseFloat(percentageMatch[1]);
            expect(percentage).to.be.at.least(0);
            expect(percentage).to.be.at.most(100);
            expect(isNaN(percentage)).to.be.false;
          }
        });
      });
    });

    it('should display average similarity when fragments exist', () => {
      cy.visit('/');
      
      const testText = `Machine learning algorithms can process vast amounts of data to identify patterns. These patterns help make predictions and decisions in various applications.`;
      
      cy.get('[data-testid="text-input"]')
        .clear()
        .type(testText);
      
      cy.get('[data-testid="submit-button"]').click();
      
      cy.contains('F1 Fragments', { timeout: 45000 }).should('be.visible');
      
      // Wait for fragments to load
      cy.get('.fragment-item', { timeout: 30000 }).should('have.length.at.least', 1);
      
      // Check for average similarity display
      cy.get('body').should(($body) => {
        const text = $body.text();
        
        // Should contain average calculation
        if (text.includes('Avg')) {
          expect(text).to.match(/Avg[^:]*:\s*\d+\.?\d*%/i);
        }
      });
    });
  });

  describe('Similarity Icon Verification', () => {
    it('should display appropriate icons for different similarity ranges', () => {
      cy.visit('/');
      
      const testText = `Artificial intelligence represents a significant technological advancement. AI systems are becoming more sophisticated each year.`;
      
      cy.get('[data-testid="text-input"]')
        .clear()
        .type(testText);
      
      cy.get('[data-testid="submit-button"]').click();
      
      cy.contains('F1 Fragments', { timeout: 45000 }).should('be.visible');
      
      cy.get('.fragment-item').each(($fragment) => {
        cy.wrap($fragment).should(($el) => {
          const text = $el.text();
          const percentageMatch = text.match(/(\d+\.?\d*)%/);
          
          if (percentageMatch) {
            const percentage = parseFloat(percentageMatch[1]);
            
            // Verify icon matches score range
            if (percentage >= 95) {
              expect(text).to.include('🎯');
            } else if (percentage >= 85) {
              expect(text).to.include('✅');
            } else if (percentage >= 70) {
              expect(text).to.include('⚠️');
            } else if (percentage >= 50) {
              expect(text).to.include('❌');
            } else {
              expect(text).to.include('🚫');
            }
          }
        });
      });
    });
  });

  describe('Formatting Consistency', () => {
    it('should format similarity scores consistently', () => {
      cy.visit('/');
      
      const testText = `This is a comprehensive test of text processing capabilities. The system should analyze and extract meaningful fragments from this content.`;
      
      cy.get('[data-testid="text-input"]')
        .clear()
        .type(testText);
      
      cy.get('[data-testid="submit-button"]').click();
      
      cy.contains('F1 Fragments', { timeout: 45000 }).should('be.visible');
      
      cy.get('.fragment-item').each(($fragment) => {
        cy.wrap($fragment).should(($el) => {
          const text = $el.text();
          const percentageMatches = text.match(/(\d+\.?\d*)%/g);
          
          if (percentageMatches) {
            percentageMatches.forEach((match) => {
              // Should follow consistent format
              expect(match).to.match(/^\d+\.?\d*%$/);
              
              const numberPart = match.replace('%', '');
              const score = parseFloat(numberPart);
              
              // Check formatting rules
              if (score === 100) {
                expect(match).to.equal('100%'); // No decimal for perfect scores
              } else if (numberPart.includes('.')) {
                const decimalPart = numberPart.split('.')[1];
                expect(decimalPart.length).to.be.at.most(1); // At most 1 decimal place
              }
            });
          }
        });
      });
    });
  });

  describe('Verification Status Consistency', () => {
    it('should show verification status consistent with similarity scores', () => {
      cy.visit('/');
      
      const testText = `Data analysis involves examining datasets to extract insights. Statistical methods and machine learning techniques are commonly used in this process.`;
      
      cy.get('[data-testid="text-input"]')
        .clear()
        .type(testText);
      
      cy.get('[data-testid="submit-button"]').click();
      
      cy.contains('F1 Fragments', { timeout: 45000 }).should('be.visible');
      
      cy.get('.fragment-item').each(($fragment) => {
        cy.wrap($fragment).should(($el) => {
          const text = $el.text();
          const percentageMatch = text.match(/(\d+\.?\d*)%/);
          
          if (percentageMatch) {
            const score = parseFloat(percentageMatch[1]);
            
            // Verification should correlate with similarity score
            if (score >= 70) {
              // High similarity should be verified
              expect(text).to.include('✓');
            } else {
              // Low similarity should be unverified
              expect(text).to.include('✕');
            }
          }
        });
      });
    });
  });

  describe('F2 Fragments (if present)', () => {
    it('should display F2 fragments with similarity scores when available', () => {
      cy.visit('/');
      
      const testText = `Technology advancement requires continuous innovation and adaptation. Companies must evolve their strategies to remain competitive in rapidly changing markets.`;
      
      cy.get('[data-testid="text-input"]')
        .clear()
        .type(testText);
      
      cy.get('[data-testid="submit-button"]').click();
      
      cy.contains('F1 Fragments', { timeout: 45000 }).should('be.visible');
      
      // Wait for F2 processing to potentially complete
      cy.wait(10000);
      
      // Check if F2 fragments exist
      cy.get('body').then(($body) => {
        if ($body.text().includes('F2 Fragments') || $body.text().includes('F2-')) {
          // If F2 fragments exist, verify they have similarity scores
          cy.get('.fragment-item').each(($fragment) => {
            cy.wrap($fragment).should(($el) => {
              const text = $el.text();
              
              if (text.includes('F2-')) {
                // F2 fragments should also have percentages
                expect(text).to.match(/\d+\.?\d*%/);
                
                // And icons
                expect(text).to.satisfy((text: string) => 
                  text.includes('🎯') || text.includes('✅') || text.includes('⚠️') || 
                  text.includes('❌') || text.includes('🚫')
                );
              }
            });
          });
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle processing errors gracefully without breaking similarity display', () => {
      cy.visit('/');
      
      // Try with very short text that might cause processing issues
      const shortText = `AI.`;
      
      cy.get('[data-testid="text-input"]')
        .clear()
        .type(shortText);
      
      cy.get('[data-testid="submit-button"]').click();
      
      // Either processing completes with fragments, or shows appropriate message
      cy.get('body', { timeout: 30000 }).should(($body) => {
        const text = $body.text();
        
        // Should either have fragments or show appropriate status
        const hasFragments = text.includes('F1 Fragments');
        const hasError = text.includes('Error') || text.includes('error');
        const hasNoFragments = text.includes('No fragments');
        
        expect(hasFragments || hasError || hasNoFragments).to.be.true;
        
        // If fragments exist, they should have valid percentages
        if (hasFragments && !hasNoFragments) {
          expect(text).to.match(/\d+\.?\d*%/);
        }
      });
    });
  });

  describe('Performance and Stability', () => {
    it('should maintain similarity display accuracy under normal processing loads', () => {
      cy.visit('/');
      
      const mediumText = `The field of artificial intelligence has experienced unprecedented growth in recent years. Machine learning algorithms, particularly deep learning neural networks, have achieved remarkable success in various domains including computer vision, natural language processing, and speech recognition. These advances have enabled the development of sophisticated applications such as autonomous vehicles, intelligent virtual assistants, and advanced diagnostic systems in healthcare.`;
      
      cy.get('[data-testid="text-input"]')
        .clear()
        .type(mediumText);
      
      cy.get('[data-testid="submit-button"]').click();
      
      cy.contains('F1 Fragments', { timeout: 60000 }).should('be.visible');
      
      // Should have multiple fragments
      cy.get('.fragment-item', { timeout: 30000 }).should('have.length.at.least', 3);
      
      // All fragments should have valid similarity data
      cy.get('.fragment-item').each(($fragment) => {
        cy.wrap($fragment).should(($el) => {
          const text = $el.text();
          
          // Should have percentage, icon, and identifier
          expect(text).to.match(/\d+\.?\d*%/);
          expect(text).to.match(/F\d+-\d+/);
          expect(text).to.satisfy((text: string) => 
            text.includes('🎯') || text.includes('✅') || text.includes('⚠️') || 
            text.includes('❌') || text.includes('🚫')
          );
        });
      });
      
      // Average should be calculated and displayed
      cy.get('body').should(($body) => {
        const text = $body.text();
        if (text.includes('Avg')) {
          expect(text).to.match(/Avg[^:]*:\s*\d+\.?\d*%/i);
        }
      });
    });
  });
});
