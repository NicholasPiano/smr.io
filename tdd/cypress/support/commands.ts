// Custom Cypress commands for the SMR frontend tests

/// <reference types="cypress" />

// Example custom command (uncomment if needed):
// Cypress.Commands.add('login', (email: string, password: string) => {
//   cy.session([email, password], () => {
//     cy.visit('/login');
//     cy.get('[data-testid="email"]').type(email);
//     cy.get('[data-testid="password"]').type(password);
//     cy.get('[data-testid="submit"]').click();
//     cy.url().should('not.include', '/login');
//   });
// });

declare global {
  namespace Cypress {
    interface Chainable {
      // login(email: string, password: string): Chainable<void>
    }
  }
}
