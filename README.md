# Quiz Shorts Generator

Node.js/TypeScript platform for generating and publishing short-form videos through pluggable workflows. The current production-ready workflow is `quiz`. `podcast-clips` and `release-radar` are scaffolded in the runner and intentionally blocked until authorized input sources and source metadata are provided.

<<<<<<< Updated upstream
> A modern, high-performance project built with **Node.js/TypeScript**. Orchestrated under the Antigravity protocol.
=======
## Features
>>>>>>> Stashed changes

- Multi-workflow entrypoint through `src/app/main.ts` and `src/app/workflow-runner.ts`.
- Current active workflow: `quiz`, with Telegram delivery and optional YouTube upload.
- Domain contracts for `VideoJob`, `GeneratedVideo`, `SourceRef`, `PublishTarget`, `AuditRecord`, and `WorkflowResult`.
- Job-scoped workspaces under `temp_assets/jobs/<jobId>` instead of one global temp directory.
- Rights policy layer that auto-approves owned/licensed sources and downgrades third-party sources to review-only modes.
- Audit ledger persisted as JSONL in `output/audit-ledger.jsonl`.

<<<<<<< Updated upstream
- **High Performance**: Optimized for speed and low resource usage using hardware acceleration and parallel processing.
- **Clean Architecture**: Built following strict Antigravity guidelines with a fully asynchronous core.
- **Automated**: Integrated with modern CI/CD and verification scripts.

## 🚀 Performance & Architecture

The project has been heavily optimized for throughput and reliability:
- **Asynchronous Engine**: All heavy operations (FFmpeg, TTS, I/O) are non-blocking, ensuring maximum CPU utilization.
- **Parallel Pipeline**: Asset preparation (TTS, background, metadata) runs in parallel using `Promise.all`.
- **Hardware Acceleration**: Automatic FFmpeg hardware acceleration (`-hwaccel auto`) for faster video encoding.
- **Full Coverage**: 100% test coverage ensured with an asynchronous-first testing suite.

## 🛠️ Tech Stack

- **Primary Technology**: Node.js 24+ (TypeScript)
- **Secondary Technology**: Python 3 (Edge-TTS)
- **Engine**: FFmpeg for video processing
- **AI**: Vercel AI SDK + Ollama
- **Architecture**: Modular and service-based.
=======
## Architecture

```text
src/
	app/
		main.ts
		workflow-runner.ts
	workflows/
		quiz.workflow.ts
		podcast-clips.workflow.ts
		release-radar.workflow.ts
	domain/
		quiz.ts
		video-job.ts
		generated-video.ts
		publish-target.ts
		source-ref.ts
		audit-record.ts
		workflow-result.ts
	config/
		env.ts
		workflows.ts
	services/
		policy/
		sources/
```

## Environment Variables
>>>>>>> Stashed changes

Required core variables:

- `OLLAMA_HOST`: Ollama base URL.
- `OLLAMA_MODEL`: Model used to generate quiz content and YouTube metadata.
- `WORKFLOW_ID`: One of `quiz`, `podcast-clips`, or `release-radar`. Default: `quiz`.
- `OUTPUT_DIR`: Output directory for rendered videos and audit ledger. Default: `output`.
- `WORKSPACE_ROOT`: Root directory for per-job temp assets. Default: `temp_assets/jobs`.

Publishing variables:

- `TELEGRAM_TOKEN`: Telegram bot token.
- `TELEGRAM_CHAT_ID`: Telegram destination chat.
- `ENABLE_YOUTUBE`: `true` or `false`.
- `YOUTUBE_PRIVACY_STATUS`: `public`, `private`, or `unlisted`.
- `YOUTUBE_CLIENT_ID`: OAuth2 client ID.
- `YOUTUBE_CLIENT_SECRET`: OAuth2 client secret.
- `YOUTUBE_REFRESH_TOKEN`: OAuth2 refresh token.
- `YOUTUBE_CHANNEL_NAME`: Optional channel name used in metadata generation.

## Commands

- `pnpm start`: Run the selected workflow.
- `pnpm generate`: Alias for the current entrypoint.
- `pnpm generate-daily`: Alias kept for compatibility with the quiz workflow.
- `pnpm lint`: TypeScript typecheck.
- `pnpm test`: Test suite.
- `pnpm test:coverage`: Coverage run with 90% thresholds.

## Guardrails

- `quiz` is treated as owned content and can auto-publish.
- `podcast-clips` and `release-radar` are scaffolded but blocked by default until authorized source inputs exist.
- Third-party reused content must carry source metadata and permission evidence before publication is allowed.
- Secret scanning runs in CI through `.github/workflows/secret-scan.yml`.

## Current Status

- `quiz`: implemented and upload-capable.
- `podcast-clips`: runner scaffold only.
- `release-radar`: runner scaffold only.

See [INSTALL.md](INSTALL.md) for local installation and [SETUP.md](SETUP.md) for operational setup.
