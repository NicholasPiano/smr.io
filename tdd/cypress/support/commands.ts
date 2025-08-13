// Custom Cypress commands for the SMR frontend tests

/// <reference types="cypress" />

/**
 * Custom command to simulate tab key navigation
 */
Cypress.Commands.add('tab', { prevSubject: 'element' }, (subject) => {
  cy.wrap(subject).trigger('keydown', { key: 'Tab' });
  return cy.focused();
});

/**
 * Custom command to wait for text processing to complete
 */
Cypress.Commands.add('waitForProcessing', () => {
  // Wait for either results to appear or error to be shown
  cy.get('body').should('satisfy', ($body) => {
    return $body.find('[data-testid="results-display-section"]').length > 0 ||
           $body.find('[data-testid="error-display"]').length > 0;
  });
});

/**
 * Custom command to submit valid test text
 */
Cypress.Commands.add('submitTestText', (text?: string) => {
  const testText = text || 'This is a test text that meets the minimum character requirements for the text processing system. It contains sufficient content to be analyzed by the AI and should trigger the complete processing pipeline including summarization and fragment extraction.';
  
  cy.get('[data-testid="text-input"]').clear().type(testText);
  cy.get('[data-testid="submit-button"]').click();
});

/**
 * Custom command to check backend health
 */
Cypress.Commands.add('checkBackendHealth', () => {
  const backendUrl = Cypress.env('BACKEND_URL') || 'http://localhost:8001';
  
  cy.request({
    method: 'GET',
    url: `${backendUrl}/health/`,
    failOnStatusCode: false,
    timeout: 10000
  }).then((response) => {
    if (response.status !== 200) {
      throw new Error(`Backend health check failed: ${response.status} - ${response.statusText}`);
    }
    expect(response.body).to.have.property('status', 'healthy');
  });
});

/**
 * Custom command to wait for real backend processing
 */
Cypress.Commands.add('waitForRealProcessing', (submissionId: string, maxWaitTime = 60000) => {
  const apiUrl = Cypress.env('API_BASE_URL') || 'http://localhost:8001/api';
  const startTime = Date.now();
  
  function checkStatus(): void {
    if (Date.now() - startTime > maxWaitTime) {
      throw new Error(`Processing timeout after ${maxWaitTime}ms`);
    }
    
    cy.request({
      method: 'GET',
      url: `${apiUrl}/text/status/${submissionId}/`,
      timeout: 10000
    }).then((response) => {
      const status = response.body.status;
      
      if (status === 'completed' || status === 'verification_completed') {
        // Processing complete
        return;
      } else if (status === 'failed') {
        throw new Error(`Processing failed: ${response.body.error || 'Unknown error'}`);
              } else {
        // Still processing, wait and check again
        cy.wait(3000).then(() => {
          checkStatus();
        });
      }
    });
  }
  
  checkStatus();
});

/**
 * Custom command to submit text and get submission ID for tracking
 */
Cypress.Commands.add('submitTextForProcessing', (text: string) => {
  const apiUrl = Cypress.env('API_BASE_URL') || 'http://localhost:8001/api';
  
  return cy.request({
    method: 'POST',
    url: `${apiUrl}/text/process/`,
    body: { text },
    timeout: 15000
  }).then((response) => {
    expect(response.status).to.be.oneOf([200, 201]);
    expect(response.body).to.have.property('submission_id');
    return response.body.submission_id;
  });
});

/**
 * Custom command to get processing results
 */
Cypress.Commands.add('getProcessingResults', (submissionId: string) => {
  const apiUrl = Cypress.env('API_BASE_URL') || 'http://localhost:8001/api';
  
  return cy.request({
    method: 'GET',
    url: `${apiUrl}/text/results/${submissionId}/`,
    timeout: 10000
  }).then((response) => {
    expect(response.status).to.eq(200);
    return response.body;
  });
});

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Navigate to the next focusable element using Tab key
       */
      tab(): Chainable<JQuery<HTMLElement>>;
      
      /**
       * Wait for text processing to complete (either success or error)
       */
      waitForProcessing(): Chainable<void>;
      
      /**
       * Submit test text for processing
       * @param text Optional custom text to submit
       */
      submitTestText(text?: string): Chainable<void>;
      
      /**
       * Check if backend is healthy and accessible
       */
      checkBackendHealth(): Chainable<void>;
      
      /**
       * Wait for real backend processing to complete
       * @param submissionId The submission ID to track
       * @param maxWaitTime Maximum time to wait in milliseconds
       */
      waitForRealProcessing(submissionId: string, maxWaitTime?: number): Chainable<void>;
      
      /**
       * Submit text directly to backend API and return submission ID
       * @param text The text to process
       */
      submitTextForProcessing(text: string): Chainable<string>;
      
      /**
       * Get processing results from backend API
       * @param submissionId The submission ID
       */
      getProcessingResults(submissionId: string): Chainable<any>;
    }
  }
}
