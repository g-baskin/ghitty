import json
import os
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import Mock, patch

import repo_finder


class RepoFinderTests(unittest.TestCase):
    def test_normalize_query_enforces_fork_filter(self):
        self.assertEqual(repo_finder.normalize_query(" diffusion "), "diffusion fork:false")
        self.assertEqual(repo_finder.normalize_query("diffusion fork:true"), "diffusion fork:false")

    def test_github_search_ignores_forks_and_preserves_archived(self):
        payload = {
            "items": [
                {
                    "full_name": "owner/kept",
                    "html_url": "https://github.com/owner/kept",
                    "description": "保留",
                    "language": "Python",
                    "archived": True,
                    "fork": False,
                    "updated_at": "2024-01-01T00:00:00Z",
                    "topics": ["diffusion"],
                    "stargazers_count": 0,
                },
                {
                    "full_name": "owner/fork",
                    "html_url": "https://github.com/owner/fork",
                    "fork": True,
                },
            ]
        }
        with patch("repo_finder._request_json", return_value=payload):
            results = repo_finder.github_search("diffusion fork:true", 25, None)
        self.assertEqual([candidate.full_name for candidate in results], ["owner/kept"])
        self.assertTrue(results[0].archived)
        self.assertEqual(results[0].stars, 0)
        self.assertEqual(results[0].github_queries, ["diffusion fork:false"])

    def test_request_waits_for_github_rate_limit_reset(self):
        reset_at = int(repo_finder.time.time()) + 2
        rate_error = repo_finder.HTTPError(
            "https://api.github.test",
            403,
            "rate limited",
            {"X-RateLimit-Remaining": "0", "X-RateLimit-Reset": str(reset_at)},
            None,
        )
        response = Mock()
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        response.read.return_value = b'{"items": []}'
        with patch("repo_finder.urlopen", side_effect=[rate_error, response]), patch(
            "repo_finder.time.sleep"
        ) as sleep:
            payload = repo_finder._request_json(repo_finder.Request("https://api.github.test"), retries=1)
        self.assertEqual(payload, {"items": []})
        sleep.assert_called_once()

    def test_github_search_retries_without_an_invalid_optional_token(self):
        with patch(
            "repo_finder._request_json",
            side_effect=[repo_finder.RepoFinderError("HTTP 401"), {"items": []}],
        ) as request_json:
            results = repo_finder.github_search("diffusion", 25, "stale-token")
        self.assertEqual(results, [])
        first_request = request_json.call_args_list[0].args[0]
        second_request = request_json.call_args_list[1].args[0]
        self.assertIn("Authorization", first_request.headers)
        self.assertNotIn("Authorization", second_request.headers)

    def test_merge_combines_query_and_code_provenance(self):
        metadata = repo_finder.Candidate(
            "owner/repo", "https://github.com/owner/repo", "desc", None, False, "", [], 0,
            github_queries=["query one"],
        )
        code = repo_finder.Candidate(
            "OWNER/REPO", "https://github.com/owner/repo", None, None, False, "", [], 0,
            grep_evidence=[{"probe": "Thing(", "snippet": "Thing()", "url": "https://github.com/owner/repo/blob/main/file.py"}],
        )
        merged = list(repo_finder.merge_candidates([metadata, code]).values())
        self.assertEqual(len(merged), 1)
        self.assertEqual(merged[0].evidence_type, "both")

    def test_load_grep_evidence_rejects_bad_rows_and_bounds_snippets(self):
        with TemporaryDirectory() as directory:
            path = Path(directory) / "evidence.json"
            path.write_text(
                json.dumps(
                    {
                        "topic": [
                            {
                                "full_name": "owner/repo",
                                "url": "https://github.com/owner/repo/blob/main/file.py",
                                "probe": "Thing(",
                                "snippet": "x" * 600,
                            },
                            {"full_name": "incomplete"},
                        ]
                    }
                ),
                encoding="utf-8",
            )
            results = repo_finder.load_grep_evidence(path, "topic")
        self.assertEqual(len(results), 1)
        self.assertEqual(len(results[0].grep_evidence[0]["snippet"]), 500)

    def test_model_json_requires_a_provider_key(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(repo_finder.RepoFinderError, "OPENROUTER_API_KEY"):
                repo_finder.model_json("prompt", {"type": "object"}, None)

    def test_model_json_uses_openai_sdk_for_openrouter(self):
        message = Mock(content='{"value": "ok"}')
        client = Mock()
        client.chat.completions.create.return_value = Mock(choices=[Mock(message=message)])
        schema = {"type": "object", "properties": {"value": {"type": "string"}}}
        environment = {"REPO_FINDER_PROVIDER": "openrouter", "OPENROUTER_API_KEY": "test-key"}
        with patch.dict(os.environ, environment, clear=True), patch("openai.OpenAI", return_value=client) as sdk:
            result = repo_finder.model_json("prompt", schema, "test/model")
        self.assertEqual(result, {"value": "ok"})
        self.assertEqual(sdk.call_args.kwargs["base_url"], repo_finder.OPENROUTER_BASE_URL)
        request = client.chat.completions.create.call_args.kwargs
        self.assertEqual(request["model"], "test/model")
        self.assertEqual(request["max_completion_tokens"], repo_finder.MAX_MODEL_OUTPUT_TOKENS)
        self.assertTrue(request["response_format"]["json_schema"]["strict"])
        self.assertTrue(request["extra_body"]["provider"]["require_parameters"])

    def test_model_json_explains_openrouter_credit_failures(self):
        import httpx
        from openai import APIStatusError

        request = httpx.Request("POST", repo_finder.OPENROUTER_BASE_URL)
        response = httpx.Response(402, request=request)
        error = APIStatusError("Payment required", response=response, body={"error": {"code": 402}})
        client = Mock()
        client.chat.completions.create.side_effect = error
        environment = {"REPO_FINDER_PROVIDER": "openrouter", "OPENROUTER_API_KEY": "test-key"}
        with patch.dict(os.environ, environment, clear=True), patch("openai.OpenAI", return_value=client):
            with self.assertRaisesRegex(repo_finder.RepoFinderError, "spending limit"):
                repo_finder.model_json("prompt", {"type": "object"}, "test/model")

    def test_main_rejects_oversized_topic_before_network(self):
        self.assertEqual(repo_finder.main(["x" * 201]), 2)


if __name__ == "__main__":
    unittest.main()
