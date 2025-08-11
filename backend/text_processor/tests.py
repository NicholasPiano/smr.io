"""
Tests for the text processor application.
"""

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from unittest.mock import patch, MagicMock

from .models import TextSubmission, Summary, Fragment
from .services import OpenAIService
from .processors import TextProcessor, VerificationService


class TextSubmissionModelTest(TestCase):
    """Test cases for the TextSubmission model."""

    def setUp(self):
        self.submission = TextSubmission.objects.create(
            original_text="This is a test text for processing."
        )

    def test_submission_creation(self):
        """Test that a text submission is created correctly."""
        self.assertEqual(self.submission.status, "pending")
        self.assertIsNotNone(self.submission.id)
        self.assertIsNotNone(self.submission.created_at)

    def test_start_processing(self):
        """Test the start_processing method."""
        self.submission.start_processing()
        self.assertEqual(self.submission.status, "processing")
        self.assertIsNotNone(self.submission.processing_started_at)

    def test_mark_completed(self):
        """Test the mark_completed method."""
        self.submission.start_processing()
        self.submission.mark_completed()
        self.assertEqual(self.submission.status, "completed")
        self.assertIsNotNone(self.submission.processing_completed_at)

    def test_mark_failed(self):
        """Test the mark_failed method."""
        error_message = "Test error"
        self.submission.mark_failed(error_message)
        self.assertEqual(self.submission.status, "failed")
        self.assertEqual(self.submission.error_message, error_message)
        self.assertIsNotNone(self.submission.processing_completed_at)


class FragmentModelTest(TestCase):
    """Test cases for the Fragment model."""

    def setUp(self):
        self.submission = TextSubmission.objects.create(
            original_text="This is a test text for processing. It contains multiple sentences."
        )
        self.fragment = Fragment.objects.create(
            submission=self.submission,
            fragment_type="F1",
            content="test text for processing",
            sequence_number=1,
        )

    def test_fragment_creation(self):
        """Test that a fragment is created correctly."""
        self.assertEqual(self.fragment.fragment_type, "F1")
        self.assertEqual(self.fragment.sequence_number, 1)
        self.assertFalse(self.fragment.verified)

    def test_verify_against_text_success(self):
        """Test successful fragment verification."""
        result = self.fragment.verify_against_text(self.submission.original_text)
        self.assertTrue(result)
        self.assertTrue(self.fragment.verified)
        self.assertIsNotNone(self.fragment.start_position)
        self.assertIsNotNone(self.fragment.end_position)

    def test_verify_against_text_failure(self):
        """Test failed fragment verification."""
        self.fragment.content = "non-existent text"
        result = self.fragment.verify_against_text(self.submission.original_text)
        self.assertFalse(result)
        self.assertFalse(self.fragment.verified)
        self.assertIsNone(self.fragment.start_position)
        self.assertIsNone(self.fragment.end_position)


class VerificationServiceTest(TestCase):
    """Test cases for the VerificationService."""

    def test_exact_match_verification(self):
        """Test exact match verification."""
        original_text = "This is a test text for processing."
        fragment_content = "test text for processing"

        result = VerificationService.verify_fragment_in_text(
            fragment_content, original_text
        )

        self.assertTrue(result["verified"])
        self.assertEqual(result["match_type"], "exact")
        self.assertIsNotNone(result["start_position"])
        self.assertIsNotNone(result["end_position"])

    def test_case_insensitive_verification(self):
        """Test case-insensitive verification."""
        original_text = "This is a test text for processing."
        fragment_content = "TEST TEXT FOR PROCESSING"

        result = VerificationService.verify_fragment_in_text(
            fragment_content, original_text
        )

        self.assertTrue(result["verified"])
        self.assertEqual(result["match_type"], "case_insensitive")

    def test_no_match_verification(self):
        """Test verification when no match is found."""
        original_text = "This is a test text for processing."
        fragment_content = "completely different text"

        result = VerificationService.verify_fragment_in_text(
            fragment_content, original_text
        )

        self.assertFalse(result["verified"])
        self.assertEqual(result["match_type"], "no_match")
        self.assertIsNone(result["start_position"])
        self.assertIsNone(result["end_position"])


class TextProcessorAPITest(APITestCase):
    """Test cases for the text processor API endpoints."""

    def test_process_text_valid_input(self):
        """Test the process_text endpoint with valid input."""
        url = reverse("text_processor:process_text")
        data = {
            "text": "This is a test text that is long enough to meet the minimum requirements for processing. It contains multiple sentences and should be processed successfully."
        }

        with patch.object(TextProcessor, "process_text_submission") as mock_process:
            mock_process.return_value = {"status": "completed"}

            response = self.client.post(url, data, format="json")

            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertIn("submission_id", response.data)
            self.assertEqual(response.data["status"], "completed")

    def test_process_text_invalid_input(self):
        """Test the process_text endpoint with invalid input."""
        url = reverse("text_processor:process_text")
        data = {"text": "Too short"}  # Below minimum length

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_get_processing_status(self):
        """Test the get_processing_status endpoint."""
        submission = TextSubmission.objects.create(
            original_text="Test text for status checking."
        )

        url = reverse(
            "text_processor:get_processing_status",
            kwargs={"submission_id": submission.id},
        )
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["submission_id"], str(submission.id))
        self.assertEqual(response.data["status"], "pending")

    def test_get_processing_status_not_found(self):
        """Test the get_processing_status endpoint with non-existent ID."""
        import uuid

        fake_id = uuid.uuid4()

        url = reverse(
            "text_processor:get_processing_status", kwargs={"submission_id": fake_id}
        )
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_processing_results_completed(self):
        """Test the get_processing_results endpoint for completed submission."""
        submission = TextSubmission.objects.create(
            original_text="Test text for results retrieval."
        )
        submission.mark_completed()

        # Create some test data
        Summary.objects.create(
            submission=submission, summary_type="S1", content="Test summary"
        )

        url = reverse(
            "text_processor:get_processing_results",
            kwargs={"submission_id": submission.id},
        )

        with patch.object(TextProcessor, "_compile_results") as mock_compile:
            mock_compile.return_value = {
                "submission_id": str(submission.id),
                "status": "completed",
                "summaries": {"S1": {"content": "Test summary"}},
                "fragments": {"F1": [], "F2": []},
                "verification_summary": {},
            }

            response = self.client.get(url)

            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data["submission_id"], str(submission.id))

    def test_get_processing_results_not_completed(self):
        """Test the get_processing_results endpoint for non-completed submission."""
        submission = TextSubmission.objects.create(
            original_text="Test text for results retrieval."
        )
        # Don't mark as completed

        url = reverse(
            "text_processor:get_processing_results",
            kwargs={"submission_id": submission.id},
        )
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_list_submissions(self):
        """Test the list_submissions endpoint."""
        # Create some test submissions
        for i in range(3):
            TextSubmission.objects.create(
                original_text=f"Test text {i} for listing submissions."
            )

        url = reverse("text_processor:list_submissions")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("submissions", response.data)
        self.assertEqual(len(response.data["submissions"]), 3)

    def test_api_info(self):
        """Test the api_info endpoint."""
        url = reverse("text_processor:api_info")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("name", response.data)
        self.assertIn("endpoints", response.data)
