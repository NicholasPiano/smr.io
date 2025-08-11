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
    // Check that backend is accessible before running tests
    cy.checkBackendHealth();
  });

  describe('Backend Connectivity', () => {
    it('should verify backend health endpoint is accessible', () => {
      cy.request({
        method: 'GET',
        url: `http://localhost:8001/health/`,

      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('status', 'healthy');
      });
    });

    it('should verify API info endpoint is accessible', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/info/`,

      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('name', 'Text Processing API');
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
      // Submit text for processing via API
      cy.submitTextForProcessing(SAMPLE_TEXT).then((submissionId) => {
        // Wait for processing to complete
        cy.waitForRealProcessing(submissionId);
        
        // Get the processing results
        cy.getProcessingResults(submissionId).then((results) => {
          // Verify the submission details
          expect(results).to.have.property('submission_id', submissionId);
          expect(results).to.have.property('status', 'completed');
          expect(results).to.have.property('original_text', SAMPLE_TEXT);
          
          // Verify processing timestamps
          expect(results).to.have.property('created_at');
          expect(results).to.have.property('processing_started_at');
          expect(results).to.have.property('processing_completed_at');
          
          // Verify summaries structure
          expect(results).to.have.property('summaries');
          expect(results.summaries).to.have.property('S1');
          expect(results.summaries).to.have.property('S2');
          expect(results.summaries.S1).to.have.property('content');
          expect(results.summaries.S1.content).to.be.a('string');
          expect(results.summaries.S1.content).to.have.length.greaterThan(10);
          expect(results.summaries.S2).to.have.property('content');
          expect(results.summaries.S2.content).to.be.a('string');
          expect(results.summaries.S2.content).to.have.length.greaterThan(10);
          
          // Verify fragments structure
          expect(results).to.have.property('fragments');
          expect(results.fragments).to.have.property('F1');
          expect(results.fragments).to.have.property('F2');
          expect(results.fragments.F1).to.be.an('array');
          expect(results.fragments.F1).to.have.length(10); // Should always be 10
          expect(results.fragments.F2).to.be.an('array');
          expect(results.fragments.F2).to.have.length.greaterThan(0);
          
          // Verify F1 fragment structure
          results.fragments.F1.forEach((fragment, index) => {
            expect(fragment).to.have.property('id');
            expect(fragment).to.have.property('sequence_number', index + 1);
            expect(fragment).to.have.property('content');
            expect(fragment).to.have.property('verified');
            expect(fragment).to.have.property('created_at');
          });
          
          // Verify F2 fragment structure
          results.fragments.F2.forEach((fragment) => {
            expect(fragment).to.have.property('id');
            expect(fragment).to.have.property('content');
            expect(fragment).to.have.property('related_sentence');
            expect(fragment).to.have.property('verified');
            expect(fragment).to.have.property('start_position');
            expect(fragment).to.have.property('end_position');
            expect(fragment).to.have.property('created_at');
          });
          
          // Verify verification summary
          expect(results).to.have.property('verification_summary');
          expect(results.verification_summary).to.have.property('F1_total', 10);
          expect(results.verification_summary).to.have.property('F1_verified');
          expect(results.verification_summary).to.have.property('F1_verification_rate');
          expect(results.verification_summary).to.have.property('F2_total');
          expect(results.verification_summary).to.have.property('F2_verified');
          expect(results.verification_summary).to.have.property('F2_verification_rate');
          expect(results.verification_summary).to.have.property('overall_verification_rate');
          
          // Verify verification rates are numbers between 0 and 1
          expect(results.verification_summary.F1_verification_rate).to.be.within(0, 1);
          expect(results.verification_summary.F2_verification_rate).to.be.within(0, 1);
          expect(results.verification_summary.overall_verification_rate).to.be.within(0, 1);
        });
      });
    });

    it('should handle text processing with minimal text input via API', function() {
      const minimalText = 'This is a longer test text that meets the minimum character requirements for testing the backend API processing capabilities.';
      
      // Submit directly to API
      cy.submitTextForProcessing(minimalText).then((submissionId) => {
        // Wait for processing to complete
        cy.waitForRealProcessing(submissionId);
        
        // Get the processing results
        cy.getProcessingResults(submissionId).then((results) => {
          // Verify basic processing completed
          expect(results).to.have.property('submission_id', submissionId);
          expect(results).to.have.property('status', 'completed');
          expect(results).to.have.property('summaries');
          expect(results.summaries).to.have.property('S1');
        });
      });
    });

    it('should handle multiple sequential API processing requests', function() {
      const testTexts = [
        'First sample text for testing sequential API processing functionality with sufficient length.',
        'Second sample text for testing sequential API processing functionality with sufficient length.'
      ];
      
      // Process first text
      cy.submitTextForProcessing(testTexts[0]).then((submissionId1) => {
        cy.waitForRealProcessing(submissionId1);
        
        // Process second text
        cy.submitTextForProcessing(testTexts[1]).then((submissionId2) => {
          cy.waitForRealProcessing(submissionId2);
          
          // Verify both completed successfully
          cy.getProcessingResults(submissionId1).then((results1) => {
            expect(results1).to.have.property('status', 'completed');
          });
          
          cy.getProcessingResults(submissionId2).then((results2) => {
            expect(results2).to.have.property('status', 'completed');
          });
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API validation errors for insufficient text', () => {
      const shortText = 'Too short';
      
      // Submit text that's too short directly to API
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/text/process/`,
        body: { text: shortText },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body).to.have.property('error');
        expect(response.body.details.text[0]).to.contain('at least 50 characters');
      });
    });

    it('should handle API errors for invalid input', () => {
      // Submit invalid data structure to API
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/text/process/`,
        body: { invalid_field: 'test' },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body).to.have.property('error');
      });
    });

    it('should handle non-existent submission ID requests', () => {
      const fakeId = 'non-existent-id-12345';
      
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/text/results/${fakeId}/`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(404);
      });
    });
  });

  describe('API Status Checking', () => {
    it('should provide real-time status updates via API', function() {
      // Submit text for processing
      cy.submitTextForProcessing(SAMPLE_TEXT).then((submissionId) => {
        // Check status multiple times to verify it updates
        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/text/status/${submissionId}/`
        }).then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.have.property('status');
          expect(['processing', 'completed']).to.include(response.body.status);
          expect(response.body).to.have.property('submission_id', submissionId);
        });
        
        // Wait for completion
        cy.waitForRealProcessing(submissionId);
        
        // Verify final status
        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/text/status/${submissionId}/`
        }).then((response) => {
          expect(response.body.status).to.eq('completed');
        });
      });
    });
  });

  describe('Data Persistence', () => {
    it('should persist processing results in backend', function() {
      const testText = 'Text to test data persistence in backend storage with sufficient length for processing.';
      
      // Submit text for processing
      cy.submitTextForProcessing(testText).then((submissionId) => {
        // Wait for processing to complete
        cy.waitForRealProcessing(submissionId);
        
        // Get results first time
        cy.getProcessingResults(submissionId).then((firstResults) => {
          const firstSummary = firstResults.summaries.S1.content;
          
          // Wait a moment and get results again
          cy.wait(1000);
          cy.getProcessingResults(submissionId).then((secondResults) => {
            // Results should be identical (persisted)
            expect(secondResults.summaries.S1.content).to.eq(firstSummary);
            expect(secondResults.submission_id).to.eq(submissionId);
            expect(secondResults.status).to.eq('completed');
          });
        });
      });
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle concurrent API processing requests', function() {
      // This test verifies the backend can handle rapid successive API requests
      const texts = [
        'First text for concurrent API testing with sufficient length for processing requirements.',
        'Second text for concurrent API testing with sufficient length for processing requirements.',
        'Third text for concurrent API testing with sufficient length for processing requirements.'
      ];
      
      // Submit all requests sequentially and collect submission IDs
      cy.submitTextForProcessing(texts[0]).then((submissionId1) => {
        cy.submitTextForProcessing(texts[1]).then((submissionId2) => {
          cy.submitTextForProcessing(texts[2]).then((submissionId3) => {
            // Wait for all to complete
            cy.waitForRealProcessing(submissionId1);
            cy.waitForRealProcessing(submissionId2);
            cy.waitForRealProcessing(submissionId3);
            
            // Verify all completed successfully
            cy.getProcessingResults(submissionId1).then((results) => {
              expect(results).to.have.property('status', 'completed');
            });
            cy.getProcessingResults(submissionId2).then((results) => {
              expect(results).to.have.property('status', 'completed');
            });
            cy.getProcessingResults(submissionId3).then((results) => {
              expect(results).to.have.property('status', 'completed');
            });
          });
        });
      });
    });

    it('should maintain API responsiveness during processing', function() {
      // Submit text for processing
      cy.submitTextForProcessing(SAMPLE_TEXT).then((submissionId) => {
        // While processing, test other API endpoints remain responsive
        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/info/`
        }).then((response) => {
          expect(response.status).to.eq(200);
        });
        
        cy.request({
          method: 'GET',
          url: 'http://localhost:8001/health/'
        }).then((response) => {
          expect(response.status).to.eq(200);
        });
        
        // Wait for original processing to complete
        cy.waitForRealProcessing(submissionId);
      });
    });
  });

  describe('API Submissions Management', () => {
    it('should list recent submissions via API', function() {
      // Submit a couple of test texts
      const testText1 = 'First test submission with sufficient length for backend processing requirements.';
      const testText2 = 'Second test submission with sufficient length for backend processing requirements.';
      
      cy.submitTextForProcessing(testText1).then((submissionId1) => {
        cy.submitTextForProcessing(testText2).then((submissionId2) => {
          // Check submissions list endpoint
          cy.request({
            method: 'GET',
            url: `${API_BASE_URL}/text/submissions/`
          }).then((response) => {
            expect(response.status).to.eq(200);
            expect(response.body).to.have.property('submissions');
            expect(response.body.submissions).to.be.an('array');
            expect(response.body).to.have.property('total_returned');
            
            // Should include our recent submissions
            const submissionIds = response.body.submissions.map(sub => sub.submission_id);
            expect(submissionIds).to.include(submissionId1);
            expect(submissionIds).to.include(submissionId2);
            
            // Each submission should have required fields
            response.body.submissions.forEach(submission => {
              expect(submission).to.have.property('submission_id');
              expect(submission).to.have.property('created_at');
              expect(submission).to.have.property('status');
              expect(submission).to.have.property('text_preview');
            });
          });
        });
      });
    });
  });
});
