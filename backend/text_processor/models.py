"""
Models for the text processing application.

This module defines the database models for storing text submissions,
summaries, and extracted fragments with their verification status.
"""

from django.db import models
from django.utils import timezone
import uuid
import re
import difflib
from fuzzywuzzy import fuzz
from typing import Dict, Any, List, Tuple


class TextSubmission(models.Model):
    """
    Model to store original text submissions and track processing status.

    This serves as the main entity that links all processing results together.
    """

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("processing", "Processing"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for this submission",
    )
    original_text = models.TextField(
        help_text="The original text provided by the user for processing"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
        help_text="Current processing status of this submission",
    )
    error_message = models.TextField(
        blank=True, null=True, help_text="Error message if processing failed"
    )
    created_at = models.DateTimeField(
        auto_now_add=True, help_text="Timestamp when this submission was created"
    )
    updated_at = models.DateTimeField(
        auto_now=True, help_text="Timestamp when this submission was last updated"
    )
    processing_started_at = models.DateTimeField(
        blank=True, null=True, help_text="Timestamp when processing began"
    )
    processing_completed_at = models.DateTimeField(
        blank=True, null=True, help_text="Timestamp when processing completed"
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"Submission {self.id} - {self.status}"

    def start_processing(self):
        """Mark this submission as processing and record the start time."""
        self.status = "processing"
        self.processing_started_at = timezone.now()
        self.save(update_fields=["status", "processing_started_at", "updated_at"])

    def mark_completed(self):
        """Mark this submission as completed and record the completion time."""
        self.status = "completed"
        self.processing_completed_at = timezone.now()
        self.save(update_fields=["status", "processing_completed_at", "updated_at"])

    def mark_failed(self, error_message: str):
        """Mark this submission as failed with an error message."""
        self.status = "failed"
        self.error_message = error_message
        self.processing_completed_at = timezone.now()
        self.save(
            update_fields=[
                "status",
                "error_message",
                "processing_completed_at",
                "updated_at",
            ]
        )


class Summary(models.Model):
    """
    Model to store summaries generated from text processing.

    This includes both primary summaries (S1) generated directly from original text
    and secondary summaries (S2) generated from extracted fragments.
    """

    SUMMARY_TYPE_CHOICES = [
        ("S1", "Primary Summary"),
        ("S2", "Secondary Summary"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    submission = models.ForeignKey(
        TextSubmission,
        on_delete=models.CASCADE,
        related_name="summaries",
        help_text="The text submission this summary belongs to",
    )
    summary_type = models.CharField(
        max_length=2,
        choices=SUMMARY_TYPE_CHOICES,
        help_text="Type of summary: S1 (primary) or S2 (secondary)",
    )
    content = models.TextField(help_text="The generated summary content")
    created_at = models.DateTimeField(
        auto_now_add=True, help_text="Timestamp when this summary was created"
    )

    class Meta:
        ordering = ["summary_type", "created_at"]
        indexes = [
            models.Index(fields=["submission", "summary_type"]),
        ]
        # Ensure one summary per type per submission
        unique_together = ["submission", "summary_type"]

    def __str__(self):
        return f"{self.get_summary_type_display()} for {self.submission.id}"


class Fragment(models.Model):
    """
    Model to store extracted text fragments with their verification status.

    This includes both extracted fragments (F1) and justification fragments (F2).
    Each fragment tracks its position in the original text and verification status.
    """

    FRAGMENT_TYPE_CHOICES = [
        ("F1", "Extracted Fragment"),
        ("F2", "Justification Fragment"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    submission = models.ForeignKey(
        TextSubmission,
        on_delete=models.CASCADE,
        related_name="fragments",
        help_text="The text submission this fragment belongs to",
    )
    fragment_type = models.CharField(
        max_length=2,
        choices=FRAGMENT_TYPE_CHOICES,
        help_text="Type of fragment: F1 (extracted) or F2 (justification)",
    )
    content = models.TextField(
        help_text="The extracted fragment content (verbatim from original text)"
    )
    start_position = models.IntegerField(
        blank=True,
        null=True,
        help_text="Starting character position in original text (if found)",
    )
    end_position = models.IntegerField(
        blank=True,
        null=True,
        help_text="Ending character position in original text (if found)",
    )
    verified = models.BooleanField(
        default=False,
        help_text="Whether this fragment was mechanically verified in original text",
    )
    similarity_score = models.FloatField(
        default=0.0,
        help_text="Similarity score as percentage (0.0-100.0) indicating how closely this fragment matches the original text",
    )
    related_sentence = models.TextField(
        blank=True,
        null=True,
        help_text="For F2 fragments: the sentence from S1 this fragment justifies",
    )
    sequence_number = models.PositiveIntegerField(
        default=1, help_text="Order of this fragment within its type for the submission"
    )
    created_at = models.DateTimeField(
        auto_now_add=True, help_text="Timestamp when this fragment was created"
    )

    class Meta:
        ordering = ["fragment_type", "sequence_number", "created_at"]
        indexes = [
            models.Index(fields=["submission", "fragment_type"]),
            models.Index(fields=["verified"]),
        ]

    def __str__(self):
        return f"{self.get_fragment_type_display()} #{self.sequence_number} for {self.submission.id}"

    def _calculate_similarity_scores(self, original_text: str) -> Dict[str, Any]:
        """
        Calculate comprehensive similarity scores for this fragment against the original text.

        Uses multiple algorithms to find the best match and calculate similarity scores.

        Args:
            original_text: The original text to search within

        Returns:
            Dict containing best match information and similarity score
        """
        fragment_content = self.content.strip()

        # First try exact match
        start_pos = original_text.find(fragment_content)
        if start_pos != -1:
            return {
                "similarity_score": 100.0,
                "start_position": start_pos,
                "end_position": start_pos + len(fragment_content),
                "match_type": "exact",
                "verified": True,
            }

        # Try case-insensitive exact match
        start_pos_ci = original_text.lower().find(fragment_content.lower())
        if start_pos_ci != -1:
            return {
                "similarity_score": 95.0,  # Slightly lower for case differences
                "start_position": start_pos_ci,
                "end_position": start_pos_ci + len(fragment_content),
                "match_type": "case_insensitive",
                "verified": True,
            }

        # Use sliding window approach to find best partial match
        best_score = 0.0
        best_match = None
        fragment_len = len(fragment_content)

        # Define search window size (fragment length + some tolerance)
        search_window_size = min(fragment_len + 100, len(original_text))

        # Slide through the text to find best local match
        for i in range(
            0, len(original_text) - fragment_len + 1, max(1, fragment_len // 4)
        ):
            end_idx = min(i + search_window_size, len(original_text))
            text_window = original_text[i:end_idx]

            # Calculate multiple similarity metrics
            ratio_score = fuzz.ratio(fragment_content, text_window)
            partial_score = fuzz.partial_ratio(fragment_content, text_window)
            token_sort_score = fuzz.token_sort_ratio(fragment_content, text_window)
            token_set_score = fuzz.token_set_ratio(fragment_content, text_window)

            # Use weighted average with emphasis on partial ratio for fragments
            combined_score = (
                ratio_score * 0.3
                + partial_score * 0.4  # Emphasize partial matches
                + token_sort_score * 0.15
                + token_set_score * 0.15
            )

            if combined_score > best_score:
                best_score = combined_score

                # Find the best matching substring within this window
                matcher = difflib.SequenceMatcher(None, fragment_content, text_window)
                match_blocks = matcher.get_matching_blocks()

                if match_blocks:
                    # Find the longest matching block
                    longest_match = max(match_blocks, key=lambda x: x.size)
                    if longest_match.size > 0:
                        match_start = i + longest_match.b
                        match_end = match_start + longest_match.size

                        best_match = {
                            "similarity_score": combined_score,
                            "start_position": match_start,
                            "end_position": match_end,
                            "match_type": "partial",
                            "verified": combined_score
                            >= 70.0,  # Threshold for verification
                        }

        # If no good match found, try word-level matching for very poor matches
        if best_score < 50.0:
            fragment_words = set(re.findall(r"\b\w+\b", fragment_content.lower()))
            text_words = set(re.findall(r"\b\w+\b", original_text.lower()))

            if fragment_words and text_words:
                word_overlap = len(fragment_words.intersection(text_words))
                word_similarity = (word_overlap / len(fragment_words)) * 100.0

                if word_similarity > best_score:
                    best_score = word_similarity
                    best_match = {
                        "similarity_score": word_similarity,
                        "start_position": None,
                        "end_position": None,
                        "match_type": "word_overlap",
                        "verified": word_similarity >= 70.0,
                    }

        return best_match or {
            "similarity_score": 0.0,
            "start_position": None,
            "end_position": None,
            "match_type": "no_match",
            "verified": False,
        }

    def verify_against_text(self, original_text: str) -> bool:
        """
        Verify this fragment against the original text using similarity scoring.

        Updates the verification status, position, and similarity score.

        Args:
            original_text: The original text to search within

        Returns:
            bool: True if fragment was found and verified (similarity >= 70%), False otherwise
        """
        match_result = self._calculate_similarity_scores(original_text)

        # Update all fields based on similarity analysis
        self.similarity_score = match_result["similarity_score"]
        self.start_position = match_result["start_position"]
        self.end_position = match_result["end_position"]
        self.verified = match_result["verified"]

        self.save(
            update_fields=[
                "similarity_score",
                "start_position",
                "end_position",
                "verified",
            ]
        )

        return self.verified
