"""
URL configuration for the text processor API.
"""

from django.urls import path
from . import views

app_name = "text_processor"

urlpatterns = [
    # Main processing endpoints
    path("text/process/", views.process_text, name="process_text"),
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
