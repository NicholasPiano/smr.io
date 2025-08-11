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
    }
  }
}
