"""
Models for the text processing application.

This module defines the database models for storing text submissions,
summaries, and extracted fragments with their verification status.
"""

from django.db import models
from django.utils import timezone
import uuid


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

    def verify_against_text(self, original_text: str) -> bool:
        """
        Verify that this fragment exists verbatim in the original text.

        Updates the verification status and position if found.

        Args:
            original_text: The original text to search within

        Returns:
            bool: True if fragment was found and verified, False otherwise
        """
        # Look for exact match of the fragment content
        start_pos = original_text.find(self.content)

        if start_pos != -1:
            # Fragment found - update position and verification status
            self.start_position = start_pos
            self.end_position = start_pos + len(self.content)
            self.verified = True
            self.save(update_fields=["start_position", "end_position", "verified"])
            return True
        else:
            # Fragment not found - mark as unverified
            self.verified = False
            self.start_position = None
            self.end_position = None
            self.save(update_fields=["start_position", "end_position", "verified"])
            return False
