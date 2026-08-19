# Ghitty

Recall-first GitHub repository discovery using OpenAI-compatible structured outputs, adaptive query expansion, GitHub Search, and code evidence from Ken's Grep MCP.

![Ghitty scanning a network of software repositories for evidence-backed matches](assets/ghitty-hero.png)

## How Ghitty searches

One topic fans out across languages, metadata, adjacent ecosystems, and code evidence before Ghitty ranks the strongest matches.

![Ghitty expanding a query into broad search paths and converging on evidence-backed repository matches](assets/ghitty-search-pipeline.png)

## Run the local web app

Install both runtimes once:

```bash
bun install
python3 -m venv .venv && source .venv/bin/activate
pip install .
```

Store keys in macOS Keychain so they remain encrypted at rest, then start the app with the key available only to the local Bun server and its Python worker:

```bash
security add-generic-password -U -a "$USER" -s repo-finder-openrouter -w
export GITHUB_TOKEN="$(gh auth token)" # optional; requires an authenticated GitHub CLI
OPENROUTER_API_KEY="$(security find-generic-password -a "$USER" -s repo-finder-openrouter -w)" \
  PORT=3001 bun run start
```

Open <http://localhost:3001>. For a simpler setup, copy `.env.example` to `.env` and add the key there; `.env` is gitignored but remains plaintext.

## Run one CLI search

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install .

# Direct OpenAI
export OPENAI_API_KEY='...'

# Or OpenRouter through the same OpenAI SDK
# export OPENROUTER_API_KEY='...'
# export REPO_FINDER_PROVIDER='openrouter'
# export REPO_FINDER_MODEL='~openai/gpt-latest'

export GITHUB_TOKEN='...' # optional, but recommended
ghitty "image generation" \
  --grep-evidence benchmarks/grep_evidence.json
```

Keys are read only from environment variables. `REPO_FINDER_PROVIDER` accepts `openai` or `openrouter`; automatic selection prefers OpenAI when both keys exist. Output is JSON; query progress and skipped requests go to stderr.

## Run the benchmark

```bash
python3 benchmarks/run_benchmark.py
```

The benchmark compares literal GitHub search with the expanded hybrid pipeline for `image generation`, `llm agent orchestration`, and `splunk/cribl pipeline tooling`. Reports are written under ignored `benchmark-results/`.

`benchmarks/grep_evidence.json` contains short, linked evidence collected through Ken's Grep MCP. The standalone prototype imports that evidence because the MCP server connection belongs to the host application; the SaaS worker will replace this file boundary with the live MCP adapter.

## Tests

```bash
python3 -m unittest discover -s tests -v
```

## License

Ghitty is licensed under the [GNU Affero General Public License v3.0](LICENSE) (`AGPL-3.0-only`). Network deployments of modified versions must offer their corresponding source code to users.