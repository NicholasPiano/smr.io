"""
Serializers for the text processor API.

This module defines the serializers for converting model instances to JSON
and validating API input data.
"""

from rest_framework import serializers
from .models import TextSubmission, Summary, Fragment


class FragmentSerializer(serializers.ModelSerializer):
    """Serializer for Fragment model."""

    class Meta:
        model = Fragment
        fields = [
            "id",
            "fragment_type",
            "content",
            "start_position",
            "end_position",
            "verified",
            "similarity_score",
            "related_sentence",
            "sequence_number",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class SummarySerializer(serializers.ModelSerializer):
    """Serializer for Summary model."""

    class Meta:
        model = Summary
        fields = ["id", "summary_type", "content", "created_at"]
        read_only_fields = ["id", "created_at"]


class TextSubmissionSerializer(serializers.ModelSerializer):
    """Serializer for TextSubmission model."""

    summaries = SummarySerializer(many=True, read_only=True)
    fragments = FragmentSerializer(many=True, read_only=True)

    class Meta:
        model = TextSubmission
        fields = [
            "id",
            "original_text",
            "status",
            "error_message",
            "created_at",
            "updated_at",
            "processing_started_at",
            "processing_completed_at",
            "summaries",
            "fragments",
        ]
        read_only_fields = [
            "id",
            "status",
            "error_message",
            "created_at",
            "updated_at",
            "processing_started_at",
            "processing_completed_at",
            "summaries",
            "fragments",
        ]


class TextSubmissionCreateSerializer(serializers.Serializer):
    """Serializer for creating new text submissions."""

    text = serializers.CharField(
        min_length=50,
        max_length=10000,
        help_text="The text to process (minimum 50 characters, maximum 10,000 characters)",
    )

    def validate_text(self, value):
        """Validate the input text."""
        value = value.strip()

        if len(value) < 50:
            raise serializers.ValidationError(
                "Text must be at least 50 characters long."
            )

        if len(value) > 10000:
            raise serializers.ValidationError(
                "Text must be no more than 10,000 characters long."
            )

        # Check for reasonable content (not just repeated characters)
        unique_chars = len(set(value.lower()))
        if unique_chars < 10:
            raise serializers.ValidationError(
                "Text appears to contain insufficient variety. Please provide meaningful content."
            )

        return value


class ProcessingStatusSerializer(serializers.Serializer):
    """Serializer for processing status responses."""

    submission_id = serializers.UUIDField(read_only=True)
    status = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    processing_started_at = serializers.DateTimeField(read_only=True, allow_null=True)
    processing_completed_at = serializers.DateTimeField(read_only=True, allow_null=True)
    error_message = serializers.CharField(read_only=True, allow_null=True)


class VerificationSummarySerializer(serializers.Serializer):
    """Serializer for fragment verification summary."""

    F1_total = serializers.IntegerField(read_only=True)
    F1_verified = serializers.IntegerField(read_only=True)
    F1_verification_rate = serializers.FloatField(read_only=True)
    F2_total = serializers.IntegerField(read_only=True)
    F2_verified = serializers.IntegerField(read_only=True)
    F2_verification_rate = serializers.FloatField(read_only=True)
    overall_verification_rate = serializers.FloatField(read_only=True)


class ProcessingResultsSerializer(serializers.Serializer):
    """Serializer for complete processing results."""

    submission_id = serializers.UUIDField(read_only=True)
    status = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    processing_started_at = serializers.DateTimeField(read_only=True, allow_null=True)
    processing_completed_at = serializers.DateTimeField(read_only=True, allow_null=True)
    original_text = serializers.CharField(read_only=True)

    # Nested summaries
    summaries = serializers.DictField(read_only=True)

    # Nested fragments
    fragments = serializers.DictField(read_only=True)

    # Verification summary
    verification_summary = VerificationSummarySerializer(read_only=True)
