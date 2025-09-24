# Repository Guidelines

## Project Structure & Module Organization
- Source: `app.py`, `main.py` at repo root (PySide6 GUI).
- Config: `pyproject.toml` (Python >=3.12, deps), `.python-version`, `uv.lock`.
- Licensing: `licenses.json` (generated), `THIRD_PARTY_LICENSES.txt`.
- Docs: `README.md`. Add new modules as `snake_case.py`; create `tests/` when introducing tests.

## Build, Test, and Development Commands
- Install deps: `uv sync` — resolves/installs per `pyproject.toml`.
- Run app: `uv run python app.py` (or `main.py`).
- Generate license report: `uv run pip-licenses --from=mixed --with-authors --with-urls --format=json --output-file=licenses.json`.
- Start a REPL with env: `uv run python`.

## Coding Style & Naming Conventions
- Python: PEP 8 with 4-space indentation; max line length 100.
- Types: use type hints; prefer `Path` for filesystem paths.
- Naming: `snake_case` for functions/modules, `PascalCase` for classes, constants `UPPER_SNAKE_CASE`.
- Qt patterns: keep UI work on the main thread; long tasks in `QThread`/`QRunnable` (see `Worker`).

## Testing Guidelines
- There is no test suite yet. If adding tests, prefer `pytest`.
- Structure: `tests/test_*.py` mirroring module names.
- Running (after adding dev dep): `uv run pytest -q`.
- Aim for focused unit tests around thread boundaries and UI-free logic.

## Commit & Pull Request Guidelines
- Commit messages: imperative mood, concise summary (≤72 chars), optional body with rationale.
  - Example: `feat: add progress updates to Worker`
- PRs must include: clear description, screenshots/GIFs for UI changes, steps to test, and any related issues.
- Keep PRs small and single-purpose; note breaking changes.

## Security & Configuration Tips
- Python version: 3.12+. Use `uv`’s environment (`uv run ...`) to ensure consistent deps.
- Do not commit secrets or local paths from dialogs. Review `licenses.json` before publishing.
- If adding settings, prefer environment variables and document them in `README.md`.
