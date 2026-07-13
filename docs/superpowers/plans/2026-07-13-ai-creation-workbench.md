# AI Creation Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a top-level AI creation workbench that stores a local guest profile and OmniGen token, generates images through the backend, persists every task in history, and appends selected results to the existing image-processing flow.

**Architecture:** Put OmniGen protocol, history persistence, local profile sanitation, result downloading, and guarded deletion in a new `omnigen_service.py` module with standard-library unit tests. Keep HTTP routing in `server.py`; keep view state and interactions in the existing native-JavaScript `app/app.js`, while adding one top-level workbench section and one profile dialog to `app/index.html`.

**Tech Stack:** Python 3 standard library, Pillow, `BaseHTTPRequestHandler`, native JavaScript, HTML, CSS, `unittest`.

---

## File Map

- Create `omnigen_service.py`: OmniGen JSON-RPC client, local profile helpers, history store, result validation/download, and deletion guards.
- Create `tests/test_omnigen_service.py`: unit coverage for token redaction, MCP response parsing, history writes, safe deletion, and image validation.
- Modify `server.py`: instantiate the service, expose profile/token/model/task/history APIs, accept avatar data, and serve local result files through the existing `/work/` route.
- Modify `app/index.html`: add the `AI 创作` top-level module, media navigation, image-generation controls, task/history views, local-profile dialog, preview dialog, and delete dialog.
- Modify `app/app.js`: replace auth state with local profile state; add model loading, task submission/polling, history rendering/filtering, result selection, add-to-image, and deletion behavior.
- Modify `app/styles.css`: style the fixed AI workbench, compact result/history cards, profile modal, disabled video entry, queue, empty/error states, and responsive layouts.
- Modify `docs/GENERATION_RULES.zh-CN.md` only if implementation feedback reveals a rule not already captured in the approved design.

### Task 1: Build the local store and OmniGen client

**Files:**
- Create: `omnigen_service.py`
- Create: `tests/test_omnigen_service.py`

- [ ] **Step 1: Write failing tests for profile sanitation and token secrecy**

Add tests that create a temporary `work` directory, set a token, and assert that public profile payloads never return it:

```python
class LocalProfileTests(unittest.TestCase):
    def test_public_profile_never_returns_token(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            service.update_profile(name="本地创作者")
            service.set_token("secret-token")

            profile = service.public_profile()

            self.assertEqual(profile["name"], "本地创作者")
            self.assertTrue(profile["mcp"]["configured"])
            self.assertNotIn("token", json.dumps(profile).lower())
            self.assertNotIn("secret-token", json.dumps(profile))

    def test_empty_name_falls_back_to_guest(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            profile = service.update_profile(name="   ")
            self.assertEqual(profile["name"], "游客")
```

- [ ] **Step 2: Run the profile tests and verify they fail**

Run:

```powershell
.venv-ai\Scripts\python.exe -m unittest tests.test_omnigen_service.LocalProfileTests -v
```

Expected: `ModuleNotFoundError: No module named 'omnigen_service'`.

- [ ] **Step 3: Write failing tests for MCP parsing and redacted errors**

Add tests for both supported MCP payload forms and for exceptions that contain a token:

```python
class McpPayloadTests(unittest.TestCase):
    def test_parses_structured_content(self):
        payload = {"result": {"structuredContent": {"models": [{"id": "model-a"}]}}}
        self.assertEqual(parse_mcp_tool_payload(payload)["models"][0]["id"], "model-a")

    def test_parses_json_text_content(self):
        payload = {"result": {"content": [{"type": "text", "text": '{"status":"succeeded"}'}]}}
        self.assertEqual(parse_mcp_tool_payload(payload)["status"], "succeeded")

    def test_redacts_token_from_error(self):
        message = redact_secret("request failed for secret-token", "secret-token")
        self.assertEqual(message, "request failed for [REDACTED]")
```

- [ ] **Step 4: Implement the service foundations**

Create `omnigen_service.py` with these concrete constants and public interfaces:

```python
OMNIGEN_ENDPOINT = "https://omnigen.dianchu.cc/api/v1/mcp"
MCP_PROTOCOL_VERSION = "2024-11-05"
DEFAULT_PROFILE_NAME = "游客"
TERMINAL_TASK_STATUSES = {"succeeded", "failed", "canceled"}

def redact_secret(message: str, secret: str) -> str:
    return str(message or "").replace(secret, "[REDACTED]") if secret else str(message or "")

def parse_mcp_tool_payload(payload: dict) -> dict:
    result = payload.get("result") or {}
    if isinstance(result.get("structuredContent"), dict):
        return result["structuredContent"]
    for item in result.get("content") or []:
        if item.get("type") == "text" and item.get("text"):
            parsed = json.loads(item["text"])
            if isinstance(parsed, dict):
                return parsed
    error = payload.get("error") or {}
    raise ValueError(str(error.get("message") or "OmniGen returned no structured payload"))

class OmniGenService:
    def __init__(self, work_dir: Path, endpoint: str = OMNIGEN_ENDPOINT):
        self.work_dir = Path(work_dir).resolve()
        self.settings_path = self.work_dir / "settings.json"
        self.history_path = self.work_dir / "omnigen" / "history.json"
        self.results_dir = self.work_dir / "omnigen" / "results"
        self.profile_dir = self.work_dir / "profile"
        self.endpoint = endpoint
        self._lock = threading.RLock()
```

Implement `_read_json`, `_atomic_write_json`, `_read_settings`, `_write_settings`, `public_profile`, `update_profile`, `set_token`, `clear_token`, and `_token`. Preserve unrelated keys already present in `work/settings.json`; store the secret under `settings["omnigen"]["token"]`; return only `configured`, `validated`, `model_count`, and `last_error` in public payloads.

- [ ] **Step 5: Implement the JSON-RPC caller**

Add `_request_jsonrpc` and `call_tool` using `urllib.request.Request` and these headers:

```python
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
    "MCP-Protocol-Version": MCP_PROTOCOL_VERSION,
}
```

Use `initialize` before tool calls, then call `tools/call`. Apply a 60-second timeout, convert HTTP/network/JSON failures into `OmniGenError`, and call `redact_secret` before exposing the message.

When `Content-Type` contains `text/event-stream`, parse non-empty `data:` lines as JSON and use the first JSON-RPC object containing `result` or `error`. Add one test with `data: {"jsonrpc":"2.0","id":1,"result":{}}` so both transport forms remain supported.

- [ ] **Step 6: Run the focused tests**

Run:

```powershell
.venv-ai\Scripts\python.exe -m unittest tests.test_omnigen_service.LocalProfileTests tests.test_omnigen_service.McpPayloadTests -v
```

Expected: all tests pass.

- [ ] **Step 7: Commit the service foundation**

```powershell
git add omnigen_service.py tests/test_omnigen_service.py
git commit -m "Add OmniGen service foundation"
```

### Task 2: Persist generation history and guard local files

**Files:**
- Modify: `omnigen_service.py`
- Modify: `tests/test_omnigen_service.py`

- [ ] **Step 1: Write failing history and deletion tests**

Add tests for task creation, update, corrupted history backup, record-only deletion, file deletion, and directory traversal rejection:

```python
class HistoryStoreTests(unittest.TestCase):
    def test_create_and_update_history_record(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            record = service.create_record("prompt", "model-a", {"aspect_ratio": "1:1"})
            updated = service.update_record(record["id"], status="running", task_id="task-1")
            self.assertEqual(updated["status"], "running")
            self.assertEqual(service.list_history()[0]["task_id"], "task-1")

    def test_delete_file_refuses_path_outside_results(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            outside = root / "outside.png"
            outside.write_bytes(b"not-an-image")
            service = OmniGenService(root / "work")
            record = service.create_record("prompt", "model-a", {})
            service.update_record(record["id"], status="succeeded", local_path=str(outside))
            with self.assertRaises(ValueError):
                service.delete_records([record["id"]], delete_files=True)
            self.assertTrue(outside.exists())
```

- [ ] **Step 2: Run the history tests and verify they fail**

```powershell
.venv-ai\Scripts\python.exe -m unittest tests.test_omnigen_service.HistoryStoreTests -v
```

Expected: failures for missing history methods.

- [ ] **Step 3: Implement history persistence**

Add these methods with lock-protected, atomic writes. Use a JSON object with a top-level `records` array:

```python
def _read_history_unlocked(self) -> list[dict]:
    if not self.history_path.exists():
        return []
    try:
        payload = json.loads(self.history_path.read_text(encoding="utf-8"))
        return list(payload.get("records") or [])
    except (OSError, json.JSONDecodeError):
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        backup = self.history_path.with_name(f"history.corrupt-{stamp}.json")
        self.history_path.replace(backup)
        return []

def list_history(self) -> list[dict]:
    with self._lock:
        return [dict(record) for record in self._read_history_unlocked()]

def create_record(self, prompt: str, model: str, params: dict) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    record = {
        "id": str(uuid.uuid4()), "media_type": "image", "prompt": prompt,
        "model": model, "params": dict(params), "task_id": "",
        "status": "submitting", "progress": 0, "remote_url": "",
        "local_path": "", "local_url": "", "width": 0, "height": 0,
        "bytes": 0, "error": "", "created_at": now, "updated_at": now,
    }
    with self._lock:
        records = self._read_history_unlocked()
        records.insert(0, record)
        self._atomic_write_json(self.history_path, {"records": records})
    return dict(record)

def find_record(self, record_id: str) -> dict:
    record = next((item for item in self.list_history() if item.get("id") == record_id), None)
    if not record:
        raise ValueError("generation record not found")
    return record

def update_record(self, record_id: str, **changes) -> dict:
    with self._lock:
        records = self._read_history_unlocked()
        record = next((item for item in records if item.get("id") == record_id), None)
        if not record:
            raise ValueError("generation record not found")
        record.update(changes)
        record["updated_at"] = datetime.now(timezone.utc).isoformat()
        self._atomic_write_json(self.history_path, {"records": records})
        return dict(record)

def delete_records(self, record_ids: list[str], delete_files: bool) -> dict:
    requested = {str(record_id) for record_id in record_ids}
    with self._lock:
        records = self._read_history_unlocked()
        matches = [record for record in records if record.get("id") in requested]
        files = [Path(record["local_path"]).resolve() for record in matches if record.get("local_path")]
        if delete_files:
            results_root = self.results_dir.resolve()
            if any(not path.is_relative_to(results_root) for path in files):
                raise ValueError("refusing to delete a file outside AI results")
            for path in files:
                path.unlink(missing_ok=True)
        remaining = [record for record in records if record.get("id") not in requested]
        self._atomic_write_json(self.history_path, {"records": remaining})
    return {"deleted_ids": [record["id"] for record in matches], "files_deleted": delete_files}
```

Records use `id`, `media_type="image"`, `prompt`, `model`, `params`, `task_id`, `status`, `progress`, `remote_url`, `local_path`, `local_url`, `width`, `height`, `bytes`, `error`, `created_at`, and `updated_at`. On JSON decode failure, rename `history.json` to `history.corrupt-<timestamp>.json` before returning an empty list.

For file deletion, resolve the candidate path and require `candidate.is_relative_to(self.results_dir.resolve())`; reject every path outside that directory before deleting any record.

- [ ] **Step 4: Write failing download validation tests**

Test HTTP/HTTPS URL validation, unique task-based filenames, and Pillow verification by mocking `urlopen` with a valid in-memory PNG.

```python
def test_download_rejects_file_url(self):
    with tempfile.TemporaryDirectory() as directory:
        service = OmniGenService(Path(directory))
        with self.assertRaises(ValueError):
            service.download_result("record-1", "file:///tmp/result.png")
```

- [ ] **Step 5: Implement result download and task refresh**

Add `download_result(record_id, result_url)` and `refresh_task(record_id)`. Accept only `http` and `https`, cap the response at 32 MB, save to a temporary file, verify with Pillow, move atomically to `results/<record-id>.<extension>`, and return local URL, dimensions, and byte count. `refresh_task` calls `get_generation_task`; on success it downloads the first image result and updates history; on failure it stores a redacted error without deleting the record.

- [ ] **Step 6: Run the complete service test suite**

```powershell
.venv-ai\Scripts\python.exe -m unittest tests.test_omnigen_service -v
```

Expected: all tests pass.

- [ ] **Step 7: Commit history and file safety**

```powershell
git add omnigen_service.py tests/test_omnigen_service.py
git commit -m "Persist OmniGen generation history"
```

### Task 3: Expose local profile and OmniGen APIs

**Files:**
- Modify: `server.py`
- Modify: `tests/test_omnigen_service.py`

- [ ] **Step 1: Add service-level tests for model and generation normalization**

Mock `call_tool` and assert that `list_image_models()` normalizes model IDs/display names/capabilities and `submit_image()` creates history before returning:

```python
def test_submit_image_creates_history_before_returning(self):
    service.call_tool = Mock(return_value={"task_id": "task-1", "status": "queued"})
    record = service.submit_image("a crystal", "model-a", {"aspect_ratio": "1:1"})
    self.assertEqual(record["task_id"], "task-1")
    self.assertEqual(service.list_history()[0]["prompt"], "a crystal")
```

- [ ] **Step 2: Implement service operations used by HTTP routes**

Add `test_connection`, `list_image_models`, and `submit_image`. `test_connection` updates only validation metadata in settings. `submit_image` validates non-empty prompt/model, creates a `submitting` record before the remote call, and changes the same record to `queued` or `failed`.

- [ ] **Step 3: Wire the service into `server.py`**

Import `OmniGenService`, create `OMNIGEN_SERVICE = OmniGenService(WORK_DIR)`, and add GET routes:

```python
if parsed.path == "/api/local-profile":
    self.send_json({"ok": True, "profile": OMNIGEN_SERVICE.public_profile()})
    return
if parsed.path == "/api/omnigen/models":
    self.send_json({"ok": True, "models": OMNIGEN_SERVICE.list_image_models()})
    return
if parsed.path == "/api/omnigen/history":
    self.send_json({"ok": True, "history": OMNIGEN_SERVICE.list_history()})
    return
if parsed.path == "/api/omnigen/task":
    record_id = (parse_qs(parsed.query).get("id") or [""])[0]
    self.send_json({"ok": True, "record": OMNIGEN_SERVICE.refresh_task(record_id)})
    return
```

- [ ] **Step 4: Add POST and DELETE routes**

Add POST routes for `/api/local-profile`, `/api/omnigen/token`, `/api/omnigen/test`, `/api/omnigen/generate`, `/api/omnigen/history/delete`, and `/api/omnigen/history/refresh`. Add `do_DELETE` for `/api/omnigen/token`. Accept avatar as a bounded PNG/JPEG/WebP data URL, decode it, use Pillow to fit it inside 256 x 256, and save a PNG under `work/profile/avatar.png`.

Route bodies use these exact shapes:

```json
{"name":"游客","avatar_data_url":"data:image/png;base64,iVBORw0KGgo="}
{"token":"example-local-token"}
{"prompt":"像素风水晶","model":"model-id","params":{"aspect_ratio":"1:1","resolution":"1K"}}
{"ids":["record-id"],"delete_files":false}
```

- [ ] **Step 5: Remove the obsolete login route**

Delete `/api/one-click-login` handling and any backend helper used only by that route. Keep settings keys unrelated to the local profile intact.

- [ ] **Step 6: Verify backend syntax and tests**

```powershell
.venv-ai\Scripts\python.exe -m unittest tests.test_omnigen_service -v
.venv-ai\Scripts\python.exe -m py_compile server.py omnigen_service.py
```

Expected: tests pass and both files compile without output.

- [ ] **Step 7: Commit the HTTP API**

```powershell
git add server.py omnigen_service.py tests/test_omnigen_service.py
git commit -m "Expose local AI creation APIs"
```

### Task 4: Replace login UI with local profile settings

**Files:**
- Modify: `app/index.html`
- Modify: `app/app.js`
- Modify: `app/styles.css`

- [ ] **Step 1: Replace the account controls in HTML**

Replace login/logout buttons with one keyboard-accessible profile button containing `localProfileAvatar`, `accountName`, and `localProfileMcpStatus`. Add `localProfileDialog` with explicit close, avatar picker, name input, masked Token input, test, clear, and save buttons. The backdrop must not close the dialog; `Escape` and the close button do.

- [ ] **Step 2: Replace auth state and storage logic**

Remove `AUTH_STORAGE_KEY`, `restoreAuthFromStorage`, `persistAuth`, `handleOneClickLogin`, and `handleLogout`. Add:

```javascript
localProfile: {
  name: "游客",
  avatar_url: "",
  mcp: { configured: false, validated: false, model_count: 0, last_error: "" },
},
```

Implement `loadLocalProfile`, `renderLocalProfile`, `openLocalProfileDialog`, `closeLocalProfileDialog`, `saveLocalProfile`, `testOmniGenConnection`, and `clearOmniGenToken`. Token values must never be assigned to `state`, `localStorage`, session snapshots, or DOM attributes.

- [ ] **Step 3: Implement avatar preview and upload**

Use `FileReader.readAsDataURL` only for the current dialog preview and POST value. Reject files over 5 MB or outside PNG/JPEG/WebP before sending. Clear the reader result and file input after save or close.

- [ ] **Step 4: Bind profile dialog interactions**

Bind the profile button, close/save/test/clear controls, avatar input, and `Escape`. Use existing `apiJson` and `withBusy`; after Token changes, refresh the public profile and update the AI generate disabled state.

- [ ] **Step 5: Add compact profile styles**

Reuse the existing resource dialog visual language. Keep the top profile control width stable, crop the avatar with `object-fit: cover`, clamp long names, and show MCP state as a small status chip.

- [ ] **Step 6: Validate frontend syntax and manual profile behavior**

```powershell
node --check app\app.js
git diff --check -- app\index.html app\app.js app\styles.css
```

Manual checks: default guest renders; dialog does not close on backdrop click; name/avatar survive refresh; token remains absent from browser storage and `/api/local-profile` response.

- [ ] **Step 7: Commit the local profile UI**

```powershell
git add app/index.html app/app.js app/styles.css
git commit -m "Replace login with local profile settings"
```

### Task 5: Add the top-level AI creation workbench

**Files:**
- Modify: `app/index.html`
- Modify: `app/app.js`
- Modify: `app/styles.css`

- [ ] **Step 1: Add the module markup**

Add `moduleAiCreationButton` to `.module-switch` and `aiCreationModule` as a sibling `.module-view`. Inside it add:

- a media rail with active `图片`, disabled `视频（待接入）`, and `历史`;
- prompt textarea, model select, aspect ratio select, resolution select, and generate button;
- result canvas/grid with stable square previews;
- compact task queue;
- history toolbar with media/status filters, search, selection count, add-to-processing, and delete actions.

All icon-only buttons require `title` and `aria-label`. The disabled video item uses a real disabled button and has no panel target.

- [ ] **Step 2: Extend module switching**

Update `setActiveModule` so `aiCreation` is accepted, `aiCreationModule` is shown only when active, and the fixed-workbench scroll lock includes AI creation. Set the title to `AI 创作 - 灵帧工坊` and call `ensureAiCreationLoaded()` on first entry.

- [ ] **Step 3: Add AI creation state**

Add a bounded state object:

```javascript
aiCreation: {
  view: "image",
  loaded: false,
  models: [],
  selectedModel: "",
  history: [],
  selectedIds: new Set(),
  pollingIds: new Set(),
  filters: { media: "all", status: "all", query: "" },
},
```

Do not persist history or Token in the browser session snapshot; reload them from the backend.

- [ ] **Step 4: Implement model loading and capability controls**

Implement `loadOmniGenModels`, `selectedOmniGenModel`, `renderOmniGenModelOptions`, and `renderOmniGenCapabilityControls`. Populate aspect ratio and resolution from the selected model response; preserve a valid current value and otherwise choose the first supported value. Show compact price text when present.

- [ ] **Step 5: Implement workbench rendering and status states**

Implement `renderAiCreation`, `renderAiResultGrid`, `renderAiTaskQueue`, and `renderAiHistory`. Cover token missing, loading, empty, running, succeeded, failed, download failed, and local file missing states. Disable generation unless prompt, model, and configured Token are present.

- [ ] **Step 6: Add workbench CSS**

Use a four-column desktop grid matching the approved B layout: 64 px media rail, 280-320 px parameter panel, flexible result canvas, 260-300 px queue. At narrower widths, keep the media rail and stack the queue below the result canvas; never overlap top navigation or controls.

- [ ] **Step 7: Validate markup and responsive structure**

```powershell
node --check app\app.js
git diff --check -- app\index.html app\app.js app\styles.css
```

Use browser widths 1440, 1024, and 768 px. Expected: no text overflow, no nested cards, and only internal workbench areas scroll.

- [ ] **Step 8: Commit the workbench shell**

```powershell
git add app/index.html app/app.js app/styles.css
git commit -m "Add AI creation workbench shell"
```

### Task 6: Connect generation, polling, and persistent history

**Files:**
- Modify: `app/app.js`
- Modify: `app/index.html`

- [ ] **Step 1: Implement task submission**

Add `submitAiImageGeneration`. Trim and validate the prompt, build params only from visible supported controls, call `/api/omnigen/generate`, prepend the returned record to history, clear its selection state, render immediately, and start polling without waiting for the remote generation.

- [ ] **Step 2: Implement idempotent polling**

Add `pollAiGenerationRecord(recordId)` with one timer per record ID. Poll `/api/omnigen/task?id=<recordId>` every 2 seconds, replace the matching record, and stop only on `succeeded`, `failed`, `canceled`, or `download_failed`. Network failures back off to 5 seconds and do not resubmit generation.

- [ ] **Step 3: Restore unfinished tasks after refresh**

Add `loadAiHistory`; fetch `/api/omnigen/history`, render it, and start polling records in `submitting`, `queued`, or `running`. Call it on first AI module entry and after a successful connection test. This resumes unfinished polling after a page refresh without submitting a duplicate generation.

- [ ] **Step 4: Implement history filtering and selection**

Add `filteredAiHistory`, `toggleAiHistorySelection`, `selectAllVisibleAiHistory`, and `clearAiHistorySelection`. Selection must only include visible successful image records with available local files. Preserve selection outside the current filter but report total selection count accurately.

- [ ] **Step 5: Implement preview and retry**

Add an image preview dialog opened by button semantics. Failed cards expose “使用原参数重新生成”; download-failed cards expose “重试下载”, calling the task endpoint again without creating a new generation task.

- [ ] **Step 6: Validate generation with a mocked or real configured token**

Run the server, submit one 1K square image, refresh while it is running, and verify the same history record reaches success without duplicate tasks. Record the task ID in terminal notes only; do not commit remote URLs or Token values.

- [ ] **Step 7: Commit generation and history behavior**

```powershell
git add app/index.html app/app.js
git commit -m "Connect AI generation history"
```

### Task 7: Add result-to-processing and deletion flows

**Files:**
- Modify: `app/index.html`
- Modify: `app/app.js`
- Modify: `app/styles.css`

- [ ] **Step 1: Implement add-to-image processing**

Add `addAiRecordsToImageProcessing(recordIds)`. For each successful selected record, fetch `local_url`, convert the blob to a `File` using the history filename and MIME type, append through the existing `uploadImageFiles(files)` path, then switch to `image` and set the image workflow to `import` after the upload completes. Existing `state.imageImportFiles` must remain and new files append.

- [ ] **Step 2: Add batch action behavior**

Enable “加入图片处理” for selected successful images. From a result card, invoke the same function with one ID. Show one final status with added count and skipped count; clear only successfully transferred IDs from selection.

- [ ] **Step 3: Implement the two-mode delete dialog**

Add a dialog listing the selected count and two explicit actions: `仅删除记录` and `删除记录及本地文件`. The file-delete action opens a second confirmation state inside the same dialog before POSTing:

```json
{"ids":["record-id"],"delete_files":true}
```

Do not close on backdrop click. After success, remove returned IDs from history and selection, then rerender.

- [ ] **Step 4: Implement open-folder action**

Use the existing `/api/open-path` helper with the local result path or its parent directory. Disable the action when the local file is missing.

- [ ] **Step 5: Validate append and deletion semantics**

Manual sequence:

1. Import one existing image into 图片处理.
2. Select two AI history images and add them to processing.
3. Confirm the image import gallery contains three images.
4. Delete one history record only and confirm its file still exists.
5. Delete another record with its file and confirm only the AI results file is removed.
6. Attempt a service-level outside-directory delete and confirm it is rejected.

- [ ] **Step 6: Commit processing and deletion flows**

```powershell
git add app/index.html app/app.js app/styles.css
git commit -m "Connect AI results to image processing"
```

### Task 8: Complete end-to-end verification

**Files:**
- Modify only if verification finds a defect: `omnigen_service.py`, `server.py`, `app/index.html`, `app/app.js`, `app/styles.css`, `tests/test_omnigen_service.py`

- [ ] **Step 1: Run automated checks**

```powershell
.venv-ai\Scripts\python.exe -m unittest tests.test_omnigen_service -v
.venv-ai\Scripts\python.exe -m py_compile server.py omnigen_service.py
node --check app\app.js
git diff --check -- omnigen_service.py server.py app\index.html app\app.js app\styles.css tests\test_omnigen_service.py
```

Expected: all tests pass; compile and syntax commands emit no errors; diff check emits no whitespace errors.

- [ ] **Step 2: Probe local APIs without exposing the Token**

Start or restart the local server and verify HTTP 200 JSON responses for `/api/local-profile`, `/api/omnigen/history`, and `/api/omnigen/models`. Inspect output only for `configured` and model counts; never print the settings file or request Token.

- [ ] **Step 3: Run browser verification**

At `http://127.0.0.1:8894/app/index.html`, verify:

- top-level AI creation navigation and disabled video item;
- profile edit, avatar, masked token, test and clear behavior;
- generation submission, running state, refresh recovery, successful preview;
- history search/filter/multi-select;
- append to image processing;
- both deletion modes;
- desktop and narrow layouts without overlap.

- [ ] **Step 4: Inspect browser storage and network payloads**

Confirm the full Token is absent from localStorage, sessionStorage, page HTML, public profile response, history JSON responses, console errors, and persisted session snapshots.

- [ ] **Step 5: Fix only discovered defects and rerun affected checks**

For each defect, add or tighten a unit test when it affects backend data/security behavior, make the smallest correction, then rerun Task 8 Step 1 plus the failed manual scenario.

- [ ] **Step 6: Commit verification fixes if any**

```powershell
git add omnigen_service.py server.py app/index.html app/app.js app/styles.css tests/test_omnigen_service.py
git commit -m "Verify AI creation workflow"
```

Skip this commit when verification requires no code changes.
