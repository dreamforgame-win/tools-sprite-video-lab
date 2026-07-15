# Repository Instructions

- Before generating or modifying UI, interactions, resource-management behavior, or local-file workflow, read and follow `docs/GENERATION_RULES.zh-CN.md`.
- When repeated user feedback reveals a broader rule, update `docs/GENERATION_RULES.zh-CN.md` first, then adjust implementation.
- This worktree (`.worktrees/ai-creation-workbench`) is the main development workspace going forward.
- The active development page is `http://127.0.0.1:8895/app/index.html`, served from this worktree. Treat `http://127.0.0.1:8894/app/index.html` as archived/stable reference only.
- Keep generated UI consistent with the existing dense tool/workbench style. Avoid landing-page composition and decorative-only elements.
- Validate frontend changes with `node --check app\app.js`.
- Validate `server.py` changes with `.venv-ai\Scripts\python.exe -m py_compile server.py`.

