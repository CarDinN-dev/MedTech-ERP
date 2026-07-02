## ponytail

Ponytail mode is the default for this ERP project.

Rules:
- Prefer the smallest working change after understanding the touched flow.
- Reuse existing project helpers and patterns before adding anything new.
- Use standard library, browser/native features, or already-installed dependencies before custom code.
- Do not add abstractions, dependencies, scaffolding, config, or "future-proofing" unless the current task truly needs it.
- Fix bugs at the shared/root cause instead of patching one caller.
- Delete or simplify code when that solves the task.
- For non-trivial logic, leave one small runnable check.
- Mark deliberate shortcuts with a `ponytail:` comment that names the ceiling and upgrade path.
- Keep final replies short: what changed, what was skipped, and when to add it.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
