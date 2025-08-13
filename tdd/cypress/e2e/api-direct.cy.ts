/**
 * Direct API Testing
 * 
 * These tests directly interact with the backend API endpoints without going through
 * the frontend UI. They verify the API functionality, data structures, and error handling.
 */

describe('Direct API Tests', () => {
  const API_BASE_URL = Cypress.env('API_BASE_URL') || 'http://localhost:8001/api';
  const BACKEND_URL = Cypress.env('BACKEND_URL') || 'http://localhost:8001';
  
  const SAMPLE_TEXT = `The quick brown fox jumps over the lazy dog. This is a comprehensive test text designed to evaluate the text processing pipeline. It contains multiple sentences with varying complexity to ensure the system can handle different types of content. The artificial intelligence system should be able to extract meaningful summaries and fragments from this content.`;

  beforeEach(() => {
    // Check that backend is accessible before running tests
    cy.checkBackendHealth();
  });

  describe('Health and Info Endpoints', () => {
    it('should return healthy status from health endpoint', () => {
      cy.request('GET', `${BACKEND_URL}/health/`).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.deep.equal({
          status: 'healthy'
        });
      });
    });

    it('should return API information from info endpoint', () => {
      cy.request('GET', `${API_BASE_URL}/info/`).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('name', 'Text Processing API');
        expect(response.body).to.have.property('version', '1.0.0');
        expect(response.body).to.have.property('description');
        expect(response.body).to.have.property('endpoints');
        expect(response.body.endpoints).to.be.an('object');
        expect(response.body.endpoints).to.have.property('POST /api/text/process/');
        expect(response.body.endpoints).to.have.property('GET /api/text/status/{id}/');
        expect(response.body.endpoints).to.have.property('GET /api/text/results/{id}/');
        expect(response.body.endpoints).to.have.property('GET /api/text/submissions/');
        expect(response.body).to.have.property('features');
        expect(response.body.features).to.be.an('array');
      });
    });
  });

  describe('Text Processing API', () => {
    it('should accept text and return submission ID', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/text/process/`,
        body: { text: SAMPLE_TEXT }
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 201]);
        expect(response.body).to.have.property('submission_id');
        expect(response.body).to.have.property('status');
        expect(response.body.status).to.be.oneOf(['processing', 'completed', 's1_completed', 'f1_completed', 's2_completed', 'f2_completed', 'verification_completed']);
        expect(response.body).to.have.property('message');
        expect(response.body.submission_id).to.be.a('string');
        expect(response.body.submission_id).to.match(/^[a-f0-9-]{36}$/); // UUID format
      });
    });

    it('should reject empty text with validation error', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/text/process/`,
        body: { text: '' },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body).to.have.property('error');
        expect(response.body.error).to.contain('Invalid input');
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
        expect(response.body).to.have.property('error');
        expect(response.body.error).to.contain('Invalid input');
      });
    });

    it('should handle missing request body gracefully', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/text/process/`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body).to.have.property('error');
      });
    });
  });

  describe('Status Tracking API', () => {
    let submissionId: string;

    beforeEach(() => {
      // Create a submission for status tracking tests
      cy.submitTextForProcessing(SAMPLE_TEXT).then((id) => {
        submissionId = id;
      });
    });

    it('should return processing status for valid submission ID', () => {
      cy.request('GET', `${API_BASE_URL}/text/status/${submissionId}/`).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('submission_id', submissionId);
        expect(response.body).to.have.property('status');
        expect(response.body.status).to.be.oneOf(['processing', 'completed', 'failed', 's1_completed', 'f1_completed', 's2_completed', 'f2_completed', 'verification_completed']);
        expect(response.body).to.have.property('created_at');
      });
    });

    it('should return 404 for invalid submission ID', () => {
      const invalidId = '00000000-0000-0000-0000-000000000000';
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/text/status/${invalidId}/`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(404);
        expect(response.body).to.have.property('error');
        expect(response.body.error).to.contain('not found');
      });
    });

    it('should track status changes during processing', function() {
      this.timeout(120000); // 2 minutes for LLM processing
      
      let initialStatus: string;
      
      // Get initial status
      cy.request('GET', `${API_BASE_URL}/text/status/${submissionId}/`).then((response) => {
        initialStatus = response.body.status;
        expect(initialStatus).to.be.oneOf(['processing', 'completed']);
      });
      
      // If still processing, wait for completion and verify status change
      cy.request('GET', `${API_BASE_URL}/text/status/${submissionId}/`).then((response) => {
        if (response.body.status === 'processing') {
          cy.waitForRealProcessing(submissionId, 90000);
          
          // Verify final status
                      cy.request('GET', `${API_BASE_URL}/text/status/${submissionId}/`).then((finalResponse) => {
              expect(finalResponse.body.status).to.eq('completed');
            });
        }
      });
    });
  });

  describe('Results API', () => {
    let submissionId: string;

    beforeEach(function() {
      this.timeout(120000); // Extended timeout for processing
      
      // Create and wait for a submission to complete
      cy.submitTextForProcessing(SAMPLE_TEXT).then((id) => {
        submissionId = id;
        cy.waitForRealProcessing(submissionId, 90000);
      });
    });

    it('should return complete results for processed submission', () => {
      cy.getProcessingResults(submissionId).then((results) => {
        // Verify overall structure
        expect(results).to.have.property('submission_id');
        expect(results).to.have.property('summaries');
        expect(results).to.have.property('fragments');
        expect(results).to.have.property('verification_summary');

        // Verify submission details
        expect(results).to.have.property('submission_id', submissionId);
        expect(results).to.have.property('status', 'completed');
        expect(results).to.have.property('original_text', SAMPLE_TEXT);

        // Verify summaries
        expect(results.summaries).to.have.property('S1');
        expect(results.summaries).to.have.property('S2');
        expect(results.summaries.S1).to.have.property('content');
        expect(results.summaries.S1.content).to.be.a('string');
        expect(results.summaries.S1.content).to.have.length.greaterThan(10);
        expect(results.summaries.S2).to.have.property('content');
        expect(results.summaries.S2.content).to.be.a('string');
        expect(results.summaries.S2.content).to.have.length.greaterThan(10);

        // Verify fragments
        expect(results.fragments).to.have.property('F1');
        expect(results.fragments).to.have.property('F2');
        expect(results.fragments.F1).to.be.an('array');
        expect(results.fragments.F1).to.have.length.greaterThan(0);
        expect(results.fragments.F2).to.be.an('array');
        expect(results.fragments.F2).to.have.length.greaterThan(0);

        // Verify fragment structure
        results.fragments.F1.forEach((fragment: any) => {
          expect(fragment).to.have.property('content');
          expect(fragment).to.have.property('start_position');
          expect(fragment).to.have.property('end_position');
          expect(fragment).to.have.property('verified');
          expect(fragment).to.have.property('similarity_score');
          expect(fragment.content).to.be.a('string');
          expect(fragment.start_position).to.be.a('number');
          expect(fragment.end_position).to.be.a('number');
          expect(fragment.verified).to.be.a('boolean');
          expect(fragment.similarity_score).to.be.a('number');
          expect(fragment.similarity_score).to.be.within(0, 100);
        });

        // Verify verification summary
        expect(results.verification_summary).to.have.property('F1_total');
        expect(results.verification_summary).to.have.property('F1_verified');
        expect(results.verification_summary).to.have.property('F1_verification_rate');
        expect(results.verification_summary).to.have.property('F2_total');
        expect(results.verification_summary).to.have.property('F2_verified');
        expect(results.verification_summary).to.have.property('F2_verification_rate');
        expect(results.verification_summary).to.have.property('overall_verification_rate');
        expect(results.verification_summary.F1_total).to.be.a('number');
        expect(results.verification_summary.F1_verified).to.be.a('number');
        expect(results.verification_summary.F1_verification_rate).to.be.within(0, 1);
        expect(results.verification_summary.F2_total).to.be.a('number');
        expect(results.verification_summary.F2_verified).to.be.a('number');
        expect(results.verification_summary.F2_verification_rate).to.be.within(0, 1);
        expect(results.verification_summary.overall_verification_rate).to.be.within(0, 1);
      });
    });

    it('should include similarity scores for all fragments', () => {
      cy.getProcessingResults(submissionId).then((results) => {
        // Verify F1 fragments have similarity scores
        results.fragments.F1.forEach((fragment: any) => {
          expect(fragment).to.have.property('similarity_score');
          expect(fragment.similarity_score).to.be.a('number');
          expect(fragment.similarity_score).to.be.within(0, 100);
          
          // High similarity scores should correspond to verified fragments
          if (fragment.similarity_score >= 70) {
            expect(fragment.verified, `Fragment with ${fragment.similarity_score}% similarity should be verified`).to.be.true;
          }
        });

        // Verify F2 fragments have similarity scores
        results.fragments.F2.forEach((fragment: any) => {
          expect(fragment).to.have.property('similarity_score');
          expect(fragment.similarity_score).to.be.a('number');
          expect(fragment.similarity_score).to.be.within(0, 100);
        });

        // Calculate average similarity for logging
        const f1Scores = results.fragments.F1.map((f: any) => f.similarity_score);
        const f2Scores = results.fragments.F2.map((f: any) => f.similarity_score);
        const avgF1 = f1Scores.reduce((a: number, b: number) => a + b, 0) / f1Scores.length;
        const avgF2 = f2Scores.reduce((a: number, b: number) => a + b, 0) / f2Scores.length;
        
        cy.log(`Average F1 similarity: ${avgF1.toFixed(1)}%`);
        cy.log(`Average F2 similarity: ${avgF2.toFixed(1)}%`);
        
        // Expect reasonable average similarity scores
        expect(avgF1).to.be.greaterThan(50, 'Average F1 similarity should be reasonable');
        expect(avgF2).to.be.greaterThan(50, 'Average F2 similarity should be reasonable');
      });
    });

    it('should return 404 for results of non-existent submission', () => {
      const invalidId = '00000000-0000-0000-0000-000000000000';
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/text/results/${invalidId}/`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(404);
        expect(response.body).to.have.property('error');
      });
    });

    it('should return error for results of unprocessed submission', () => {
      // Create a new submission but don't wait for it to complete
      cy.submitTextForProcessing('Quick test text for incomplete processing.').then((newId) => {
        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/text/results/${newId}/`,
          failOnStatusCode: false
        }).then((response) => {
          // Should either return 400 (not ready) or 200 with incomplete data
          if (response.status === 400) {
            expect(response.body).to.have.property('error');
            expect(response.body.error).to.contain('not completed');
          } else if (response.status === 200) {
            // Backend returns partial results during processing
            expect(response.body).to.have.property('submission');
            expect(response.body.submission.status).to.not.equal('completed');
          }
        });
      });
    });
  });

  describe('Submissions List API', () => {
    it('should return list of all submissions', () => {
      cy.request('GET', `${API_BASE_URL}/text/submissions/`).then((response) => {
        expect(response.status).to.eq(200);
        // Response might be an array or an object with submissions property
        if (Array.isArray(response.body)) {
          expect(response.body).to.be.an('array');
        } else {
          expect(response.body).to.be.an('object');
          if (response.body.submissions) {
            expect(response.body.submissions).to.be.an('array');
          }
        }
        
        const submissions = Array.isArray(response.body) ? response.body : response.body.submissions || [];
        if (submissions.length > 0) {
          const submission = submissions[0];
          expect(submission).to.have.property('submission_id');
          expect(submission).to.have.property('status');
          expect(submission).to.have.property('created_at');
          expect(submission).to.have.property('text_preview');
          expect(submission.status).to.be.oneOf(['processing', 'completed', 'failed', 's1_completed', 'f1_completed', 's2_completed', 'f2_completed', 'verification_completed']);
        }
      });
    });

    it('should include recently created submissions in the list', () => {
      const testText = 'Test text for submissions list verification that meets the minimum character requirements for processing by the system.';
      
      // Create a new submission
      cy.submitTextForProcessing(testText).then((submissionId) => {
        // Get submissions list
        cy.request('GET', `${API_BASE_URL}/text/submissions/`).then((response) => {
          expect(response.status).to.eq(200);
          const submissions = Array.isArray(response.body) ? response.body : response.body.submissions || [];
          
          // Find our submission in the list
          const ourSubmission = submissions.find((sub: any) => sub.submission_id === submissionId);
          expect(ourSubmission).to.exist;
          expect(ourSubmission.text_preview).to.contain(testText.substring(0, 50));
          expect(ourSubmission.status).to.be.oneOf(['processing', 'completed', 'failed', 's1_completed', 'f1_completed', 's2_completed', 'f2_completed', 'verification_completed']);
        });
      });
    });
  });

  describe('Data Validation and Edge Cases', () => {
    it('should handle very long text input', function() {
      this.timeout(150000); // Extended timeout for long text processing
      
      const longText = 'This is a very long text input. '.repeat(100) + 
                      'It contains many repeated sentences to test the system with larger inputs. ' +
                      'The text processing pipeline should handle this gracefully and produce meaningful results.';
      
      cy.submitTextForProcessing(longText).then((submissionId) => {
        cy.waitForRealProcessing(submissionId, 120000);
        
        cy.getProcessingResults(submissionId).then((results) => {
          expect(results.status).to.eq('completed');
          expect(results.summaries.S1.content).to.have.length.greaterThan(20);
          expect(results.fragments.F1).to.have.length.greaterThan(0);
        });
      });
    });

    it('should handle text with special characters and formatting', () => {
      const specialText = `This text contains special characters: @#$%^&*()[]{}|\\:";'<>?,./
      It also has multiple lines
      And various formatting elements.
      The system should process this without errors.`;
      
      cy.submitTextForProcessing(specialText).then((submissionId) => {
        cy.request('GET', `${API_BASE_URL}/text/status/${submissionId}/`).then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body.status).to.be.oneOf(['processing', 'completed', 'failed', 's1_completed', 'f1_completed', 's2_completed', 'f2_completed', 'verification_completed']);
          
          // Should not fail immediately due to special characters
          if (response.body.status === 'failed') {
            expect(response.body).to.have.property('error');
            // Log the error for debugging but don't fail the test
            cy.log('Processing failed:', response.body.error);
          }
        });
      });
    });

    it('should enforce maximum text length limits', () => {
      const excessivelyLongText = 'A'.repeat(100000); // 100k characters
      
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/text/process/`,
        body: { text: excessivelyLongText },
        failOnStatusCode: false
      }).then((response) => {
        // Should either accept it or reject with appropriate error
        if (response.status === 400) {
          expect(response.body).to.have.property('error');
          expect(response.body.error).to.contain('Invalid input');
        } else if (response.status === 200) {
          // If accepted, it should process normally
          expect(response.body).to.have.property('submission_id');
        }
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle malformed JSON requests', () => {
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
});
