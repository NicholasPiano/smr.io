"""
Django admin configuration for text processor models.
"""

from django.contrib import admin
from .models import TextSubmission, Summary, Fragment


@admin.register(TextSubmission)
class TextSubmissionAdmin(admin.ModelAdmin):
    """Admin interface for TextSubmission model."""

    list_display = [
        "id",
        "status",
        "created_at",
        "processing_started_at",
        "processing_completed_at",
        "text_preview",
    ]
    list_filter = ["status", "created_at"]
    search_fields = ["id", "original_text"]
    readonly_fields = [
        "id",
        "created_at",
        "updated_at",
        "processing_started_at",
        "processing_completed_at",
    ]

    def text_preview(self, obj):
        """Show a preview of the original text."""
        return (
            obj.original_text[:100] + "..."
            if len(obj.original_text) > 100
            else obj.original_text
        )

    text_preview.short_description = "Text Preview"


@admin.register(Summary)
class SummaryAdmin(admin.ModelAdmin):
    """Admin interface for Summary model."""

    list_display = ["id", "submission", "summary_type", "created_at", "content_preview"]
    list_filter = ["summary_type", "created_at"]
    search_fields = ["submission__id", "content"]
    readonly_fields = ["id", "created_at"]

    def content_preview(self, obj):
        """Show a preview of the summary content."""
        return obj.content[:100] + "..." if len(obj.content) > 100 else obj.content

    content_preview.short_description = "Content Preview"


@admin.register(Fragment)
class FragmentAdmin(admin.ModelAdmin):
    """Admin interface for Fragment model."""

    list_display = [
        "id",
        "submission",
        "fragment_type",
        "sequence_number",
        "verified",
        "created_at",
        "content_preview",
    ]
    list_filter = ["fragment_type", "verified", "created_at"]
    search_fields = ["submission__id", "content", "related_sentence"]
    readonly_fields = ["id", "created_at"]

    def content_preview(self, obj):
        """Show a preview of the fragment content."""
        return obj.content[:80] + "..." if len(obj.content) > 80 else obj.content

    content_preview.short_description = "Content Preview"
