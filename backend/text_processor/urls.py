"""
URL configuration for the text processor API.
"""

from django.urls import path
from . import views

app_name = "text_processor"

urlpatterns = [
    # Progressive processing endpoints
    path("text/start/", views.start_processing, name="start_processing"),
    path(
        "text/<uuid:submission_id>/extract-f1/",
        views.extract_f1_fragments,
        name="extract_f1_fragments",
    ),
    path(
        "text/<uuid:submission_id>/generate-s2/",
        views.generate_s2_summary,
        name="generate_s2_summary",
    ),
    path(
        "text/<uuid:submission_id>/extract-f2/",
        views.extract_f2_fragments,
        name="extract_f2_fragments",
    ),
    path(
        "text/<uuid:submission_id>/verify/",
        views.complete_verification,
        name="complete_verification",
    ),
    # Legacy endpoints (keep for backwards compatibility)
    path(
        "text/process/", views.start_processing, name="process_text"
    ),  # Redirect to new start endpoint
    path(
        "text/status/<uuid:submission_id>/",
        views.get_processing_status,
        name="get_processing_status",
    ),
    path(
        "text/results/<uuid:submission_id>/",
        views.get_processing_results,
        name="get_processing_results",
    ),
    # Additional endpoints
    path("text/submissions/", views.list_submissions, name="list_submissions"),
    path("info/", views.api_info, name="api_info"),
]
