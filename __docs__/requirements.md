# Text Summarization and Fragment Extraction System

## Project Overview

This system processes user-provided text through multiple stages of summarization and fragment extraction using LLM calls, with mechanical verification of extracted fragments.

## System Requirements

### Core Functionality

1. **Text Input Processing**
   - Accept user text input through API endpoint
   - Store original text for reference and verification

2. **Primary Summarization (S1)**
   - Use LLM to generate initial summary of input text
   - Store summary with reference to original text

3. **Fragment Extraction (F1[])**
   - Call LLM to extract 10 verbatim fragments from original text
   - Fragments must be mechanically verifiable against source
   - Store fragments with position/context information

4. **Secondary Summarization (S2)**
   - Generate new summary using the extracted fragments (F1[])
   - Compare with primary summary for consistency

5. **Justification Fragment Extraction (F2[])**
   - For each sentence in S1, extract verbatim justification fragments
   - Fragments must be directly traceable to original text
   - Store with sentence-to-fragment mapping

6. **Mechanical Verification**
   - Verify F1[] fragments exist verbatim in original text
   - Verify F2[] fragments exist verbatim in original text
   - Report verification status for each fragment

7. **Results Display**
   - Present all information in structured format:
     - Original text
     - Primary summary (S1)
     - Secondary summary (S2)
     - Fragment collections (F1[], F2[])
     - Verification results for all fragments

## Technical Architecture

### Backend Stack
- **Framework**: Django with Django REST Framework (DRF)
- **Database**: SQLite3
- **Container**: Docker with docker-compose
- **LLM Integration**: OpenAI API
- **Environment**: Environment variables for API keys

### API Endpoints
```
POST /api/text/process/
- Accept text input
- Trigger full processing pipeline
- Return processing job ID

GET /api/text/results/{job_id}/
- Return complete results for processed text
- Include all summaries, fragments, and verification status

GET /api/text/status/{job_id}/
- Return processing status (pending, processing, completed, failed)
```

### Data Models

#### TextSubmission
- id (Primary Key)
- original_text (TextField)
- created_at (DateTimeField)
- status (CharField: pending, processing, completed, failed)

#### Summary
- id (Primary Key)
- submission (ForeignKey to TextSubmission)
- summary_type (CharField: S1, S2)
- content (TextField)
- created_at (DateTimeField)

#### Fragment
- id (Primary Key)
- submission (ForeignKey to TextSubmission)
- fragment_type (CharField: F1, F2)
- content (TextField)
- start_position (IntegerField)
- end_position (IntegerField)
- verified (BooleanField)
- related_sentence (TextField, nullable for F1 type)
- created_at (DateTimeField)

### Processing Pipeline

1. **Text Ingestion**
   - Validate and store input text
   - Create TextSubmission record
   - Return job ID to client

2. **Stage 1: Primary Summary**
   - Call OpenAI API for text summarization
   - Store result as Summary (type: S1)

3. **Stage 2: Fragment Extraction**
   - Call OpenAI API to extract 10 verbatim fragments
   - Parse and store as Fragment records (type: F1)
   - Run mechanical verification against original text

4. **Stage 3: Secondary Summary**
   - Use F1[] fragments to generate new summary
   - Store result as Summary (type: S2)

5. **Stage 4: Justification Extraction**
   - For each sentence in S1, extract justification fragments
   - Store as Fragment records (type: F2)
   - Run mechanical verification

6. **Stage 5: Final Processing**
   - Update submission status to completed
   - Prepare final results for API response

### Frontend Integration

- React frontend will call backend API
- Display processing status and results
- Show verification status for all fragments
- Highlight verified vs unverified fragments

### Testing Strategy

#### Cypress E2E Tests
- Test complete user workflow from text input to results display
- Verify API integration and response handling
- Test fragment verification display
- Test error handling for failed processing

#### Backend Unit Tests
- Test each LLM integration function
- Test fragment verification algorithms
- Test API endpoint responses
- Test database model relationships

## Implementation Plan

### Phase 1: Backend Foundation
1. Set up Django project with DRF
2. Configure Docker and docker-compose
3. Create database models
4. Implement basic API endpoints

### Phase 2: LLM Integration
1. Set up OpenAI API client
2. Implement summarization functions
3. Implement fragment extraction functions
4. Add error handling and retries

### Phase 3: Verification System
1. Implement mechanical fragment verification
2. Add position tracking for fragments
3. Test verification accuracy

### Phase 4: API Completion
1. Complete processing pipeline
2. Add status tracking
3. Implement result retrieval

### Phase 5: Frontend Integration
1. Update React frontend to call backend API
2. Create result display components
3. Add loading states and error handling

### Phase 6: Testing
1. Write Cypress tests for complete workflows
2. Add backend unit tests
3. Integration testing
4. Performance testing with various text sizes

## Environment Configuration

Required environment variables:
- `OPENAI_API_KEY`: Valid OpenAI API key for LLM calls
- `DEBUG`: Django debug mode setting
- `SECRET_KEY`: Django secret key
- `DATABASE_URL`: SQLite database path (optional, defaults to local file)

## Success Criteria

- System processes text through all 6 stages successfully
- All fragments are mechanically verified with high accuracy
- API responses include complete verification status
- Frontend displays all results clearly
- Cypress tests cover full user workflows
- System handles errors gracefully
- Processing completes within reasonable time limits
