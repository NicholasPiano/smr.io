"""
API views for the text processor application.

This module contains all the API endpoints for text processing functionality.
"""

import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.http import Http404

from .models import TextSubmission
from .serializers import (
    TextSubmissionCreateSerializer,
    ProcessingStatusSerializer,
    ProcessingResultsSerializer,
)
from .processors import TextProcessor

logger = logging.getLogger(__name__)


@api_view(["POST"])
@permission_classes([AllowAny])
def process_text(request):
    """
    Process text through the complete analysis pipeline.

    This endpoint accepts text input and triggers the full processing workflow:
    1. Validates input text
    2. Creates a TextSubmission record
    3. Triggers async processing (returns immediately with job ID)
    4. Returns the submission ID for status checking

    POST /api/text/process/

    Request body:
    {
        "text": "The text content to process..."
    }

    Response:
    {
        "submission_id": "uuid-string",
        "status": "pending",
        "message": "Text processing started"
    }
    """
    serializer = TextSubmissionCreateSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(
            {"error": "Invalid input", "details": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        # Create the text submission
        submission = TextSubmission.objects.create(
            original_text=serializer.validated_data["text"]
        )

        logger.info(f"Created new text submission: {submission.id}")

        # Start processing (in a real production environment, this would be async)
        # For this demo, we'll process synchronously but return the job ID immediately
        try:
            processor = TextProcessor()
            # Process the text submission
            processor.process_text_submission(str(submission.id))

            return Response(
                {
                    "submission_id": str(submission.id),
                    "status": "completed",
                    "message": "Text processing completed successfully",
                },
                status=status.HTTP_201_CREATED,
            )

        except Exception as processing_error:
            logger.error(
                f"Processing failed for submission {submission.id}: {str(processing_error)}"
            )

            # Mark submission as failed
            submission.mark_failed(str(processing_error))

            return Response(
                {
                    "submission_id": str(submission.id),
                    "status": "failed",
                    "error": str(processing_error),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    except Exception as e:
        logger.error(f"Failed to create text submission: {str(e)}")
        return Response(
            {"error": "Failed to create text submission", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([AllowAny])
def get_processing_status(request, submission_id):
    """
    Get the processing status of a text submission.

    Returns the current status and basic information about the processing job.

    GET /api/text/status/{submission_id}/

    Response:
    {
        "submission_id": "uuid-string",
        "status": "pending|processing|completed|failed",
        "created_at": "2024-01-01T12:00:00Z",
        "processing_started_at": "2024-01-01T12:00:01Z",
        "processing_completed_at": "2024-01-01T12:00:30Z",
        "error_message": null
    }
    """
    try:
        submission = get_object_or_404(TextSubmission, id=submission_id)

        serializer = ProcessingStatusSerializer(
            {
                "submission_id": submission.id,
                "status": submission.status,
                "created_at": submission.created_at,
                "processing_started_at": submission.processing_started_at,
                "processing_completed_at": submission.processing_completed_at,
                "error_message": submission.error_message,
            }
        )

        return Response(serializer.data, status=status.HTTP_200_OK)

    except Http404:
        return Response(
            {"error": f"Submission with ID {submission_id} not found"},
            status=status.HTTP_404_NOT_FOUND,
        )
    except Exception as e:
        logger.error(f"Error getting status for submission {submission_id}: {str(e)}")
        return Response(
            {"error": "Failed to get processing status", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([AllowAny])
def get_processing_results(request, submission_id):
    """
    Get the complete processing results for a text submission.

    Returns all summaries, fragments, and verification results.
    Only available for completed submissions.

    GET /api/text/results/{submission_id}/

    Response: Complete results object with all processing data
    """
    try:
        submission = get_object_or_404(TextSubmission, id=submission_id)

        if submission.status != "completed":
            return Response(
                {
                    "error": "Processing not completed",
                    "current_status": submission.status,
                    "message": "Results are only available for completed submissions",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Use the processor to compile results
        processor = TextProcessor()
        results = processor._compile_results(submission)

        serializer = ProcessingResultsSerializer(results)

        return Response(serializer.data, status=status.HTTP_200_OK)

    except Http404:
        return Response(
            {"error": f"Submission with ID {submission_id} not found"},
            status=status.HTTP_404_NOT_FOUND,
        )
    except Exception as e:
        logger.error(f"Error getting results for submission {submission_id}: {str(e)}")
        return Response(
            {"error": "Failed to get processing results", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([AllowAny])
def list_submissions(request):
    """
    List recent text submissions for debugging/monitoring.

    GET /api/text/submissions/

    Query parameters:
    - limit: Number of results to return (default: 10, max: 50)
    - status: Filter by status (pending, processing, completed, failed)

    Response: List of submission objects with basic information
    """
    try:
        # Get query parameters
        limit = min(int(request.GET.get("limit", 10)), 50)
        status_filter = request.GET.get("status", None)

        # Build query
        queryset = TextSubmission.objects.all()

        if status_filter:
            if status_filter in ["pending", "processing", "completed", "failed"]:
                queryset = queryset.filter(status=status_filter)
            else:
                return Response(
                    {"error": f"Invalid status filter: {status_filter}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        submissions = queryset.order_by("-created_at")[:limit]

        # Serialize the data
        results = []
        for submission in submissions:
            results.append(
                {
                    "submission_id": str(submission.id),
                    "status": submission.status,
                    "created_at": submission.created_at.isoformat(),
                    "processing_started_at": (
                        submission.processing_started_at.isoformat()
                        if submission.processing_started_at
                        else None
                    ),
                    "processing_completed_at": (
                        submission.processing_completed_at.isoformat()
                        if submission.processing_completed_at
                        else None
                    ),
                    "text_preview": (
                        submission.original_text[:100] + "..."
                        if len(submission.original_text) > 100
                        else submission.original_text
                    ),
                    "error_message": submission.error_message,
                }
            )

        return Response(
            {
                "submissions": results,
                "total_returned": len(results),
                "filters_applied": {"limit": limit, "status": status_filter},
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        logger.error(f"Error listing submissions: {str(e)}")
        return Response(
            {"error": "Failed to list submissions", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([AllowAny])
def api_info(request):
    """
    Get API information and available endpoints.

    GET /api/info/
    """
    return Response(
        {
            "name": "Text Processing API",
            "version": "1.0.0",
            "description": "API for text summarization and fragment extraction with verification",
            "endpoints": {
                "POST /api/text/process/": "Submit text for processing",
                "GET /api/text/status/{id}/": "Get processing status",
                "GET /api/text/results/{id}/": "Get complete results",
                "GET /api/text/submissions/": "List recent submissions",
                "GET /api/info/": "This endpoint",
            },
            "features": [
                "Primary summarization (S1)",
                "Fragment extraction (F1[])",
                "Secondary summarization (S2)",
                "Justification fragment extraction (F2[])",
                "Mechanical verification of all fragments",
            ],
        },
        status=status.HTTP_200_OK,
    )
