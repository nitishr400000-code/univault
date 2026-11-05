# Domain Docs

Follow these rules when you explore this repo's domain documentation.

## Read before exploring

1. Read `GLOSSARY.md` at the repo root.
2. Read each ADR in `docs/adr/` that touches the area you will work in.

If the repo later adds `GLOSSARY-MAP.md` at the root, read the `GLOSSARY.md` for each context relevant to your topic. In that case, also read `src/<context>/docs/adr/` for context-scoped decisions.

If a file in this list is missing, continue without mentioning it. Do not suggest creating it. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates these files when a term or decision is resolved.

## File structure

Single-context layout (current):

```
/
├── GLOSSARY.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

Multi-context layout (applies when `GLOSSARY-MAP.md` exists at the root):

```
/
├── GLOSSARY-MAP.md
├── docs/adr/                          ← system-wide decisions
└── src/
    ├── ordering/
    │   ├── GLOSSARY.md
    │   └── docs/adr/                  ← context-specific decisions
    └── billing/
        ├── GLOSSARY.md
        └── docs/adr/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, or a test name), use the term as `GLOSSARY.md` defines it. Use the term the glossary prefers, not a synonym it avoids.

If the glossary lacks the concept you need, do one of two things: choose a term the project already uses, or note the gap for `/domain-modeling`.

## Surface ADR conflicts

If your output contradicts an existing ADR, state the conflict in your output. Do not override the ADR silently. Use this form:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_
