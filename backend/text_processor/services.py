"""
Services for text processing using OpenAI API.

This module handles all interactions with the OpenAI API for summarization
and fragment extraction tasks.
"""

import logging
import re
from typing import List, Dict, Any, Tuple
from django.conf import settings
import openai
import httpx

logger = logging.getLogger(__name__)


class OpenAIService:
    """Service class for handling OpenAI API interactions."""

    def __init__(self):
        """Initialize the OpenAI client with API key from settings."""
        openai.api_key = settings.OPENAI_API_KEY

        # Create explicit httpx client to avoid proxy detection issues
        # This fixes the "unexpected keyword argument 'proxies'" error
        http_client = httpx.Client(proxy=None)

        self.client = openai.OpenAI(
            api_key=settings.OPENAI_API_KEY, http_client=http_client
        )

    def _make_api_call(
        self, messages: List[Dict[str, str]], max_tokens: int = 1000
    ) -> str:
        """
        Make a call to the OpenAI API with error handling.

        Args:
            messages: List of message dictionaries for the conversation
            max_tokens: Maximum tokens for the response

        Returns:
            str: The response content from OpenAI

        Raises:
            Exception: If the API call fails
        """
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=messages,
                max_tokens=max_tokens,
                temperature=0.3,  # Lower temperature for more consistent results
                top_p=1.0,
                frequency_penalty=0.0,
                presence_penalty=0.0,
            )

            content = response.choices[0].message.content
            if not content:
                raise Exception("Empty response from OpenAI API")

            logger.info(
                f"OpenAI API call successful. Tokens used: {response.usage.total_tokens}"
            )
            return content.strip()

        except Exception as e:
            logger.error(f"OpenAI API call failed: {str(e)}")
            raise Exception(f"Failed to get response from OpenAI: {str(e)}")

    def generate_primary_summary(self, text: str) -> str:
        """
        Generate a primary summary (S1) of the input text.

        Args:
            text: The original text to summarize

        Returns:
            str: The generated summary
        """
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a skilled text summarizer. Create a concise, accurate summary "
                    "that captures the main points and key information from the provided text. "
                    "The summary should be clear, well-structured, and preserve the essential meaning."
                ),
            },
            {
                "role": "user",
                "content": f"Please summarize the following text:\n\n{text}",
            },
        ]

        return self._make_api_call(messages, max_tokens=500)

    def extract_fragments(self, text: str) -> List[str]:
        """
        Extract 10 verbatim fragments from the original text (F1[]).

        Args:
            text: The original text to extract fragments from

        Returns:
            List[str]: List of exactly 10 verbatim text fragments
        """
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a text analysis expert. Extract exactly 10 important phrases or sentences "
                    "VERBATIM from the provided text. These fragments should be direct quotes that can be "
                    "mechanically verified against the original text. Each fragment should be meaningful "
                    "and represent key information. Return only the fragments, one per line, numbered 1-10."
                ),
            },
            {
                "role": "user",
                "content": f"Extract 10 verbatim fragments from this text:\n\n{text}",
            },
        ]

        response = self._make_api_call(messages, max_tokens=800)

        # Parse the numbered fragments from the response
        fragments = self._parse_numbered_list(response, expected_count=10)

        if len(fragments) != 10:
            logger.warning(f"Expected 10 fragments, got {len(fragments)}. Adjusting...")
            # If we don't have exactly 10, pad or trim as needed
            if len(fragments) < 10:
                # Add empty placeholders if needed (should not happen in practice)
                fragments.extend(
                    [f"Fragment {i+1} not extracted" for i in range(len(fragments), 10)]
                )
            else:
                # Trim to exactly 10
                fragments = fragments[:10]

        return fragments

    def generate_secondary_summary(self, fragments: List[str]) -> str:
        """
        Generate a secondary summary (S2) using the extracted fragments.

        Args:
            fragments: List of text fragments to base the summary on

        Returns:
            str: The generated summary based on fragments
        """
        fragments_text = "\n".join([f"- {fragment}" for fragment in fragments])

        messages = [
            {
                "role": "system",
                "content": (
                    "You are a text summarizer. Create a coherent summary based solely on the "
                    "provided text fragments. The summary should synthesize these fragments into "
                    "a clear, logical narrative that captures the main themes and information."
                ),
            },
            {
                "role": "user",
                "content": f"Create a summary based on these text fragments:\n\n{fragments_text}",
            },
        ]

        return self._make_api_call(messages, max_tokens=500)

    def extract_justification_fragments(
        self, original_text: str, summary_sentences: List[str]
    ) -> List[Tuple[str, str]]:
        """
        Extract justification fragments (F2[]) for each sentence in the primary summary.

        Args:
            original_text: The original input text
            summary_sentences: List of sentences from the primary summary (S1)

        Returns:
            List[Tuple[str, str]]: List of (sentence, justification_fragment) pairs
        """
        justifications = []

        for sentence in summary_sentences:
            messages = [
                {
                    "role": "system",
                    "content": (
                        "You are a text analysis expert. For the given summary sentence, find a "
                        "VERBATIM quote from the original text that supports or justifies that sentence. "
                        "Return only the exact quote from the original text, nothing else."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f'Summary sentence: "{sentence}"\n\n'
                        f"Original text: {original_text}\n\n"
                        f"Find a verbatim quote from the original text that supports this summary sentence:"
                    ),
                },
            ]

            try:
                justification = self._make_api_call(messages, max_tokens=300)
                # Clean up the response (remove quotes if they were added)
                justification = justification.strip().strip('"').strip("'")
                justifications.append((sentence, justification))
            except Exception as e:
                logger.error(
                    f"Failed to extract justification for sentence: {sentence}. Error: {e}"
                )
                justifications.append(
                    (sentence, f"[Error extracting justification: {str(e)}]")
                )

        return justifications

    def _parse_numbered_list(self, text: str, expected_count: int = None) -> List[str]:
        """
        Parse a numbered list from text response.

        Args:
            text: The text containing numbered items
            expected_count: Expected number of items (optional)

        Returns:
            List[str]: List of parsed items without numbers
        """
        lines = text.strip().split("\n")
        fragments = []

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Match patterns like "1. ", "1) ", "1: ", etc.
            match = re.match(r"^\d+[\.\)\:]\s*(.+)", line)
            if match:
                fragments.append(match.group(1).strip())
            elif line and not re.match(r"^\d+[\.\)\:]?\s*$", line):
                # If it's not empty and not just a number, include it
                fragments.append(line)

        return fragments


def split_into_sentences(text: str) -> List[str]:
    """
    Split text into sentences using simple heuristics.

    Args:
        text: The text to split into sentences

    Returns:
        List[str]: List of sentences
    """
    # Simple sentence splitting - could be improved with NLTK or spaCy
    sentences = re.split(r"[.!?]+\s+", text.strip())

    # Clean up and filter out empty sentences
    sentences = [s.strip() for s in sentences if s.strip()]

    # Add periods back to sentences that don't end with punctuation
    for i, sentence in enumerate(sentences):
        if not sentence.endswith((".", "!", "?")):
            sentences[i] = sentence + "."

    return sentences
