"""
Text processing pipeline for coordinating the complete workflow.

This module contains the main processing logic that orchestrates all steps
of the text analysis pipeline.
"""

import logging
from typing import Dict, Any, List
from django.db import transaction
from .models import TextSubmission, Summary, Fragment
from .services import OpenAIService, split_into_sentences

logger = logging.getLogger(__name__)


class TextProcessor:
    """
    Main processor class that orchestrates the complete text analysis pipeline.

    This class handles both the full workflow and individual stages:
    1. Generate primary summary (S1)
    2. Extract fragments (F1[])
    3. Generate secondary summary (S2)
    4. Extract justification fragments (F2[])
    5. Verify all fragments mechanically
    """

    def __init__(self):
        """Initialize the text processor with OpenAI service."""
        self.openai_service = OpenAIService()

    def process_text_submission(self, submission_id: str) -> Dict[str, Any]:
        """
        Process a text submission through the complete pipeline.

        Args:
            submission_id: UUID of the TextSubmission to process

        Returns:
            Dict[str, Any]: Processing results including all summaries and fragments

        Raises:
            Exception: If processing fails at any stage
        """
        try:
            # Get the submission and mark as processing
            submission = TextSubmission.objects.get(id=submission_id)
            submission.start_processing()

            logger.info(f"Starting text processing for submission {submission_id}")

            # Stage 1: Generate primary summary (S1)
            logger.info("Stage 1: Generating primary summary")
            s1_content = self.openai_service.generate_primary_summary(
                submission.original_text
            )

            with transaction.atomic():
                s1_summary = Summary.objects.create(
                    submission=submission, summary_type="S1", content=s1_content
                )

            # Stage 2: Extract fragments (F1[])
            logger.info("Stage 2: Extracting fragments")
            f1_fragments = self.openai_service.extract_fragments(
                submission.original_text
            )

            # Store F1 fragments and verify them
            f1_objects = []
            with transaction.atomic():
                for i, fragment_content in enumerate(f1_fragments, 1):
                    fragment = Fragment.objects.create(
                        submission=submission,
                        fragment_type="F1",
                        content=fragment_content,
                        sequence_number=i,
                    )
                    # Verify the fragment against original text
                    fragment.verify_against_text(submission.original_text)
                    f1_objects.append(fragment)

            # Stage 3: Generate secondary summary (S2)
            logger.info("Stage 3: Generating secondary summary")
            s2_content = self.openai_service.generate_secondary_summary(f1_fragments)

            with transaction.atomic():
                s2_summary = Summary.objects.create(
                    submission=submission, summary_type="S2", content=s2_content
                )

            # Stage 4: Extract justification fragments (F2[])
            logger.info("Stage 4: Extracting justification fragments")
            s1_sentences = split_into_sentences(s1_content)
            justification_pairs = self.openai_service.extract_justification_fragments(
                submission.original_text, s1_sentences
            )

            # Store F2 fragments and verify them
            f2_objects = []
            with transaction.atomic():
                for i, (sentence, justification) in enumerate(justification_pairs, 1):
                    fragment = Fragment.objects.create(
                        submission=submission,
                        fragment_type="F2",
                        content=justification,
                        related_sentence=sentence,
                        sequence_number=i,
                    )
                    # Verify the fragment against original text
                    fragment.verify_against_text(submission.original_text)
                    f2_objects.append(fragment)

            # Mark submission as completed
            submission.mark_completed()

            logger.info(
                f"Text processing completed successfully for submission {submission_id}"
            )

            # Return the complete results
            return self._compile_results(submission)

        except Exception as e:
            logger.error(
                f"Text processing failed for submission {submission_id}: {str(e)}"
            )

            # Mark submission as failed
            try:
                submission = TextSubmission.objects.get(id=submission_id)
                submission.mark_failed(str(e))
            except Exception as update_error:
                logger.error(f"Failed to update submission status: {str(update_error)}")

            raise Exception(f"Text processing failed: {str(e)}")

    def _compile_results(self, submission: TextSubmission) -> Dict[str, Any]:
        """
        Compile the complete processing results for a submission.

        Args:
            submission: The TextSubmission object

        Returns:
            Dict[str, Any]: Complete results including all data and verification status
        """
        # Get all summaries
        summaries = submission.summaries.all()
        s1_summary = summaries.filter(summary_type="S1").first()
        s2_summary = summaries.filter(summary_type="S2").first()

        # Get all fragments
        f1_fragments = submission.fragments.filter(fragment_type="F1").order_by(
            "sequence_number"
        )
        f2_fragments = submission.fragments.filter(fragment_type="F2").order_by(
            "sequence_number"
        )

        # Compile verification statistics
        f1_verified_count = f1_fragments.filter(verified=True).count()
        f2_verified_count = f2_fragments.filter(verified=True).count()

        results = {
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
            "original_text": submission.original_text,
            "summaries": {
                "S1": {
                    "content": s1_summary.content if s1_summary else None,
                    "created_at": (
                        s1_summary.created_at.isoformat() if s1_summary else None
                    ),
                },
                "S2": {
                    "content": s2_summary.content if s2_summary else None,
                    "created_at": (
                        s2_summary.created_at.isoformat() if s2_summary else None
                    ),
                },
            },
            "fragments": {
                "F1": [
                    {
                        "id": str(fragment.id),
                        "sequence_number": fragment.sequence_number,
                        "content": fragment.content,
                        "verified": fragment.verified,
                        "start_position": fragment.start_position,
                        "end_position": fragment.end_position,
                        "created_at": fragment.created_at.isoformat(),
                    }
                    for fragment in f1_fragments
                ],
                "F2": [
                    {
                        "id": str(fragment.id),
                        "sequence_number": fragment.sequence_number,
                        "content": fragment.content,
                        "related_sentence": fragment.related_sentence,
                        "verified": fragment.verified,
                        "start_position": fragment.start_position,
                        "end_position": fragment.end_position,
                        "created_at": fragment.created_at.isoformat(),
                    }
                    for fragment in f2_fragments
                ],
            },
            "verification_summary": {
                "F1_total": f1_fragments.count(),
                "F1_verified": f1_verified_count,
                "F1_verification_rate": (
                    f1_verified_count / f1_fragments.count()
                    if f1_fragments.count() > 0
                    else 0
                ),
                "F2_total": f2_fragments.count(),
                "F2_verified": f2_verified_count,
                "F2_verification_rate": (
                    f2_verified_count / f2_fragments.count()
                    if f2_fragments.count() > 0
                    else 0
                ),
                "overall_verification_rate": (
                    (f1_verified_count + f2_verified_count)
                    / (f1_fragments.count() + f2_fragments.count())
                    if (f1_fragments.count() + f2_fragments.count()) > 0
                    else 0
                ),
            },
        }

        return results

    def generate_s1_summary(self, submission_id: str) -> Summary:
        """
        Generate only the S1 primary summary for a submission.

        Args:
            submission_id: UUID of the TextSubmission to process

        Returns:
            Summary: The created S1 summary object
        """
        try:
            submission = TextSubmission.objects.get(id=submission_id)

            logger.info(f"Generating S1 summary for submission {submission_id}")

            # Generate primary summary (S1)
            s1_content = self.openai_service.generate_primary_summary(
                submission.original_text
            )

            with transaction.atomic():
                s1_summary = Summary.objects.create(
                    submission=submission, summary_type="S1", content=s1_content
                )

            logger.info(f"S1 summary generated for submission {submission_id}")
            return s1_summary

        except Exception as e:
            logger.error(f"Failed to generate S1 summary for {submission_id}: {str(e)}")
            raise Exception(f"S1 generation failed: {str(e)}")

    def extract_f1_fragments(self, submission_id: str) -> List[Fragment]:
        """
        Extract F1 fragments for a submission.

        Args:
            submission_id: UUID of the TextSubmission to process

        Returns:
            List[Fragment]: The created F1 fragment objects
        """
        try:
            submission = TextSubmission.objects.get(id=submission_id)

            logger.info(f"Extracting F1 fragments for submission {submission_id}")

            # Extract fragments (F1[])
            f1_fragments = self.openai_service.extract_fragments(
                submission.original_text
            )

            # Store F1 fragments and verify them
            f1_objects = []
            with transaction.atomic():
                for i, fragment_content in enumerate(f1_fragments, 1):
                    fragment = Fragment.objects.create(
                        submission=submission,
                        fragment_type="F1",
                        content=fragment_content,
                        sequence_number=i,
                    )
                    # Verify the fragment against original text
                    fragment.verify_against_text(submission.original_text)
                    f1_objects.append(fragment)

            logger.info(f"F1 fragments extracted for submission {submission_id}")
            return f1_objects

        except Exception as e:
            logger.error(
                f"Failed to extract F1 fragments for {submission_id}: {str(e)}"
            )
            raise Exception(f"F1 extraction failed: {str(e)}")

    def generate_s2_summary(self, submission_id: str) -> Summary:
        """
        Generate S2 summary based on existing F1 fragments.

        Args:
            submission_id: UUID of the TextSubmission to process

        Returns:
            Summary: The created S2 summary object
        """
        try:
            submission = TextSubmission.objects.get(id=submission_id)

            # Get existing F1 fragments
            f1_fragments = submission.fragments.filter(fragment_type="F1").order_by(
                "sequence_number"
            )
            f1_contents = [fragment.content for fragment in f1_fragments]

            if not f1_contents:
                raise Exception("No F1 fragments found for S2 generation")

            logger.info(f"Generating S2 summary for submission {submission_id}")

            # Generate secondary summary (S2)
            s2_content = self.openai_service.generate_secondary_summary(f1_contents)

            with transaction.atomic():
                s2_summary = Summary.objects.create(
                    submission=submission, summary_type="S2", content=s2_content
                )

            logger.info(f"S2 summary generated for submission {submission_id}")
            return s2_summary

        except Exception as e:
            logger.error(f"Failed to generate S2 summary for {submission_id}: {str(e)}")
            raise Exception(f"S2 generation failed: {str(e)}")

    def extract_f2_fragments(self, submission_id: str) -> List[Fragment]:
        """
        Extract F2 justification fragments.

        Args:
            submission_id: UUID of the TextSubmission to process

        Returns:
            List[Fragment]: The created F2 fragment objects
        """
        try:
            submission = TextSubmission.objects.get(id=submission_id)

            # Get existing S1 summary
            s1_summary = submission.summaries.filter(summary_type="S1").first()
            if not s1_summary:
                raise Exception("No S1 summary found for F2 extraction")

            logger.info(f"Extracting F2 fragments for submission {submission_id}")

            # Extract justification fragments (F2[])
            s1_sentences = split_into_sentences(s1_summary.content)
            justification_pairs = self.openai_service.extract_justification_fragments(
                submission.original_text, s1_sentences
            )

            # Store F2 fragments and verify them
            f2_objects = []
            with transaction.atomic():
                for i, (sentence, justification) in enumerate(justification_pairs, 1):
                    fragment = Fragment.objects.create(
                        submission=submission,
                        fragment_type="F2",
                        content=justification,
                        related_sentence=sentence,
                        sequence_number=i,
                    )
                    # Verify the fragment against original text
                    fragment.verify_against_text(submission.original_text)
                    f2_objects.append(fragment)

            logger.info(f"F2 fragments extracted for submission {submission_id}")
            return f2_objects

        except Exception as e:
            logger.error(
                f"Failed to extract F2 fragments for {submission_id}: {str(e)}"
            )
            raise Exception(f"F2 extraction failed: {str(e)}")

    def complete_verification(self, submission_id: str) -> Dict[str, Any]:
        """
        Complete verification and finalize the submission.

        Args:
            submission_id: UUID of the TextSubmission to process

        Returns:
            Dict[str, Any]: Verification summary with statistics
        """
        try:
            submission = TextSubmission.objects.get(id=submission_id)

            logger.info(f"Completing verification for submission {submission_id}")

            # Get all fragments
            f1_fragments = submission.fragments.filter(fragment_type="F1")
            f2_fragments = submission.fragments.filter(fragment_type="F2")

            # Calculate verification statistics
            f1_verified_count = f1_fragments.filter(verified=True).count()
            f2_verified_count = f2_fragments.filter(verified=True).count()

            verification_summary = {
                "F1_total": f1_fragments.count(),
                "F1_verified": f1_verified_count,
                "F1_verification_rate": (
                    f1_verified_count / f1_fragments.count()
                    if f1_fragments.count() > 0
                    else 0
                ),
                "F2_total": f2_fragments.count(),
                "F2_verified": f2_verified_count,
                "F2_verification_rate": (
                    f2_verified_count / f2_fragments.count()
                    if f2_fragments.count() > 0
                    else 0
                ),
                "overall_verification_rate": (
                    (f1_verified_count + f2_verified_count)
                    / (f1_fragments.count() + f2_fragments.count())
                    if (f1_fragments.count() + f2_fragments.count()) > 0
                    else 0
                ),
            }

            # Mark submission as completed
            submission.mark_completed()

            logger.info(f"Verification completed for submission {submission_id}")
            return verification_summary

        except Exception as e:
            logger.error(
                f"Failed to complete verification for {submission_id}: {str(e)}"
            )
            raise Exception(f"Verification failed: {str(e)}")


class VerificationService:
    """Service for performing mechanical verification of text fragments."""

    @staticmethod
    def verify_fragment_in_text(
        fragment_content: str, original_text: str
    ) -> Dict[str, Any]:
        """
        Verify that a fragment exists verbatim in the original text.

        Args:
            fragment_content: The fragment to verify
            original_text: The original text to search in

        Returns:
            Dict[str, Any]: Verification result with position and status
        """
        # Look for exact match
        start_pos = original_text.find(fragment_content)

        if start_pos != -1:
            return {
                "verified": True,
                "start_position": start_pos,
                "end_position": start_pos + len(fragment_content),
                "match_type": "exact",
            }

        # If exact match not found, try case-insensitive search
        start_pos_ci = original_text.lower().find(fragment_content.lower())

        if start_pos_ci != -1:
            return {
                "verified": True,
                "start_position": start_pos_ci,
                "end_position": start_pos_ci + len(fragment_content),
                "match_type": "case_insensitive",
            }

        # Try searching for partial matches (fragments within sentences)
        # This handles cases where LLM might extract parts of sentences
        words = fragment_content.split()
        if len(words) > 3:  # Only for longer fragments
            # Try to find most of the words in sequence
            for i in range(len(words) - 2):
                partial_fragment = " ".join(words[i:])
                if len(partial_fragment) > 20:  # Minimum length for partial match
                    partial_pos = original_text.find(partial_fragment)
                    if partial_pos != -1:
                        return {
                            "verified": True,
                            "start_position": partial_pos,
                            "end_position": partial_pos + len(partial_fragment),
                            "match_type": "partial",
                        }

        return {
            "verified": False,
            "start_position": None,
            "end_position": None,
            "match_type": "no_match",
        }

    @staticmethod
    def bulk_verify_fragments(
        fragments: List[Fragment], original_text: str
    ) -> Dict[str, Any]:
        """
        Verify multiple fragments against the original text.

        Args:
            fragments: List of Fragment objects to verify
            original_text: The original text to verify against

        Returns:
            Dict[str, Any]: Bulk verification results and statistics
        """
        results = []
        verified_count = 0

        for fragment in fragments:
            verification_result = VerificationService.verify_fragment_in_text(
                fragment.content, original_text
            )

            # Update the fragment with verification results
            if verification_result["verified"]:
                fragment.verified = True
                fragment.start_position = verification_result["start_position"]
                fragment.end_position = verification_result["end_position"]
                verified_count += 1
            else:
                fragment.verified = False
                fragment.start_position = None
                fragment.end_position = None

            fragment.save(update_fields=["verified", "start_position", "end_position"])

            results.append(
                {
                    "fragment_id": str(fragment.id),
                    "verified": verification_result["verified"],
                    "match_type": verification_result["match_type"],
                    "position": {
                        "start": verification_result["start_position"],
                        "end": verification_result["end_position"],
                    },
                }
            )

        return {
            "results": results,
            "total_fragments": len(fragments),
            "verified_count": verified_count,
            "verification_rate": verified_count / len(fragments) if fragments else 0,
        }
