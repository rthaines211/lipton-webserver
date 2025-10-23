# Dropbox Upload Code Flow Analysis

**Question:** Is the Python pipeline using `webhook_sender.py` or `dropbox-service.js`?

**Answer:** It uses **`webhook_sender.py`** (Python module), which internally calls **`dropbox_service.py`** (Python module). The Node.js `dropbox-service.js` is **NOT involved** in the Python pipeline.

---

## Code Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Submits Form                             │
│                  (Node.js Frontend)                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│  Node.js Server (server.js)                                      │
│  • Receives form data                                            │
│  • Saves to PostgreSQL                                           │
│  • Calls Python pipeline API                                     │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP POST
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│  Python Pipeline Service                                         │
│  api/routes.py:279                                               │
│                                                                  │
│  webhook_summary = send_all_sets_with_progress(                 │
│      phase5_output,                                             │
│      webhook_config,                                            │
│      case_id,                                                   │
│      verbose=True                                               │
│  )                                                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│  src/phase5/webhook_sender.py                                    │
│  Lines 386-502: send_all_sets_with_progress()                   │
│                                                                  │
│  for dataset in phase5_output.get('datasets', []):              │
│      for set_data in dataset.get('sets', []):                   │
│          result = send_set_to_webhook(set_data, config)         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│  src/phase5/webhook_sender.py                                    │
│  Lines 92-329: send_set_to_webhook()                            │
│                                                                  │
│  1. POST to Docmosis webhook                                     │
│  2. Receive .docx file                                           │
│  3. Save to webhook_documents/                                   │
│  4. ⭐ UPLOAD TO DROPBOX ⭐                                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│  src/phase5/webhook_sender.py                                    │
│  Lines 261-270: Dropbox Upload Logic                            │
│                                                                  │
│  if DROPBOX_AVAILABLE and dropbox_service.is_enabled():         │
│      dropbox_result = dropbox_service.upload_file(              │
│          saved_file,                                            │
│          response.content                                       │
│      )                                                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│  src/utils/dropbox_service.py                                    │
│  Lines 198-285: upload_file()                                   │
│                                                                  │
│  1. Map local path to Dropbox path                              │
│  2. Create parent folders                                       │
│  3. Upload file with _dbx_client.files_upload()                 │
│  4. Return success/failure result                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Two Separate Dropbox Services

### 1. **Node.js Service** (`dropbox-service.js`) ❌ NOT USED
- **Location:** `/Users/ryanhaines/Desktop/Lipton Webserver/dropbox-service.js`
- **Purpose:** Originally intended for Node.js server uploads
- **Status:** **DISABLED** (commented out in server.js:1653-1679)
- **Usage:** None - code is commented out

**Evidence in server.js:**
```javascript
// Line 1653-1679
// ============================================================
// DROPBOX UPLOAD (TEMPORARILY DISABLED)
// ============================================================
// Temporarily disabled to fix deployment issues (2025-10-22)
/*
if (dropboxService.isEnabled()) {
    console.log(`☁️  Uploading to Dropbox: ${filename}`);
    dropboxService.uploadFile(filename)
        // ... [commented out]
}
*/
```

### 2. **Python Service** (`dropbox_service.py`) ✅ USED
- **Location:** `/Users/ryanhaines/Desktop/Lipton Webserver/normalization work/src/utils/dropbox_service.py`
- **Purpose:** Upload generated .docx documents from Python pipeline
- **Status:** **ACTIVE** (but currently not working)
- **Usage:** Called from `webhook_sender.py` after each document generation

---

## Detailed Code Flow

### Step 1: Import Dropbox Module
**File:** `src/phase5/webhook_sender.py` (lines 14-25)

```python
# Import Dropbox service for cloud backup
try:
    from src.utils import dropbox_service
    DROPBOX_AVAILABLE = True
except ImportError:
    try:
        from utils import dropbox_service
        DROPBOX_AVAILABLE = True
    except ImportError:
        DROPBOX_AVAILABLE = False
        print("⚠️  Dropbox service not available")
```

**Current issue:** This import is failing silently, setting `DROPBOX_AVAILABLE = False`

---

### Step 2: Generate Document
**File:** `src/phase5/webhook_sender.py` (lines 211-260)

```python
# Send POST request to Docmosis webhook
response = requests.post(
    webhook_url,
    json=payload,
    headers={'Content-Type': 'application/json'},
    timeout=timeout
)

# Save document locally
if response.status_code == 200:
    output_dir = resolve_output_directory(base_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    with open(candidate, 'wb') as f:
        f.write(response.content)

    saved_file = str(candidate)
```

**This part works:** Documents are being generated successfully.

---

### Step 3: Upload to Dropbox
**File:** `src/phase5/webhook_sender.py` (lines 261-270)

```python
# Upload to Dropbox (non-blocking, errors logged but don't fail the request)
if DROPBOX_AVAILABLE and dropbox_service.is_enabled():
    try:
        dropbox_result = dropbox_service.upload_file(saved_file, response.content)
        if dropbox_result['success']:
            print(f"✅ Dropbox upload successful: {dropbox_result['dropbox_path']}")
        else:
            print(f"⚠️  Dropbox upload failed: {dropbox_result.get('error', 'Unknown error')}")
    except Exception as dropbox_error:
        print(f"❌ Dropbox upload error: {dropbox_error}")
```

**Current issue:** `DROPBOX_AVAILABLE` is `False`, so this entire block is skipped.

---

### Step 4: Dropbox Upload Implementation
**File:** `src/utils/dropbox_service.py` (lines 198-285)

```python
def upload_file(local_file_path: str, file_content: Optional[bytes] = None):
    """Upload a file to Dropbox, preserving folder structure."""

    # Map local path to Dropbox path
    dropbox_path = map_local_path_to_dropbox(local_file_path)
    # Example: webhook_documents/Address/HoH/Discovery/SROGs/file.docx
    #       → /Current Clients/Address/HoH/Discovery Propounded/SROGs/file.docx

    # Ensure parent folders exist
    ensure_parent_folders_exist(dropbox_path)

    # Upload file
    _dbx_client.files_upload(
        file_content,
        dropbox_path,
        mode=WriteMode('overwrite'),
        autorename=False,
        mute=False
    )

    logger.info(f"☁️  Uploaded to Dropbox: {local_file_path} → {dropbox_path}")
```

**Current issue:** This code never runs because `_dbx_client` is `None` (module initialization failed).

---

## Why It's Not Working

### The Failure Chain

1. **Container starts** → `dropbox_service.py` should initialize
2. **Module initialization code runs** (lines 52-69):
   ```python
   _dbx_client = None
   if DROPBOX_CONFIG['enabled'] and DROPBOX_CONFIG['access_token']:
       try:
           _dbx_client = dropbox.Dropbox(DROPBOX_CONFIG['access_token'])
           _dbx_client.users_get_current_account()
           logger.info(f"✅ Dropbox service initialized")  # <-- Should see this
   ```
3. **Expected log message:** `✅ Dropbox service initialized`
4. **Actual log message:** Nothing (module init fails silently)

### Result

- `_dbx_client` remains `None`
- `dropbox_service.is_enabled()` returns `False`
- Upload code is skipped
- No logs, no errors, no uploads

---

## Path Mapping Example

When a document is generated, it follows this path:

### Local Path (in container)
```
webhook_documents/
└── 1331 Yorkshire Place NW/          # Property address (unit stripped)
    └── Clark Kent/                    # Head of household name
        └── Discovery Propounded/      # Fixed folder name
            ├── SROGs/                 # Document type folder
            │   └── Clark Kent vs ABC Corp - SROGs Set 1.docx
            ├── PODS/
            │   └── Clark Kent vs ABC Corp - PODs Set 1.docx
            └── ADMISSIONS/
                └── Clark Kent vs ABC Corp - Admissions Set 1.docx
```

### Dropbox Path (after upload)
```
/Current Clients/                      # Base path (from env var)
└── 1331 Yorkshire Place NW/           # Same structure
    └── Clark Kent/
        └── Discovery Propounded/
            ├── SROGs/
            │   └── Clark Kent vs ABC Corp - SROGs Set 1.docx
            ├── PODS/
            │   └── Clark Kent vs ABC Corp - PODs Set 1.docx
            └── ADMISSIONS/
                └── Clark Kent vs ABC Corp - Admissions Set 1.docx
```

The `map_local_path_to_dropbox()` function handles this conversion automatically.

---

## Configuration

### Environment Variables (Python Service)
```bash
DROPBOX_ENABLED=true
DROPBOX_BASE_PATH=/Current Clients
DROPBOX_LOCAL_OUTPUT_PATH=webhook_documents
DROPBOX_CONTINUE_ON_FAILURE=true
DROPBOX_ACCESS_TOKEN=[from secret: dropbox-token]
```

### Webhook Config (webhook_config.json)
```json
{
    "webhook_url": "https://tornado-vm.uc.r.appspot.com/api/render",
    "access_key": "[secret]",
    "save_documents": true,
    "output_directory": "webhook_documents"
}
```

---

## Timeline of a Document Upload

```
00:00.000 - User submits form
00:00.100 - Node.js receives, saves to DB
00:00.150 - Node.js calls Python pipeline API
00:00.200 - Python pipeline starts (Phase 1-5)
00:01.000 - Phase 5 complete, datasets ready
00:01.010 - webhook_sender.send_all_sets_with_progress() called
00:01.020 - First set sent to Docmosis webhook
00:02.500 - Docmosis returns .docx file (20KB)
00:02.501 - File saved to: webhook_documents/Address/HoH/.../file.docx
00:02.502 - ⭐ Dropbox upload should happen here ⭐
00:02.502 - ❌ But skipped because DROPBOX_AVAILABLE=False
00:02.503 - Next set processed...
00:06.000 - All sets complete
00:06.001 - Progress marked as complete with URL=""
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
           URL is empty because no Dropbox link was created
```

---

## Summary

### ✅ What's Working
1. Form submission to Node.js
2. Python pipeline execution (all 5 phases)
3. Docmosis webhook calls
4. Document generation (3-4 .docx files per form)
5. Local file storage in `webhook_documents/`

### ❌ What's Not Working
1. **`dropbox_service.py` module initialization**
   - Never sees `✅ Dropbox service initialized` in logs
   - `_dbx_client` remains `None`
   - `is_enabled()` returns `False`

2. **Upload code execution**
   - Lines 261-270 in `webhook_sender.py` are skipped
   - No upload attempts logged
   - No success/failure messages

3. **Shared link generation**
   - Lines 463-492 in `webhook_sender.py` never execute
   - Completion URL is empty: `"URL: "` (should be Dropbox link)

### 🎯 The Fix
Force rebuild the Python container with `--no-cache` to ensure:
- Fresh `pip install dropbox>=12.0.0`
- Proper module initialization
- `_dbx_client` properly initialized
- Upload code executes correctly

---

## References

**Python Files:**
- `api/routes.py:279` - Calls webhook sender
- `src/phase5/webhook_sender.py:14-25` - Import dropbox module
- `src/phase5/webhook_sender.py:261-270` - Upload to Dropbox
- `src/utils/dropbox_service.py:52-69` - Module initialization
- `src/utils/dropbox_service.py:198-285` - Upload implementation

**Node.js Files (NOT USED):**
- `server.js:1653-1679` - Commented out Dropbox code
- `dropbox-service.js` - Not called by Python pipeline

---

**Bottom Line:** The Python pipeline uses its own separate `dropbox_service.py` module, which is completely independent from the Node.js `dropbox-service.js`. The Node.js service isn't involved at all in the Python pipeline's document uploads.
