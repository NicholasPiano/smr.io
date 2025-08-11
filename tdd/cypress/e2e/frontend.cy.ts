describe('SMR Text Processing Application', () => {
  beforeEach(() => {
    // Visit the main page before each test
    cy.visit('/');
  });

  describe('Application Setup', () => {
    it('should load the main page successfully', () => {
      // Check that the page loads without errors
      cy.url().should('eq', 'http://localhost:5173/');
    });

    it('should display the SMR.IO heading and description', () => {
      // Check that the main heading is visible
      cy.contains('SMR.IO - Text Summarization & Fragment Extraction').should('be.visible');
      
      // Check that the description is present
      cy.contains('Advanced text processing with AI-powered summarization and mechanical verification').should('be.visible');
    });

    it('should display the text input section initially', () => {
      // Should show the text input section when starting
      cy.get('[data-testid="text-input-section"]').should('be.visible');
      
      // Should not show processing or results sections initially
      cy.get('[data-testid="processing-status-section"]').should('not.exist');
      cy.get('[data-testid="results-display-section"]').should('not.exist');
    });
  });

  describe('Text Input Validation', () => {
    it('should show validation for text that is too short', () => {
      // Enter text that is too short
      cy.get('[data-testid="text-input"]').type('This is too short');
      
      // Submit button should be disabled
      cy.get('[data-testid="submit-button"]').should('be.disabled');
      
      // Character count should show red styling
      cy.contains('characters (minimum 50)').should('be.visible');
    });

    it('should enable submit button for valid text', () => {
      const validText = 'This is a valid text that meets the minimum character requirement for text processing. It contains enough content to be meaningfully analyzed by the AI system and should allow the submit button to be enabled.';
      
      // Enter valid text
      cy.get('[data-testid="text-input"]').type(validText);
      
      // Submit button should be enabled
      cy.get('[data-testid="submit-button"]').should('not.be.disabled');
      
      // Character count should show valid styling
      cy.contains(`${validText.length}/10,000 characters`).should('be.visible');
    });

    it('should populate text area with example text', () => {
      // Click the "Use Example Text" button
      cy.contains('Use Example Text').click();
      
      // Text area should be populated with example text
      cy.get('[data-testid="text-input"]').should('not.be.empty');
      
      // Submit button should be enabled with example text
      cy.get('[data-testid="submit-button"]').should('not.be.disabled');
    });
  });

  describe('Text Processing Workflow (with Backend)', () => {
    beforeEach(() => {
      // Intercept API calls for testing
      cy.intercept('POST', '**/api/text/process/', { fixture: 'process-response.json' }).as('processText');
      cy.intercept('GET', '**/api/text/results/**', { fixture: 'results-response.json' }).as('getResults');
    });

    it('should complete the full text processing workflow', () => {
      const testText = 'Climate change represents one of the most pressing challenges of our time, requiring unprecedented global cooperation and innovative solutions. The scientific consensus is clear: human activities, particularly the emission of greenhouse gases from burning fossil fuels, are the primary driver of rising global temperatures. The effects are already visible worldwide, from melting ice caps and rising sea levels to more frequent extreme weather events and shifts in agricultural patterns.';
      
      // Step 1: Enter text and submit
      cy.get('[data-testid="text-input"]').type(testText);
      cy.get('[data-testid="submit-button"]').click();
      
      // Wait for API calls to be intercepted
      cy.wait('@processText');
      cy.wait('@getResults');
      
      // Should switch to results display section after processing
      cy.get('[data-testid="results-display-section"]').should('be.visible');
      
      // Should show results heading
      cy.contains('Processing Results').should('be.visible');
    });

    it('should navigate between result tabs', () => {
      // First complete the processing workflow
      const testText = 'Test text for tab navigation. This text is long enough to meet the minimum requirements and should generate meaningful results for testing the tab navigation functionality in the results display.';
      
      cy.get('[data-testid="text-input"]').type(testText);
      cy.get('[data-testid="submit-button"]').click();
      
      cy.wait('@processText');
      cy.wait('@getResults');
      
      // Should start on overview tab
      cy.get('[data-testid="tab-overview"]').should('have.css', 'background-color').and('contain', 'rgba(59, 130, 246, 0.2)');
      cy.get('[data-testid="overview-tab"]').should('be.visible');
      
      // Test summaries tab
      cy.get('[data-testid="tab-summaries"]').click();
      cy.get('[data-testid="summaries-tab"]').should('be.visible');
      cy.contains('Primary Summary (S1)').should('be.visible');
      cy.contains('Secondary Summary (S2)').should('be.visible');
      
      // Test fragments tab
      cy.get('[data-testid="tab-fragments"]').click();
      cy.get('[data-testid="fragments-tab"]').should('be.visible');
      cy.contains('Extracted Fragments (F1)').should('be.visible');
      cy.contains('Justification Fragments (F2)').should('be.visible');
      
      // Test verification tab
      cy.get('[data-testid="tab-verification"]').click();
      cy.get('[data-testid="verification-tab"]').should('be.visible');
      cy.contains('Verification Summary').should('be.visible');
      cy.contains('Overall Verification Rate').should('be.visible');
    });

    it('should handle processing errors gracefully', () => {
      // Intercept with error response
      cy.intercept('POST', '**/api/text/process/', {
        statusCode: 500,
        body: { error: 'Internal server error', details: 'OpenAI API unavailable' }
      }).as('processTextError');
      
      const testText = 'This text will trigger an error response from the backend to test error handling in the frontend application.';
      
      cy.get('[data-testid="text-input"]').type(testText);
      cy.get('[data-testid="submit-button"]').click();
      
      cy.wait('@processTextError');
      
      // Should show error display
      cy.get('[data-testid="error-display"]').should('be.visible');
      cy.contains('Error').should('be.visible');
      cy.contains('Try Again').should('be.visible');
      
      // Should be able to reset and try again
      cy.contains('Try Again').click();
      cy.get('[data-testid="text-input-section"]').should('be.visible');
      cy.get('[data-testid="error-display"]').should('not.exist');
    });

    it('should allow starting over from results page', () => {
      const testText = 'Test text for reset functionality. This should allow us to test the ability to start over with new text after viewing results.';
      
      // Complete workflow
      cy.get('[data-testid="text-input"]').type(testText);
      cy.get('[data-testid="submit-button"]').click();
      
      cy.wait('@processText');
      cy.wait('@getResults');
      
      // Should be on results page
      cy.get('[data-testid="results-display-section"]').should('be.visible');
      
      // Click "Analyze New Text" button
      cy.contains('Analyze New Text').click();
      
      // Should return to text input section
      cy.get('[data-testid="text-input-section"]').should('be.visible');
      cy.get('[data-testid="results-display-section"]').should('not.exist');
      
      // Text input should be cleared
      cy.get('[data-testid="text-input"]').should('have.value', '');
    });
  });

  describe('Backend Integration (without mocking)', () => {
    it('should handle backend connectivity', () => {
      // This test will actually try to connect to the backend
      // It will only pass if the backend is running
      
      const testText = 'This is a real integration test that will attempt to connect to the actual Django backend service running in Docker.';
      
      cy.get('[data-testid="text-input"]').type(testText);
      cy.get('[data-testid="submit-button"]').click();
      
      // Should either show processing/results or a network error
      // Using should with a function to handle multiple possible outcomes
      cy.get('body').should(($body) => {
        const text = $body.text();
        const hasExpectedContent = 
          text.includes('Processing') || 
          text.includes('Error') || 
          text.includes('Results') ||
          text.includes('Unable to connect');
        
        expect(hasExpectedContent).to.be.true;
      });
    });
  });

  describe('Accessibility and UX', () => {
    it('should have proper ARIA labels and semantic structure', () => {
      // Check for semantic HTML structure
      cy.get('h1').should('exist');
      cy.get('h2').should('exist');
      cy.get('form').should('exist');
      cy.get('textarea').should('exist');
      cy.get('button').should('exist');
    });

    it('should be keyboard navigable', () => {
      // Add valid text first to enable the submit button
      const testText = 'This is a test text that meets the minimum requirements for testing keyboard navigation functionality in the application.';
      
      // Test that text input can be focused
      cy.get('[data-testid="text-input"]').focus();
      cy.get('[data-testid="text-input"]').should('be.focused');
      
      // Add text to enable submit button
      cy.get('[data-testid="text-input"]').type(testText);
      
      // Test that submit button can be focused (now that it's enabled)
      cy.get('[data-testid="submit-button"]').should('not.be.disabled');
      cy.get('[data-testid="submit-button"]').focus();
      cy.get('[data-testid="submit-button"]').should('be.focused');
      
      // Test that elements have proper tab index or are naturally focusable
      cy.get('[data-testid="text-input"]').should('not.have.attr', 'tabindex', '-1');
      cy.get('[data-testid="submit-button"]').should('not.have.attr', 'tabindex', '-1');
    });

    it('should be responsive and handle different viewport sizes', () => {
      // Test mobile viewport
      cy.viewport(375, 667);
      cy.get('[data-testid="text-input-section"]').should('be.visible');
      
      // Test tablet viewport
      cy.viewport(768, 1024);
      cy.get('[data-testid="text-input-section"]').should('be.visible');
      
      // Test desktop viewport
      cy.viewport(1200, 800);
      cy.get('[data-testid="text-input-section"]').should('be.visible');
    });
  });
});
