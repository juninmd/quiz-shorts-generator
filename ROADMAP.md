# Roadmap

## Current State

<<<<<<< Updated upstream
## 🚧 Phase 2: Refinement & Depth ✅
- [x] **Feature Expansion**: Implement core business logic and missing functionalities.
- [x] **Testing Suite**: Increase test coverage to at least 80%.
- [x] **Optimization**: Improve performance and reduce technical debt.

## 🚀 Phase 3: Polish & Scale (Current)
- [ ] **CI/CD Integration**: Fully automated release pipelines.
- [ ] **Advanced Features**: Integration with external APIs and AI tools.
- [ ] **Global Launch**: Prepare for production release and community use.
=======
- [x] Workflow runner extracted from the old monolithic `src/index.ts`.
- [x] `quiz` workflow moved to `src/workflows/quiz.workflow.ts`.
- [x] Domain contracts added for jobs, sources, publication, audit, and results.
- [x] Job-scoped temp workspaces and audit ledger implemented.
- [x] CI aligned with typecheck, tests, secret scan, and correct artifact path.

## Near Term
>>>>>>> Stashed changes

- [ ] Replace the scaffold-only `podcast-clips` workflow with authorized source ingestion, transcription, clip scoring, and vertical render.
- [ ] Replace the scaffold-only `release-radar` workflow with official/licensed release sources and a dedicated vertical template.
- [ ] Add a safe `preflight` command that validates external binaries and env without publishing.
- [ ] Reduce the remaining direct env access inside legacy service modules.

## Medium Term

- [ ] Add YouTube draft/unlisted defaults for non-owned content flows.
- [ ] Introduce richer audit entries with source hashes, platform IDs, and workflow versions.
- [ ] Expand publishing targets only after source and rights metadata are stable.

## Explicit Non-Goals

- [ ] Automatic repost of third-party viral clips without source authorization.
- [ ] Monetization-oriented reused-content automation without commentary or transformation.
- [ ] Public publication of third-party media without proof of rights.
