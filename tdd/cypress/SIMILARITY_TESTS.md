# Fragment Similarity Percentage Accuracy Tests

This directory contains comprehensive Cypress tests that verify the accuracy of fragment similarity percentage displays throughout the SMR.io application.

## Overview

The similarity tests ensure that:
- Fragment similarity percentages are calculated correctly
- UI displays match backend calculations
- Formatting is consistent and user-friendly
- Visual indicators (icons, colors, progress bars) accurately reflect scores
- Edge cases are handled gracefully
- Cross-component consistency is maintained

## Test Files

### 1. `fragment-similarity-accuracy.cy.ts`
**Primary test suite for similarity percentage display accuracy**

Tests include:
- Individual fragment similarity score validation
- Percentage format verification (0-100% range)
- Similarity icon accuracy based on score ranges
- Similarity label verification (Excellent, Good, Fair, Poor, Very Poor)
- Average similarity calculations in headers
- Visual similarity indicators (progress bars, color coding)
- Cross-component consistency between views
- API response accuracy verification

### 2. `similarity-calculation-accuracy.cy.ts`
**Focused tests for similarity calculation algorithms**

Tests include:
- `formatSimilarityScore` function accuracy with edge cases
- Average calculation accuracy with mixed scores
- Null/undefined score handling
- Boundary value testing (70%, 85%, 95%, etc.)
- Mathematical precision verification
- Icon and label accuracy for all score ranges
- Progress bar width accuracy

### 3. `similarity-utility-functions.cy.ts`
**Isolated testing of similarity utility functions**

Tests include:
- Format function edge cases (100%, 99.95%, null, undefined)
- Color scheme accuracy for score ranges
- Label generation for all ranges
- Icon selection for all ranges
- Average calculation with invalid scores
- Function integration consistency

### 4. `similarity-comprehensive-integration.cy.ts`
**End-to-end integration testing**

Tests include:
- Real-world similarity testing scenarios
- Large dataset handling
- Performance and stability under load
- Cross-component consistency
- Error handling and malformed data
- Accessibility and user experience
- Visual hierarchy and formatting

## Test Data and Fixtures

### `similarity-edge-cases.json`
Contains test data with specific similarity scores designed to test edge cases:
- Perfect scores (100.0%)
- Near-perfect scores (99.7%, 99.95%)
- Boundary scores (95%, 85%, 70%, 50%)
- Poor scores (23.4%, 0.0%)
- Various decimal precision cases

### Similarity Helper Functions (`similarity-helpers.ts`)

#### Custom Cypress Commands
- `cy.setupSimilarityTest(f1Scores, f2Scores)` - Sets up test with specific scores
- `cy.verifyFragmentSimilarity(fragmentId, expectedScore)` - Verifies individual fragment scores
- `cy.verifyAverageSimilarity(fragmentType, expectedAverage)` - Verifies average calculations
- `cy.verifySimilarityIcon(score, expectedIcon)` - Verifies icon accuracy
- `cy.verifySimilarityLabel(score, expectedLabel)` - Verifies label accuracy

#### Utility Functions
- `generateSimilarityTestData()` - Creates mock API responses
- `expectedFormattedScore()` - Calculates expected formatting
- `expectedSimilarityIcon()` - Determines expected icon
- `expectedSimilarityLabel()` - Determines expected label
- `calculateExpectedAverage()` - Calculates expected averages

#### Test Fixtures
- `SimilarityTestFixtures.perfectScores` - All 100% scores
- `SimilarityTestFixtures.mixedScores` - Varied realistic scores
- `SimilarityTestFixtures.edgeCases` - Boundary and edge cases
- `SimilarityTestFixtures.nullHandling` - Null/undefined handling
- `SimilarityTestFixtures.precisionTests` - Floating point precision
- `SimilarityTestFixtures.boundaryTests` - Exact boundary values

## Similarity Score Ranges and Expected Behavior

### Score Ranges
- **Excellent (≥95%)**: 🎯 icon, green colors, "Excellent" label
- **Good (85-94%)**: ✅ icon, light green colors, "Good" label  
- **Fair (70-84%)**: ⚠️ icon, orange/yellow colors, "Fair" label
- **Poor (50-69%)**: ❌ icon, orange/red colors, "Poor" label
- **Very Poor (<50%)**: 🚫 icon, red colors, "Very Poor" label

### Formatting Rules
- Perfect scores: `100%` (no decimal)
- Near-perfect (≥99.5%): `99.9%` (capped)
- Regular scores: `XX.X%` (one decimal place)
- Zero/null/undefined: `0.0%`

### Verification Status
- Scores ≥70%: Verified (✓)
- Scores <70%: Unverified (✕)

## Running the Tests

### Run All Similarity Tests
```bash
cd tdd
npx cypress run --spec "cypress/e2e/*similarity*.cy.ts"
```

### Run Specific Test Suites
```bash
# Main accuracy tests
npx cypress run --spec "cypress/e2e/fragment-similarity-accuracy.cy.ts"

# Calculation accuracy tests
npx cypress run --spec "cypress/e2e/similarity-calculation-accuracy.cy.ts"

# Utility function tests
npx cypress run --spec "cypress/e2e/similarity-utility-functions.cy.ts"

# Comprehensive integration tests
npx cypress run --spec "cypress/e2e/similarity-comprehensive-integration.cy.ts"
```

### Interactive Mode
```bash
npx cypress open
```

## Test Coverage

These tests verify similarity accuracy across:

### Frontend Components
- `EnhancedProgressiveProcessor` - Main fragments view
- `CreativeProgressiveProcessor` - Overview/creative view
- `FragmentItem` - Individual fragment display
- `FragmentCard` - Fragment card display

### Utility Functions
- `formatSimilarityScore()` - Score formatting
- `getSimilarityColor()` - Color scheme selection
- `getSimilarityLabel()` - Label generation
- `getSimilarityIcon()` - Icon selection
- `calculateAverageSimilarity()` - Average calculations

### Backend Integration
- API response handling
- Score calculation accuracy
- Data transformation consistency

## Expected Test Results

When all tests pass, you can be confident that:
1. All similarity percentages displayed in the UI are mathematically accurate
2. Visual indicators correctly represent the underlying data
3. Edge cases and error conditions are handled gracefully
4. The user experience is consistent across all components
5. Performance remains stable with large datasets

## Troubleshooting

### Common Issues

**Test timeouts**: Increase timeout values if backend processing is slow
```typescript
cy.get('[data-testid="tab-fragments"]', { timeout: 60000 })
```

**Element not found**: Verify test data attributes exist in components
```typescript
cy.get('[data-testid="fragment-item"]').should('exist')
```

**Score mismatch**: Check that mock data matches expected formatting rules
```typescript
const expectedScore = expectedFormattedScore(rawScore);
```

### Debugging Tips

1. Use `cy.debug()` to pause test execution
2. Add `cy.screenshot()` to capture visual state
3. Use browser dev tools to inspect element styling
4. Verify API intercepts are working with `cy.wait('@interceptAlias')`

## Contributing

When adding new similarity-related features:

1. Add corresponding tests to verify accuracy
2. Update test fixtures if new score ranges are introduced
3. Verify existing tests still pass
4. Document any new formatting or calculation rules

### Adding New Test Cases

```typescript
it('should handle new similarity feature', () => {
  const testScores = [/* your test data */];
  cy.setupSimilarityTest(testScores);
  
  // Your test assertions
  cy.verifyFragmentSimilarity('F1-1', expectedScore);
});
```
