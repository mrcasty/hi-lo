# Repository Guidelines

Concise guidance for contributing to this CLI codebase. If you’re working from a prebuilt binary, this file is informational; clone the repository to develop locally.

## Project Structure & Module Organization
- `src/`: Core application, commands, and entrypoint (`main.rs`).
- `tests/`: Integration tests exercising end-to-end behavior.
- `assets/` or `fixtures/`: Sample inputs and test data (if present).
- `crates/` (workspace): Additional libraries/binaries split by domain.
- `scripts/`: Utility scripts for CI and local dev.

## Build, Test, and Development Commands
- `cargo build` / `cargo build --release`: Compile debug/release builds.
- `cargo run -- --help`: Run the CLI and show usage.
- `cargo test`: Execute unit/integration tests.
- `cargo fmt -- --check`: Verify formatting.
- `cargo clippy -- -D warnings`: Lint and fail on warnings.
- Optional: `cargo llvm-cov --workspace --html` for coverage (if configured).

## Coding Style & Naming Conventions
- Rust 2021+, 4-space indent; format with `rustfmt` and lint with `clippy`.
- Names: `snake_case` for modules/functions, `CamelCase` for types, `SCREAMING_SNAKE_CASE` for consts.
- Error handling: prefer `Result` over panics; avoid `unwrap()` outside tests and top-level `main` error funnels.
- CLI UX: consistent flags (`--json`, `--verbose`, `--dry-run`) and clear error messages.

## Testing Guidelines
- Unit tests colocated in `src/*` with `#[cfg(test)]`; integration tests in `tests/`.
- Test names describe behavior (e.g., `parses_valid_flags`); arrange-act-assert structure.
- Include fixtures in `assets/` and use temp dirs for write operations.
- Aim for meaningful coverage on parsing, error paths, and I/O.

## Commit & Pull Request Guidelines
- Use Conventional Commits (e.g., `feat: add plan update command`, `fix(cli): handle empty args`).
- One focused change per PR; include description, linked issues, and before/after examples or logs.
- Update tests/docs when behavior changes; add screenshots for UX/help output changes.
- CI must pass: build, fmt, clippy, and tests.

## Security & Configuration Tips
- Never commit secrets; use environment variables or `.env.local` ignored by VCS.
- Sanitize logs and redact tokens; prefer least-privilege file access.
- On Windows, quote paths with spaces and prefer UTF-8 I/O.

