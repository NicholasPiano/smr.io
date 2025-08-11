/**
 * Frontend End-to-End Tests
 * 
 * These tests verify the complete user experience by interacting with the actual
 * frontend UI components while connected to the live backend API.
 * 
 * Prerequisites:
 * - Backend service must be running (docker-compose up backend)
 * - Frontend service must be running (docker-compose up frontend)
 * - Valid OPENAI_API_KEY must be set in environment
 */

describe('Frontend End-to-End Tests', () => {
  const SAMPLE_TEXT = `The rapid advancement of artificial intelligence has transformed numerous industries over the past decade. From healthcare diagnostics to autonomous vehicles, AI systems are becoming increasingly sophisticated and capable. Machine learning algorithms can now process vast amounts of data to identify patterns that would be impossible for humans to detect manually. However, this technological progress also raises important questions about ethics, privacy, and the future of human employment. As we continue to develop more powerful AI systems, it becomes crucial to establish frameworks for responsible development and deployment.`;

  const SHORT_TEXT = `This is a sample text for testing the text processing system with the frontend interface.`;

  beforeEach(() => {
    // Visit the application
    cy.visit('/');
    
    // Verify the page loads correctly
    cy.contains('SMR.IO - Text Summarization & Fragment Extraction').should('be.visible');
    cy.get('[data-testid="text-input"]').should('be.visible');
    cy.get('[data-testid="submit-button"]').should('be.visible');
  });

  describe('Initial State and UI Elements', () => {
    it('should display all required UI elements on page load', () => {
      // Header elements
      cy.contains('SMR.IO - Text Summarization & Fragment Extraction').should('be.visible');
      cy.contains('Advanced text processing with AI-powered summarization').should('be.visible');
      
      // Text input area
      cy.get('[data-testid="text-input"]')
        .should('be.visible')
        .should('have.attr', 'placeholder')
        .should('not.be.empty');
      
      // Submit button
      cy.get('[data-testid="submit-button"]')
        .should('be.visible')
        .should('be.disabled'); // Should be disabled initially
      
      // Character counter (part of the input component)
      cy.contains('/10,000 characters').should('be.visible');
      
      // Use example text button
      cy.contains('Use Example Text').should('be.visible');
      
      // Process explanation
      cy.contains('What happens next:').should('be.visible');
      
      // No processing or results sections should be visible initially
      cy.get('[data-testid="processing-status-section"]').should('not.exist');
      cy.get('[data-testid="results-display-section"]').should('not.exist');
    });

    it('should enable submit button when sufficient text is entered', () => {
      // Initially disabled
      cy.get('[data-testid="submit-button"]').should('be.disabled');
      
      // Type short text - should remain disabled
      cy.get('[data-testid="text-input"]').type('Short text');
      cy.get('[data-testid="submit-button"]').should('be.disabled');
      
      // Clear and type sufficient text - should become enabled
      cy.get('[data-testid="text-input"]')
        .clear()
        .type(SHORT_TEXT);
      cy.get('[data-testid="submit-button"]').should('not.be.disabled');
    });

    it('should update character counter as user types', () => {
      const testText = 'Hello world!';
      
      cy.get('[data-testid="text-input"]').type(testText);
      cy.contains(`${testText.length}/10,000 characters`)
        .should('be.visible');
    });
  });

  describe('Complete Text Processing Workflow', () => {
    it('should process text through the complete pipeline and display results', () => {
      // Enter text
      cy.get('[data-testid="text-input"]')
        .clear()
        .type(SAMPLE_TEXT);
      
      // Verify text was entered
      cy.get('[data-testid="text-input"]').should('have.value', SAMPLE_TEXT);
      
      // Submit for processing
      cy.get('[data-testid="submit-button"]').click();
      
      // Should show processing status
      cy.get('[data-testid="processing-status-section"]', { timeout: 10000 })
        .should('be.visible');
      
      // Should show processing message
      cy.contains('Processing your text through AI analysis').should('be.visible');
      
      // Should show processing pipeline steps
      cy.contains('Processing Pipeline').should('be.visible');
      cy.contains('Generating primary summary').should('be.visible');
      cy.contains('Extracting verbatim fragments').should('be.visible');
      
      // Wait for processing to complete
      cy.get('[data-testid="results-display-section"]', { timeout: 60000 })
        .should('be.visible');
      
      // Processing status should no longer be visible
      cy.get('[data-testid="processing-status-section"]').should('not.exist');
      
      // Results header should be visible
      cy.contains('Processing Results').should('be.visible');
      
      // Overview tab should be active by default
      cy.get('[data-testid="tab-overview"]')
        .should('be.visible');
      
      // Start over button should be visible
      cy.contains('Analyze New Text')
        .should('be.visible')
        .should('not.be.disabled');
    });

    it('should display real-time processing pipeline steps', () => {
      cy.get('[data-testid="text-input"]')
        .clear()
        .type(SAMPLE_TEXT);
      
      cy.get('[data-testid="submit-button"]').click();
      
      // Should show processing status
      cy.get('[data-testid="processing-status-section"]', { timeout: 10000 })
        .should('be.visible');
      
      // Should show pipeline steps
      cy.contains('Processing Pipeline').should('be.visible');
      cy.contains('Generating primary summary').should('be.visible');
      cy.contains('Extracting verbatim fragments').should('be.visible');
      cy.contains('Creating secondary summary').should('be.visible');
      cy.contains('Finding justification fragments').should('be.visible');
      cy.contains('Verifying all fragments').should('be.visible');
      
      // Wait for completion
      cy.get('[data-testid="results-display-section"]', { timeout: 60000 })
        .should('be.visible');
    });
  });

  describe('Results Display and Tab Navigation', () => {
    beforeEach(() => {
      // Process text before each test in this section
      cy.get('[data-testid="text-input"]')
        .clear()
        .type(SAMPLE_TEXT);
      cy.get('[data-testid="submit-button"]').click();
      cy.get('[data-testid="results-display-section"]', { timeout: 60000 })
        .should('be.visible');
    });

    it('should display overview tab content correctly', () => {
      // Overview tab should be active by default
      cy.get('[data-testid="tab-overview"]').should('be.visible');
      
      // Should show completion message and text length
      cy.contains('Processing Results').should('be.visible');
      cy.contains(SAMPLE_TEXT.length.toString()).should('be.visible');
    });

    it('should allow navigation between tabs', () => {
      // Start on overview
      cy.get('[data-testid="tab-overview"]').should('be.visible');
      
      // Go to summaries
      cy.get('[data-testid="tab-summaries"]').click();
      cy.get('[data-testid="tab-summaries"]').should('be.visible');
      
      // Go to fragments
      cy.get('[data-testid="tab-fragments"]').click();
      cy.get('[data-testid="tab-fragments"]').should('be.visible');
      
      // Go to verification
      cy.get('[data-testid="tab-verification"]').click();
      cy.get('[data-testid="tab-verification"]').should('be.visible');
      
      // Go back to overview
      cy.get('[data-testid="tab-overview"]').click();
      cy.get('[data-testid="tab-overview"]').should('be.visible');
    });
  });

  describe('Start Over Functionality', () => {
    it('should reset to initial state when start over is clicked', () => {
      // Complete a processing workflow
      cy.get('[data-testid="text-input"]')
        .clear()
        .type(SAMPLE_TEXT);
      cy.get('[data-testid="submit-button"]').click();
      cy.get('[data-testid="results-display-section"]', { timeout: 60000 })
        .should('be.visible');
      
      // Click start over
      cy.contains('Analyze New Text').click();
      
      // Should return to initial state
      cy.get('[data-testid="text-input"]')
        .should('be.visible')
        .should('have.value', '');
      
      cy.get('[data-testid="submit-button"]')
        .should('be.visible')
        .should('be.disabled');
      
      // Results and processing sections should not exist
      cy.get('[data-testid="results-display-section"]').should('not.exist');
      cy.get('[data-testid="processing-status-section"]').should('not.exist');
    });
  });

  describe('Error Handling', () => {
    it('should show error when backend is unavailable', () => {
      // Enter valid text
      cy.get('[data-testid="text-input"]')
        .clear()
        .type(SHORT_TEXT);
      
      // Intercept API call and force network error
      cy.intercept('POST', '**/api/text/process/', {
        forceNetworkError: true
      }).as('networkError');
      
      cy.get('[data-testid="submit-button"]').click();
      
      cy.wait('@networkError');
      
      // Should show error display
      cy.get('[data-testid="error-display"]', { timeout: 10000 })
        .should('be.visible');
      
      // Should contain error information
      cy.get('[data-testid="error-display"]')
        .should('contain', 'Error');
    });
  });
});