# Repository Instructions

- Before generating or modifying UI, interactions, resource-management behavior, or local-file workflow, read and follow `docs/GENERATION_RULES.zh-CN.md`.
- When repeated user feedback reveals a broader rule, update `docs/GENERATION_RULES.zh-CN.md` first, then adjust implementation.
- Keep generated UI consistent with the existing dense tool/workbench style. Avoid landing-page composition and decorative-only elements.
- Validate frontend changes with `node --check app\app.js`.
- Validate `server.py` changes with `.venv-ai\Scripts\python.exe -m py_compile server.py`.

