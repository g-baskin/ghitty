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

    def test_create_search_plan_preserves_request_and_builds_explicit_intent(self):
        request = "I want to create video images"
        response = {
            "interpretations": ["  Generate still images for video production  "],
            "technical_concepts": ["text-to-image", "storyboard generation"],
            "github_queries": [
                "text to image generation",
                "storyboard image generator",
                "video thumbnail generator",
                "keyframe image synthesis",
                "diffusion image pipeline",
                "prompt to image SDK",
                "video previsualization tool",
                "image generation UI",
            ],
            "code_probes": ["from diffusers import DiffusionPipeline", "StableDiffusionPipeline(", "model_index.json"],
        }
        with patch("repo_finder.model_json", return_value=response) as model_json:
            plan = repo_finder.create_search_plan(request, "test/model")

        self.assertEqual(plan["original_request"], request)
        self.assertEqual(plan["interpretations"], ["Generate still images for video production"])
        self.assertEqual(plan["technical_concepts"], ["text-to-image", "storyboard generation"])
        self.assertTrue(all(query.endswith("fork:false") for query in plan["github_queries"]))
        self.assertEqual(plan["code_probes"], response["code_probes"])
        self.assertIn("everyday request", model_json.call_args.args[0])
        self.assertIs(model_json.call_args.args[1], repo_finder.INTENT_SEARCH_PLAN_SCHEMA)

    def test_create_search_plan_rejects_invalid_github_syntax(self):
        response = {
            "interpretations": ["Generate images"],
            "technical_concepts": ["text-to-image"],
            "github_queries": ["(diffusion OR image) OR video"] * 8,
            "code_probes": ["DiffusionPipeline(", "model_index.json", "torch.inference_mode("],
        }
        with patch("repo_finder.model_json", return_value=response):
            with self.assertRaisesRegex(repo_finder.RepoFinderError, "unsupported syntax"):
                repo_finder.create_search_plan("I want to create video images", None)

    def test_run_rejects_malformed_adaptive_query_before_second_api_call(self):
        plan = {
            "original_request": "request",
            "interpretations": ["meaning"],
            "technical_concepts": ["concept"],
            "github_queries": ["concept fork:false"],
            "code_probes": ["Concept("],
        }
        candidate = repo_finder.Candidate(
            "owner/repo", "https://github.com/owner/repo", "desc", "Python", False, "", [], 0
        )
        adaptive_response = {"github_queries": ["(bad OR query) OR extra"], "reason": "new path"}
        with patch("repo_finder.create_search_plan", return_value=plan), patch(
            "repo_finder.fetch_queries", return_value=([candidate], {})
        ) as fetch_queries, patch("repo_finder.model_json", return_value=adaptive_response):
            with self.assertRaisesRegex(repo_finder.RepoFinderError, "unsupported syntax"):
                repo_finder.run("request", 1, 1, None, None)

        fetch_queries.assert_called_once_with(plan["github_queries"], 1)

    def test_run_reports_static_evidence_not_provided(self):
        plan = {
            "original_request": "request",
            "interpretations": ["meaning"],
            "technical_concepts": ["concept"],
            "github_queries": ["concept fork:false"],
            "code_probes": ["Concept("],
        }
        with patch("repo_finder.create_search_plan", return_value=plan), patch(
            "repo_finder.fetch_queries", return_value=([], {})
        ), patch("repo_finder.rank_candidates", return_value=[]):
            result = repo_finder.run("request", 1, 1, None, None)

        self.assertEqual(result["original_request"], "request")
        self.assertEqual(result["search_plan"], plan)
        self.assertEqual(
            result["static_evidence"],
            {"source": "file", "status": "not-provided", "candidate_count": 0},
        )
        self.assertEqual(result["code_evidence"]["status"], "disabled")

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
                    "private": False,
                    "license": {"spdx_id": "MIT"},
                    "updated_at": "2024-01-01T00:00:00Z",
                    "topics": ["diffusion"],
                    "stargazers_count": 0,
                },
                {
                    "full_name": "owner/unlicensed",
                    "html_url": "https://github.com/owner/unlicensed",
                    "fork": False,
                    "private": False,
                    "license": {"spdx_id": "NOASSERTION"},
                },
                {
                    "full_name": "owner/fake-license",
                    "html_url": "https://github.com/owner/fake-license",
                    "fork": False,
                    "private": False,
                    "license": {"spdx_id": "DefinitelyNotALicense"},
                },
                {
                    "full_name": "owner/private",
                    "html_url": "https://github.com/owner/private",
                    "fork": False,
                    "private": True,
                    "license": {"spdx_id": "Apache-2.0"},
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
        self.assertEqual(results[0].license, "MIT")
        self.assertTrue(results[0].public)
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
            "owner/repo",
            "https://github.com/owner/repo",
            "desc",
            None,
            False,
            "",
            [],
            0,
            license="MIT",
            public=True,
            github_queries=["query one"],
        )
        code = repo_finder.Candidate(
            "OWNER/REPO",
            "https://github.com/owner/repo",
            None,
            None,
            False,
            "",
            [],
            0,
            license="Apache-2.0",
            public=True,
            grep_evidence=[
                {
                    "probe": "Thing(",
                    "snippet": "Thing()",
                    "url": "https://github.com/owner/repo/blob/main/file.py",
                }
            ],
        )
        merged = list(repo_finder.merge_candidates([metadata, code]).values())
        self.assertEqual(len(merged), 1)
        self.assertEqual(merged[0].evidence_type, "both")
        self.assertEqual(merged[0].license, "MIT")
        self.assertTrue(repo_finder.is_open_source(merged[0]))

    def test_live_code_evidence_uses_argv_and_filters_environment(self):
        probe = "useState("
        response = {
            "results": {
                probe: [
                    {
                        "repo": "owner/repo",
                        "file": "src/index.ts",
                        "link": "https://github.com/owner/repo/blob/main/src/index.ts",
                        "snippet": "1 │ useState()",
                        "license": "MIT",
                        "stars": 12,
                        "updated_at": "2026-08-18",
                    }
                ]
            },
            "failures": {},
        }
        completed = Mock(returncode=0, stdout=json.dumps(response), stderr="")
        environment = {
            "PATH": "/usr/bin",
            "GITHUB_TOKEN": "github-token",
            "OPENAI_API_KEY": "must-not-cross-the-bridge",
        }
        with patch.dict(os.environ, environment, clear=True), patch(
            "repo_finder.shutil.which", side_effect=["/usr/bin/bun", "/usr/bin/node"]
        ), patch("repo_finder.subprocess.run", return_value=completed) as run_process:
            candidates, status = repo_finder.load_live_code_evidence([probe], True)

        self.assertEqual(status["status"], "loaded")
        self.assertEqual(status["candidate_count"], 1)
        self.assertEqual(candidates[0].license, "MIT")
        self.assertEqual(candidates[0].grep_evidence[0]["source"], "kencode-search")
        self.assertEqual(run_process.call_args.args[0][0:2], ["/usr/bin/bun", "run"])
        self.assertNotIn("shell", run_process.call_args.kwargs)
        self.assertNotIn("OPENAI_API_KEY", run_process.call_args.kwargs["env"])
        self.assertEqual(run_process.call_args.kwargs["env"]["GITHUB_TOKEN"], "github-token")

    def test_live_code_evidence_reports_no_matches_partial_and_error(self):
        probes = ["First(", "Second("]
        no_matches = Mock(
            returncode=0,
            stdout=json.dumps({"results": {probe: [] for probe in probes}, "failures": {}}),
            stderr="",
        )
        partial = Mock(
            returncode=0,
            stdout=json.dumps(
                {
                    "results": {
                        probes[0]: [
                            {
                                "repo": "owner/repo",
                                "file": "file.py",
                                "link": "https://github.com/owner/repo/blob/main/file.py",
                                "snippet": "1 │ First()",
                                "license": "Apache-2.0",
                            }
                        ]
                    },
                    "failures": {probes[1]: "timed out"},
                }
            ),
            stderr="",
        )
        timeout = repo_finder.subprocess.TimeoutExpired(["bun"], 90)
        with patch("repo_finder.shutil.which", side_effect=lambda name: f"/usr/bin/{name}"), patch(
            "repo_finder.subprocess.run", side_effect=[no_matches, partial, timeout]
        ):
            _, no_match_status = repo_finder.load_live_code_evidence(probes, True)
            candidates, partial_status = repo_finder.load_live_code_evidence(probes, True)
            _, error_status = repo_finder.load_live_code_evidence(probes, True)

        self.assertEqual(no_match_status["status"], "no-matches")
        self.assertEqual(partial_status["status"], "partial")
        self.assertEqual(len(candidates), 1)
        self.assertEqual(partial_status["failures"], {probes[1]: "timed out"})
        self.assertEqual(error_status["status"], "error")
        self.assertIn("timed out", error_status["failures"]["bridge"])

    def test_live_code_evidence_rejects_malformed_or_unlicensed_bridge_rows(self):
        probe = "Thing("
        response = {
            "results": {
                probe: [
                    {
                        "repo": "owner/repo",
                        "file": "file.py",
                        "link": "https://github.com/owner/repo/blob/main/file.py",
                        "snippet": "1 │ Thing()",
                        "license": "NOASSERTION",
                    }
                ]
            },
            "failures": {},
        }
        completed = Mock(returncode=0, stdout=json.dumps(response), stderr="")
        with patch("repo_finder.shutil.which", side_effect=lambda name: f"/usr/bin/{name}"), patch(
            "repo_finder.subprocess.run", return_value=completed
        ):
            candidates, status = repo_finder.load_live_code_evidence([probe], True)

        self.assertEqual(candidates, [])
        self.assertEqual(status["status"], "error")
        self.assertIn("unlicensed", status["failures"]["bridge"])

    def test_rank_candidates_requests_fifth_grade_explanations(self):
        candidate = repo_finder.Candidate(
            "owner/repo", "https://github.com/owner/repo", "A useful project", "Python", False, "", [], 0
        )
        response = {
            "picks": [
                {
                    "full_name": "owner/repo",
                    "why": "This tool helps people find code. It matches the search topic.",
                    "role": "tool",
                    "match": "focused",
                    "translated_description": None,
                }
            ]
        }
        with patch("repo_finder.model_json", return_value=response) as model_json:
            picks = repo_finder.rank_candidates("code search", [candidate], 10, None)

        self.assertEqual(len(picks), 1)
        self.assertIn("fifth-grade reader", model_json.call_args.args[0])
        self.assertIn("exactly two short", model_json.call_args.args[0])

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
        self.assertEqual(results[0].grep_evidence[0]["source"], "file")
        self.assertIsNone(results[0].license)
        self.assertFalse(repo_finder.is_open_source(results[0]))

    def test_run_loads_but_does_not_rank_unlicensed_static_evidence(self):
        plan = {
            "original_request": "topic",
            "interpretations": ["meaning"],
            "technical_concepts": ["concept"],
            "github_queries": ["concept fork:false"],
            "code_probes": ["Concept("],
        }
        with TemporaryDirectory() as directory:
            path = Path(directory) / "evidence.json"
            path.write_text(
                json.dumps(
                    {
                        "topic": [
                            {
                                "full_name": "owner/repo",
                                "url": "https://github.com/owner/repo/blob/main/file.py",
                                "probe": "Concept(",
                                "snippet": "Concept()",
                            }
                        ]
                    }
                ),
                encoding="utf-8",
            )
            with patch("repo_finder.create_search_plan", return_value=plan), patch(
                "repo_finder.fetch_queries", return_value=([], {})
            ), patch("repo_finder.rank_candidates", return_value=[]) as rank_candidates:
                result = repo_finder.run("topic", 1, 1, None, path)

        self.assertEqual(result["static_evidence"]["status"], "loaded")
        self.assertEqual(result["candidate_count"], 0)
        self.assertEqual(rank_candidates.call_args.args[1], [])

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
        self.assertEqual(request["max_tokens"], repo_finder.MAX_MODEL_OUTPUT_TOKENS)
        self.assertNotIn("max_completion_tokens", request)
        self.assertTrue(request["response_format"]["json_schema"]["strict"])
        self.assertTrue(request["extra_body"]["provider"]["require_parameters"])

    def test_model_json_accepts_json_in_a_markdown_fence(self):
        client = Mock()
        client.chat.completions.create.return_value = Mock(
            choices=[Mock(message=Mock(content='```json\n{"value": "ok"}\n```'))]
        )
        schema = {"type": "object", "properties": {"value": {"type": "string"}}}
        environment = {"REPO_FINDER_PROVIDER": "openrouter", "OPENROUTER_API_KEY": "test-key"}

        with patch.dict(os.environ, environment, clear=True), patch("openai.OpenAI", return_value=client):
            result = repo_finder.model_json("prompt", schema, "test/model")

        self.assertEqual(result, {"value": "ok"})

    def test_model_json_rejects_prose_around_json(self):
        client = Mock()
        client.chat.completions.create.return_value = Mock(
            choices=[Mock(message=Mock(content='Here is the result: {"value": "ok"}'))]
        )
        environment = {"REPO_FINDER_PROVIDER": "openrouter", "OPENROUTER_API_KEY": "test-key"}

        with patch.dict(os.environ, environment, clear=True), patch("openai.OpenAI", return_value=client):
            with self.assertRaisesRegex(repo_finder.RepoFinderError, "invalid structured content"):
                repo_finder.model_json("prompt", {"type": "object"}, "test/model")

    def test_model_json_wraps_a_single_array_structured_response(self):
        client = Mock()
        client.chat.completions.create.return_value = Mock(
            choices=[Mock(message=Mock(content='[{"full_name": "owner/repo"}]'))]
        )
        schema = {
            "type": "object",
            "properties": {"picks": {"type": "array", "items": {"type": "object"}}},
        }
        environment = {"REPO_FINDER_PROVIDER": "openrouter", "OPENROUTER_API_KEY": "test-key"}

        with patch.dict(os.environ, environment, clear=True), patch("openai.OpenAI", return_value=client):
            result = repo_finder.model_json("prompt", schema, "test/model")

        self.assertEqual(result, {"picks": [{"full_name": "owner/repo"}]})

    def test_model_json_rejects_an_array_for_a_multi_property_schema(self):
        client = Mock()
        client.chat.completions.create.return_value = Mock(choices=[Mock(message=Mock(content="[]"))])
        schema = {
            "type": "object",
            "properties": {"queries": {"type": "array"}, "reason": {"type": "string"}},
        }
        environment = {"REPO_FINDER_PROVIDER": "openrouter", "OPENROUTER_API_KEY": "test-key"}

        with patch.dict(os.environ, environment, clear=True), patch("openai.OpenAI", return_value=client):
            with self.assertRaisesRegex(repo_finder.RepoFinderError, "non-object"):
                repo_finder.model_json("prompt", schema, "test/model")

    def test_model_json_uses_openai_output_limit_for_direct_provider(self):
        completion = Mock()
        completion.choices = [Mock(message=Mock(content='{"ok": true}'))]
        client = Mock()
        client.chat.completions.create.return_value = completion
        environment = {"REPO_FINDER_PROVIDER": "openai", "OPENAI_API_KEY": "test-key"}
        with patch.dict(os.environ, environment, clear=True), patch("openai.OpenAI", return_value=client):
            repo_finder.model_json("prompt", {"type": "object"}, "test/model")

        request = client.chat.completions.create.call_args.kwargs
        self.assertEqual(request["max_completion_tokens"], repo_finder.MAX_MODEL_OUTPUT_TOKENS)
        self.assertNotIn("max_tokens", request)

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
