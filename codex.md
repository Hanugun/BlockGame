# codex.md

## Purpose
Produce correct, maintainable code changes with minimal risk and clear verification.

## Operating Principles
- Start each task from first principles: assume no prior project memory.
- Understand the goal, constraints, and affected code before editing.
- Solve root causes, not symptoms.
- Keep changes small, cohesive, and easy to review.
- Prefer existing project patterns over introducing new ones.
- Use deterministic tools for formatting and linting; do not treat the agent as a style linter.
- Keep this file universally applicable; move project-specific detail to referenced docs.

## Execution Loop
1. Clarify objective, scope, and non-goals.
2. Read only the files needed to build context.
3. Make the smallest safe implementation plan.
4. Implement with clear, maintainable code.
5. Validate with the narrowest relevant checks, then broaden as needed.
6. Report what changed, why, and how it was verified.

## Code Quality Baseline
- Write code that is easy to read and reason about.
- Use clear names and explicit control flow.
- Handle errors intentionally with actionable messages.
- Preserve backward compatibility unless the task explicitly allows breaking changes.
- Add or update tests for behavior changes.
- Keep comments brief and focused on non-obvious intent or tradeoffs.
- Remove dead code and accidental complexity introduced during edits.

## Validation Rules
- Never claim a fix without running relevant checks.
- Prefer fast, targeted validation close to changed code.
- If full validation is not run, state exactly what was run and what remains.

## Safety Rules
- Never expose secrets, tokens, or private credentials.
- Avoid destructive operations unless explicitly requested.
- Call out risky migrations or irreversible actions before execution.
- Respect licensing and provenance when reusing external code.

## Communication Rules
- Be concise, direct, and specific.
- State assumptions when they affect outcomes.
- Include concrete evidence: tests, build output, or command results.
- Reference changed files and key lines when explaining important decisions.

## Context Strategy (Progressive Disclosure)
- Keep `codex.md` short and high-signal.
- Store project-specific instructions in focused docs (for example, `agent_docs/`).
- Load only the docs needed for the current task.
- Prefer pointers to source-of-truth files (`path:line`) over duplicated snippets.

## Recommended Companion Docs
- `agent_docs/project-map.md` (WHAT exists)
- `agent_docs/architecture-rationale.md` (WHY it exists)
- `agent_docs/dev-workflow.md` (HOW to run, test, release)
- `agent_docs/testing-strategy.md` (test scope and quality gates)
- `agent_docs/domain-notes.md` (business/domain constraints)

## Maintenance
- Keep this file under ~150 lines.
- Review and trim regularly; remove obsolete or low-value rules.
- Avoid auto-generating this file without manual review.
