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
def start_processing(request):
    """
    Start text processing and generate the primary summary (S1).

    This creates a new TextSubmission and immediately generates the S1 summary.

    POST /api/text/start/

    Request body:
    {
        "text": "The text content to process..."
    }

    Response:
    {
        "submission_id": "uuid-string",
        "status": "s1_completed",
        "s1_summary": "Primary summary content...",
        "created_at": "2024-01-01T12:00:00Z"
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
        submission.start_processing()

        logger.info(f"Created new text submission: {submission.id}")

        # Generate S1 summary
        processor = TextProcessor()
        s1_summary = processor.generate_s1_summary(str(submission.id))

        return Response(
            {
                "submission_id": str(submission.id),
                "status": "s1_completed",
                "s1_summary": s1_summary.content,
                "created_at": submission.created_at.isoformat(),
            },
            status=status.HTTP_201_CREATED,
        )

    except Exception as e:
        logger.error(f"Failed to start processing: {str(e)}")
        if "submission" in locals():
            submission.mark_failed(str(e))
        return Response(
            {"error": "Failed to start processing", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def extract_f1_fragments(request, submission_id):
    """
    Extract F1 fragments from the original text.

    POST /api/text/{submission_id}/extract-f1/

    Response:
    {
        "submission_id": "uuid-string",
        "status": "f1_completed",
        "f1_fragments": [
            {
                "id": "uuid",
                "sequence_number": 1,
                "content": "Fragment content...",
                "verified": true,
                "start_position": 10,
                "end_position": 50
            }
        ]
    }
    """
    try:
        submission = get_object_or_404(TextSubmission, id=submission_id)

        if submission.status == "failed":
            return Response(
                {"error": "Cannot process failed submission"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        processor = TextProcessor()
        f1_fragments = processor.extract_f1_fragments(str(submission.id))

        # Serialize fragments
        fragments_data = []
        for fragment in f1_fragments:
            fragments_data.append(
                {
                    "id": str(fragment.id),
                    "sequence_number": fragment.sequence_number,
                    "content": fragment.content,
                    "verified": fragment.verified,
                    "similarity_score": fragment.similarity_score,
                    "start_position": fragment.start_position,
                    "end_position": fragment.end_position,
                    "created_at": fragment.created_at.isoformat(),
                }
            )

        return Response(
            {
                "submission_id": str(submission.id),
                "status": "f1_completed",
                "f1_fragments": fragments_data,
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        logger.error(f"Failed to extract F1 fragments for {submission_id}: {str(e)}")
        return Response(
            {"error": "Failed to extract F1 fragments", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def generate_s2_summary(request, submission_id):
    """
    Generate S2 summary based on F1 fragments.

    POST /api/text/{submission_id}/generate-s2/

    Response:
    {
        "submission_id": "uuid-string",
        "status": "s2_completed",
        "s2_summary": "Secondary summary content..."
    }
    """
    try:
        submission = get_object_or_404(TextSubmission, id=submission_id)

        if submission.status == "failed":
            return Response(
                {"error": "Cannot process failed submission"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        processor = TextProcessor()
        s2_summary = processor.generate_s2_summary(str(submission.id))

        return Response(
            {
                "submission_id": str(submission.id),
                "status": "s2_completed",
                "s2_summary": s2_summary.content,
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        logger.error(f"Failed to generate S2 summary for {submission_id}: {str(e)}")
        return Response(
            {"error": "Failed to generate S2 summary", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def extract_f2_fragments(request, submission_id):
    """
    Extract F2 justification fragments.

    POST /api/text/{submission_id}/extract-f2/

    Response:
    {
        "submission_id": "uuid-string",
        "status": "f2_completed",
        "f2_fragments": [
            {
                "id": "uuid",
                "sequence_number": 1,
                "content": "Fragment content...",
                "verified": true,
                "related_sentence": "S1 sentence this justifies...",
                "start_position": 10,
                "end_position": 50
            }
        ]
    }
    """
    try:
        submission = get_object_or_404(TextSubmission, id=submission_id)

        if submission.status == "failed":
            return Response(
                {"error": "Cannot process failed submission"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        processor = TextProcessor()
        f2_fragments = processor.extract_f2_fragments(str(submission.id))

        # Serialize fragments
        fragments_data = []
        for fragment in f2_fragments:
            fragments_data.append(
                {
                    "id": str(fragment.id),
                    "sequence_number": fragment.sequence_number,
                    "content": fragment.content,
                    "verified": fragment.verified,
                    "similarity_score": fragment.similarity_score,
                    "related_sentence": fragment.related_sentence,
                    "start_position": fragment.start_position,
                    "end_position": fragment.end_position,
                    "created_at": fragment.created_at.isoformat(),
                }
            )

        return Response(
            {
                "submission_id": str(submission.id),
                "status": "f2_completed",
                "f2_fragments": fragments_data,
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        logger.error(f"Failed to extract F2 fragments for {submission_id}: {str(e)}")
        return Response(
            {"error": "Failed to extract F2 fragments", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def complete_verification(request, submission_id):
    """
    Complete verification of all fragments and finalize processing.

    POST /api/text/{submission_id}/verify/

    Response:
    {
        "submission_id": "uuid-string",
        "status": "completed",
        "verification_summary": {
            "F1_total": 5,
            "F1_verified": 4,
            "F1_verification_rate": 0.8,
            "F2_total": 3,
            "F2_verified": 3,
            "F2_verification_rate": 1.0,
            "overall_verification_rate": 0.875
        },
        "processing_completed_at": "2024-01-01T12:00:30Z"
    }
    """
    try:
        submission = get_object_or_404(TextSubmission, id=submission_id)

        if submission.status == "failed":
            return Response(
                {"error": "Cannot process failed submission"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        processor = TextProcessor()
        verification_summary = processor.complete_verification(str(submission.id))

        # Refresh submission from database to get updated processing_completed_at
        submission.refresh_from_db()

        return Response(
            {
                "submission_id": str(submission.id),
                "status": "completed",
                "verification_summary": verification_summary,
                "processing_completed_at": (
                    submission.processing_completed_at.isoformat()
                    if submission.processing_completed_at
                    else None
                ),
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        logger.error(f"Failed to complete verification for {submission_id}: {str(e)}")
        return Response(
            {"error": "Failed to complete verification", "details": str(e)},
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
