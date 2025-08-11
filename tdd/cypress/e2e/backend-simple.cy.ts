/**
 * Simple Backend Integration Tests
 * 
 * These tests verify basic backend functionality without requiring LLM processing.
 * They test API connectivity, database operations, and basic request/response handling.
 */

describe('Simple Backend Integration Tests', () => {
  const API_BASE_URL = Cypress.env('API_BASE_URL') || 'http://localhost:8001/api';
  const BACKEND_URL = Cypress.env('BACKEND_URL') || 'http://localhost:8001';
  
  beforeEach(() => {
    // Check that backend is accessible before running tests
    cy.checkBackendHealth();
  });

  describe('Basic Connectivity', () => {
    it('should verify backend health endpoint', () => {
      cy.request('GET', `${BACKEND_URL}/health/`).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.deep.equal({
          status: 'healthy'
        });
      });
    });

    it('should return API information', () => {
      cy.request('GET', `${API_BASE_URL}/info/`).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('name', 'Text Processing API');
        expect(response.body).to.have.property('version', '1.0.0');
        expect(response.body).to.have.property('description');
        expect(response.body).to.have.property('endpoints');
        expect(response.body).to.have.property('features');
      });
    });

    it('should handle CORS correctly', () => {
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

  describe('Input Validation', () => {
    it('should reject empty text', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/text/process/`,
        body: { text: '' },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body).to.have.property('error', 'Invalid input');
        expect(response.body).to.have.property('details');
      });
    });

    it('should reject text that is too short', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/text/process/`,
        body: { text: 'Hi' },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body).to.have.property('error', 'Invalid input');
      });
    });

    it('should handle missing request body', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/text/process/`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body).to.have.property('error');
      });
    });

    it('should handle malformed JSON', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/text/process/`,
        body: '{"text": invalid json}',
        headers: {
          'Content-Type': 'application/json'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.be.oneOf([400, 422]);
        expect(response.body).to.have.property('detail');
      });
    });
  });

  describe('Database Operations', () => {
    it('should create submission entry for valid text', () => {
      const testText = 'This is a comprehensive test text designed to evaluate the text processing pipeline. It contains multiple sentences with varying complexity to ensure the system can handle different types of content.';
      
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/text/process/`,
        body: { text: testText }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('submission_id');
        expect(response.body.submission_id).to.match(/^[a-f0-9-]{36}$/); // UUID format
        
        const submissionId = response.body.submission_id;
        
        // Should be able to query the status
        cy.request('GET', `${API_BASE_URL}/text/status/${submissionId}/`).then((statusResponse) => {
          expect(statusResponse.status).to.eq(200);
          expect(statusResponse.body).to.have.property('submission_id', submissionId);
          expect(statusResponse.body).to.have.property('status');
          expect(statusResponse.body.status).to.be.oneOf(['processing', 'completed', 'failed']);
        });
      });
    });

    it('should return 404 for non-existent submission status', () => {
      const invalidId = '00000000-0000-0000-0000-000000000000';
      
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/text/status/${invalidId}/`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(404);
        expect(response.body).to.have.property('error');
      });
    });

    it('should list submissions', () => {
      cy.request('GET', `${API_BASE_URL}/text/submissions/`).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
        
        // Each submission should have required fields
        if (response.body.length > 0) {
          const submission = response.body[0];
          expect(submission).to.have.property('id');
          expect(submission).to.have.property('status');
          expect(submission).to.have.property('created_at');
          expect(submission).to.have.property('updated_at');
          expect(submission).to.have.property('original_text');
        }
      });
    });
  });

  describe('HTTP Methods and Error Handling', () => {
    it('should handle unsupported HTTP methods', () => {
      cy.request({
        method: 'DELETE',
        url: `${API_BASE_URL}/text/process/`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(405); // Method Not Allowed
      });
    });

    it('should handle requests to non-existent endpoints', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/nonexistent/`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(404);
      });
    });
  });

  describe('Frontend Integration Points', () => {
    it('should work with frontend form submission', () => {
      // Visit the frontend
      cy.visit('/');
      
      // Fill out the form with valid text
      const testText = 'This is a comprehensive test text designed to evaluate the text processing pipeline. It contains multiple sentences with varying complexity to ensure the system can handle different types of content.';
      
      cy.get('[data-testid="text-input"]')
        .clear()
        .type(testText);
      
      // Submit the form
      cy.get('[data-testid="submit-button"]').click();
      
      // Should show processing status
      cy.get('[data-testid="processing-status-section"]', { timeout: 10000 })
        .should('be.visible');
      
      // Should show either results or an error (due to OpenAI issues)
      cy.get('body', { timeout: 30000 }).should('satisfy', ($body) => {
        return $body.find('[data-testid="results-display-section"]').length > 0 ||
               $body.find('[data-testid="error-message"]').length > 0;
      });
    });

    it('should prevent submission of short text', () => {
      cy.visit('/');
      
      // Try to submit short text
      cy.get('[data-testid="text-input"]')
        .clear()
        .type('Hi');
      
      // Submit button should be disabled
      cy.get('[data-testid="submit-button"]').should('be.disabled');
    });

    it('should show error for backend connectivity issues', () => {
      cy.visit('/');
      
      const testText = 'This is a test text for connectivity testing.';
      
      // Mock the backend to return an error
      cy.intercept('POST', `${API_BASE_URL}/text/process/`, {
        forceNetworkError: true
      }).as('networkError');
      
      cy.get('[data-testid="text-input"]')
        .clear()
        .type(testText);
      
      cy.get('[data-testid="submit-button"]').click();
      
      cy.wait('@networkError');
      
      // Should show error message
      cy.get('[data-testid="error-message"]', { timeout: 10000 })
        .should('be.visible')
        .should('contain', 'Unable to connect');
    });
  });

  describe('Performance and Load', () => {
    it('should handle rapid successive requests', () => {
      const testText = 'This is a test text for performance testing. It contains enough content to meet the minimum requirements.';
      
      // Make multiple requests quickly
      const requests = [];
      for (let i = 0; i < 3; i++) {
        requests.push(
          cy.request({
            method: 'POST',
            url: `${API_BASE_URL}/text/process/`,
            body: { text: `${testText} Request ${i + 1}.` }
          })
        );
      }
      
      // All should succeed with different submission IDs
      Promise.all(requests).then((responses) => {
        responses.forEach((response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.have.property('submission_id');
        });
        
        // Should have unique submission IDs
        const ids = responses.map(r => r.body.submission_id);
        const uniqueIds = [...new Set(ids)];
        expect(uniqueIds).to.have.length(ids.length);
      });
    });

    it('should maintain database consistency', () => {
      const testText = 'This is a test text for database consistency testing and verification.';
      
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/text/process/`,
        body: { text: testText }
      }).then((response) => {
        const submissionId = response.body.submission_id;
        
        // Check multiple times to ensure consistency
        for (let i = 0; i < 3; i++) {
          cy.request('GET', `${API_BASE_URL}/text/status/${submissionId}/`).then((statusResponse) => {
            expect(statusResponse.status).to.eq(200);
            expect(statusResponse.body.submission_id).to.eq(submissionId);
            expect(statusResponse.body.status).to.be.oneOf(['processing', 'completed', 'failed']);
          });
        }
      });
    });
  });
});
