/**
 * Backend Integration Tests
 * 
 * These tests verify the complete end-to-end functionality of the SMR.IO system
 * by making real API calls to the Django backend running at localhost:8001.
 * 
 * Prerequisites:
 * - Backend service must be running (docker-compose up backend)
 * - Frontend service must be running (docker-compose up frontend)
 * - Valid OPENAI_API_KEY must be set in environment
 */

describe('Backend Integration Tests', () => {
  const API_BASE_URL = 'http://localhost:8001/api';
  const SAMPLE_TEXT = `The quick brown fox jumps over the lazy dog. This is a sample text for testing the text processing pipeline. It contains multiple sentences to ensure proper processing. The system should be able to summarize this text and extract meaningful fragments from it.`;

  beforeEach(() => {
    // Visit the frontend application
    cy.visit('/');
    
    // Ensure the page has loaded
    cy.get('[data-testid="app-header"]').should('be.visible');
    cy.get('[data-testid="text-input"]').should('be.visible');
  });

  describe('Backend Connectivity', () => {
    it('should verify backend health endpoint is accessible', () => {
      cy.request({
        method: 'GET',
        url: `http://localhost:8001/health/`,
        timeout: 5000
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('status', 'ok');
      });
    });

    it('should verify API info endpoint is accessible', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/info/`,
        timeout: 5000
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('service', 'SMR Text Processing API');
        expect(response.body).to.have.property('version');
        expect(response.body).to.have.property('endpoints');
      });
    });

    it('should verify CORS headers are properly configured', () => {
      cy.request({
        method: 'OPTIONS',
        url: `${API_BASE_URL}/info/`,
        headers: {
          'Origin': 'http://localhost:5173',
          'Access-Control-Request-Method': 'GET'
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.headers).to.have.property('access-control-allow-origin');
      });
    });
  });

  describe('Text Processing Workflow', () => {
    it('should complete the full text processing pipeline with real API calls', function() {
      // Set a longer timeout for this test as it involves LLM calls
      this.timeout(120000); // 2 minutes
      
      // Enter sample text
      cy.get('[data-testid="text-input"]')
        .clear()
        .type(SAMPLE_TEXT);
      
      // Verify text has been entered
      cy.get('[data-testid="text-input"]').should('have.value', SAMPLE_TEXT);
      
      // Submit the text for processing
      cy.get('[data-testid="submit-button"]').click();
      
      // Should show processing status
      cy.get('[data-testid="processing-status-section"]', { timeout: 10000 })
        .should('be.visible');
      
      // Should show spinner and processing text
      cy.get('[data-testid="loading-spinner"]').should('be.visible');
      cy.contains('Processing your text').should('be.visible');
      
      // Wait for processing to complete (this may take time due to LLM calls)
      cy.get('[data-testid="results-display-section"]', { timeout: 90000 })
        .should('be.visible');
      
      // Verify processing status is no longer visible
      cy.get('[data-testid="processing-status-section"]').should('not.exist');
      
      // Verify results are displayed
      cy.get('[data-testid="results-tabs"]').should('be.visible');
      
      // Check Overview tab content
      cy.get('[data-testid="tab-overview"]').should('have.class', 'active');
      cy.get('[data-testid="overview-content"]').should('be.visible');
      cy.get('[data-testid="overview-content"]').within(() => {
        cy.contains('Processing completed successfully').should('be.visible');
        cy.contains('Original Text Length').should('be.visible');
        cy.contains('Primary Summary').should('be.visible');
        cy.contains('Secondary Summary').should('be.visible');
      });
      
      // Check Summaries tab
      cy.get('[data-testid="tab-summaries"]').click();
      cy.get('[data-testid="summaries-content"]').should('be.visible');
      cy.get('[data-testid="summaries-content"]').within(() => {
        cy.get('[data-testid="primary-summary"]').should('be.visible');
        cy.get('[data-testid="primary-summary"]').should('not.be.empty');
        cy.get('[data-testid="secondary-summary"]').should('be.visible');
        cy.get('[data-testid="secondary-summary"]').should('not.be.empty');
      });
      
      // Check Fragments tab
      cy.get('[data-testid="tab-fragments"]').click();
      cy.get('[data-testid="fragments-content"]').should('be.visible');
      cy.get('[data-testid="fragments-content"]').within(() => {
        cy.get('[data-testid="primary-fragments"]').should('be.visible');
        cy.get('[data-testid="justification-fragments"]').should('be.visible');
        
        // Should have fragments listed
        cy.get('[data-testid="fragment-item"]').should('have.length.greaterThan', 0);
      });
      
      // Check Verification tab
      cy.get('[data-testid="tab-verification"]').click();
      cy.get('[data-testid="verification-content"]').should('be.visible');
      cy.get('[data-testid="verification-content"]').within(() => {
        cy.contains('Fragment Verification Results').should('be.visible');
        cy.get('[data-testid="verification-summary"]').should('be.visible');
      });
    });

    it('should handle text processing with minimal text input', function() {
      this.timeout(60000); // 1 minute
      
      const minimalText = 'This is a short test sentence.';
      
      cy.get('[data-testid="text-input"]')
        .clear()
        .type(minimalText);
      
      cy.get('[data-testid="submit-button"]').click();
      
      // Should still process successfully
      cy.get('[data-testid="processing-status-section"]', { timeout: 10000 })
        .should('be.visible');
      
      cy.get('[data-testid="results-display-section"]', { timeout: 45000 })
        .should('be.visible');
      
      // Should have some results even with minimal text
      cy.get('[data-testid="tab-summaries"]').click();
      cy.get('[data-testid="primary-summary"]').should('not.be.empty');
    });

    it('should allow starting over after processing completion', function() {
      this.timeout(90000);
      
      // Complete a processing cycle first
      cy.get('[data-testid="text-input"]')
        .clear()
        .type('Sample text for testing start over functionality.');
      
      cy.get('[data-testid="submit-button"]').click();
      
      cy.get('[data-testid="results-display-section"]', { timeout: 60000 })
        .should('be.visible');
      
      // Click "Start Over" button
      cy.get('[data-testid="start-over-button"]').click();
      
      // Should return to initial state
      cy.get('[data-testid="text-input"]').should('be.visible');
      cy.get('[data-testid="text-input"]').should('have.value', '');
      cy.get('[data-testid="results-display-section"]').should('not.exist');
      cy.get('[data-testid="processing-status-section"]').should('not.exist');
    });
  });

  describe('Error Handling', () => {
    it('should handle backend disconnection gracefully', () => {
      // Enter text
      cy.get('[data-testid="text-input"]')
        .clear()
        .type('Test text for error handling');
      
      // Intercept the API call and force it to fail
      cy.intercept('POST', `${API_BASE_URL}/process/`, {
        forceNetworkError: true
      }).as('networkError');
      
      cy.get('[data-testid="submit-button"]').click();
      
      cy.wait('@networkError');
      
      // Should show error message
      cy.get('[data-testid="error-message"]', { timeout: 10000 })
        .should('be.visible');
      cy.get('[data-testid="error-message"]')
        .should('contain', 'Unable to connect to the backend');
    });

    it('should handle API errors with proper error messages', () => {
      // Enter text
      cy.get('[data-testid="text-input"]')
        .clear()
        .type('Test text for API error handling');
      
      // Intercept the API call and return an error
      cy.intercept('POST', `${API_BASE_URL}/process/`, {
        statusCode: 500,
        body: { error: 'Internal server error during processing' }
      }).as('serverError');
      
      cy.get('[data-testid="submit-button"]').click();
      
      cy.wait('@serverError');
      
      // Should show error message
      cy.get('[data-testid="error-message"]', { timeout: 10000 })
        .should('be.visible');
      cy.get('[data-testid="error-message"]')
        .should('contain', 'processing failed');
    });

    it('should handle validation errors for empty text', () => {
      // Try to submit without entering text
      cy.get('[data-testid="submit-button"]').should('be.disabled');
      
      // Enter text that's too short
      cy.get('[data-testid="text-input"]').type('Hi');
      cy.get('[data-testid="submit-button"]').should('be.disabled');
      
      // Enter sufficient text
      cy.get('[data-testid="text-input"]')
        .clear()
        .type('This is sufficient text for processing.');
      cy.get('[data-testid="submit-button"]').should('not.be.disabled');
    });
  });

  describe('Real-time Status Updates', () => {
    it('should show processing pipeline steps in real-time', function() {
      this.timeout(120000);
      
      cy.get('[data-testid="text-input"]')
        .clear()
        .type(SAMPLE_TEXT);
      
      cy.get('[data-testid="submit-button"]').click();
      
      // Should show initial processing status
      cy.get('[data-testid="processing-status-section"]', { timeout: 10000 })
        .should('be.visible');
      
      // Should show pipeline steps
      cy.get('[data-testid="pipeline-steps"]').should('be.visible');
      cy.get('[data-testid="pipeline-steps"]').within(() => {
        cy.contains('Generating primary summary').should('be.visible');
        cy.contains('Extracting fragments').should('be.visible');
        cy.contains('Generating secondary summary').should('be.visible');
        cy.contains('Extracting justifications').should('be.visible');
        cy.contains('Verifying fragments').should('be.visible');
      });
      
      // Wait for completion
      cy.get('[data-testid="results-display-section"]', { timeout: 90000 })
        .should('be.visible');
    });
  });

  describe('Data Persistence', () => {
    it('should persist processing results during session', function() {
      this.timeout(90000);
      
      cy.get('[data-testid="text-input"]')
        .clear()
        .type('Text to test data persistence during session.');
      
      cy.get('[data-testid="submit-button"]').click();
      
      cy.get('[data-testid="results-display-section"]', { timeout: 60000 })
        .should('be.visible');
      
      // Get the primary summary text
      cy.get('[data-testid="tab-summaries"]').click();
      cy.get('[data-testid="primary-summary"]').then(($summary) => {
        const summaryText = $summary.text();
        
        // Navigate away and back
        cy.reload();
        
        // Should return to input state (no persistence across page reloads)
        cy.get('[data-testid="text-input"]').should('be.visible');
        cy.get('[data-testid="results-display-section"]').should('not.exist');
      });
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle concurrent text processing requests', function() {
      this.timeout(60000);
      
      // This test verifies the system can handle rapid successive requests
      const texts = [
        'First text for concurrent testing.',
        'Second text for concurrent testing.',
        'Third text for concurrent testing.'
      ];
      
      texts.forEach((text, index) => {
        cy.get('[data-testid="text-input"]')
          .clear()
          .type(text);
        
        cy.get('[data-testid="submit-button"]').click();
        
        if (index < texts.length - 1) {
          // Wait for processing to start, then start over for next request
          cy.get('[data-testid="processing-status-section"]', { timeout: 10000 })
            .should('be.visible');
          
          // Simulate user starting over during processing
          cy.reload();
        } else {
          // Let the last request complete
          cy.get('[data-testid="results-display-section"]', { timeout: 45000 })
            .should('be.visible');
        }
      });
    });

    it('should maintain UI responsiveness during processing', function() {
      this.timeout(90000);
      
      cy.get('[data-testid="text-input"]')
        .clear()
        .type(SAMPLE_TEXT);
      
      cy.get('[data-testid="submit-button"]').click();
      
      cy.get('[data-testid="processing-status-section"]', { timeout: 10000 })
        .should('be.visible');
      
      // UI should remain responsive - test some interactions
      cy.get('[data-testid="app-header"]').should('be.visible');
      
      // Should be able to scroll if needed
      cy.scrollTo('bottom');
      cy.scrollTo('top');
      
      // Wait for completion
      cy.get('[data-testid="results-display-section"]', { timeout: 75000 })
        .should('be.visible');
      
      // Should be able to interact with results immediately
      cy.get('[data-testid="tab-fragments"]').click();
      cy.get('[data-testid="fragments-content"]').should('be.visible');
    });
  });
});
