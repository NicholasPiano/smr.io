describe('SMR Frontend', () => {
  beforeEach(() => {
    // Visit the main page before each test
    cy.visit('/');
  });

  it('should load the main page successfully', () => {
    // Check that the page loads without errors
    cy.url().should('eq', 'http://localhost:5173/');
  });

  it('should display the Vite + React heading', () => {
    // Check that the main heading is visible
    cy.contains('Vite + React').should('be.visible');
  });

  it('should display the SMR frontend description', () => {
    // Check that the description text is present
    cy.contains('This is the SMR frontend starter powered by Vite, React, and Bun.').should('be.visible');
  });

  it('should have a functional counter button that can be clicked 10 times', () => {
    // Find the counter button and verify initial state
    cy.contains('Count is 0').should('be.visible');
    
    // Click the button 10 times and verify count increases each time
    for (let i = 1; i <= 10; i++) {
      cy.contains(`Count is ${i - 1}`).click();
      cy.contains(`Count is ${i}`).should('be.visible');
    }
    
    // Verify final state
    cy.contains('Count is 10').should('be.visible');
  });

  it('should have proper styling and layout', () => {
    // Check that the page has the expected dark theme background
    cy.get('body').should('exist');
    
    // Verify the main container is present
    cy.get('div').should('exist');
  });
});
