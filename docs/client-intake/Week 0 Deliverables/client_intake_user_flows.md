# Client Intake System - User Flow Diagram

## Flow 1: Client Intake Submission (Happy Path)

```
[START]
   |
   v
[Client receives intake form link]
   |
   v
[Landing Page: Intake Form]
   |
   v
[Page 1/5 displayed with 5 sections]
   |
   v
[Client fills out fields]
   |
   +---> [Auto-save triggered] ---> [Data saved to IndexedDB]
   |                                        |
   v                                        v
[Client clicks "Next"]              [Continue auto-saving
   |                                 on each field blur]
   v
[Page 2/5 displayed]
   |
   v
[Client fills out Page 2]
   |
   v
[Client clicks "Next"]
   |
   v
[Page 3/5 displayed]
   |
   v
[Client fills out Page 3]
   |
   v
[Client clicks "Next"]
   |
   v
[Page 4/5 displayed]
   |
   v
[Client fills out Page 4]
   |
   v
[Client clicks "Next"]
   |
   v
[Page 5/5 displayed - Final Page]
   |
   v
[Client fills out Page 5]
   |
   v
[Client clicks "Submit"]
   |
   v
[System validates all required fields]
   |
   +---> [Validation fails?] --YES--> [Display error messages]
   |                                        |
   NO                                       v
   |                                [Scroll to first error]
   v                                        |
[Save to database]                          v
   |                                [Client fixes errors]
   v                                        |
[Create intake_submission record]           v
   |                                [Return to submit step]
   v
[Create 5 page_data records (JSONB)]
   |
   v
[Generate confirmation number]
   |
   v
[Send confirmation email to client]
   |
   v
[Display success screen]
   |
   v
[Optional: Show "Upload Documents" link]
   |
   v
[END - Submission Complete]
```

---

## Flow 2: Client Save & Resume (Intentional Save)

```
[START - Client on any page]
   |
   v
[Client clicks "Save & Exit" button]
   |
   v
[System saves current progress to IndexedDB]
   |
   v
[Generate unique session token (UUID)]
   |
   v
[Create temporary DB record with token]
   |  (table: saved_sessions)
   v
[Generate resume URL with token]
   |
   v
[Send email with resume link]
   |
   v
[Display modal: "Progress saved. Check email."]
   |
   v
[Client closes browser]
   |
   |
   +---> [Hours/Days Later]
   |
   v
[Client clicks resume link in email]
   |
   v
[System validates token]
   |
   +---> [Token expired?] --YES--> [Display: "Link expired. Start new submission."]
   |                                        |
   NO                                       v
   |                                      [END]
   v
[Load session data from database]
   |
   v
[Restore form to exact page/section]
   |
   v
[Client continues from where they left off]
   |
   v
[Return to Flow 1: Happy Path - Continue submission]
```

---

## Flow 3: Client Auto-Save Recovery (Browser Close)

```
[START - Client filling form]
   |
   v
[Auto-save active - data in IndexedDB]
   |
   v
[Client closes browser WITHOUT clicking "Save & Exit"]
   |
   v
[Data remains in IndexedDB only]
   |  (NOT in database)
   |
   +---> [Later - same device/browser]
   |
   v
[Client returns to intake form URL]
   |
   v
[System checks IndexedDB on page load]
   |
   +---> [Data found?] --NO--> [Display blank form]
   |                                   |
   YES                                 v
   |                                 [END]
   v
[Display banner: "Found unsaved progress. Resume?"]
   |
   v
[Client clicks "Yes, Resume"]
   |
   v
[Load data from IndexedDB]
   |
   v
[Restore form to saved state]
   |
   v
[Client continues filling form]
   |
   v
[Return to Flow 1: Happy Path]
```

---

## Flow 4: Attorney Portal - Search & Review Submissions

```
[START]
   |
   v
[Attorney navigates to portal URL]
   |
   v
[Login screen displayed]
   |
   v
[Attorney enters credentials]
   |
   v
[System authenticates attorney]
   |
   +---> [Auth fails?] --YES--> [Display error, retry]
   |                                    |
   NO                                   v
   |                              [Return to login]
   v
[Attorney Dashboard displayed]
   |
   v
[List of all intake submissions shown]
   |  (Table view: Client Name, Date, Practice Area, Status)
   |
   v
[Attorney clicks "Search/Filter" button]
   |
   v
[960×720px Search Modal opens]
   |  (Centered, split-pane layout)
   |
   v
[Left Pane: Filters displayed]
   |  - Date Range
   |  - Client Name
   |  - Practice Area
   |  - Status (New, Reviewing, Accepted, Declined)
   |
   v
[Attorney enters search criteria]
   |
   v
[System queries database]
   |
   v
[Right Pane: Results displayed]
   |  (List of matching submissions)
   |
   +---> [No results?] --YES--> [Display: "No submissions match. Try different filters."]
   |                                    |
   NO                                   v
   |                              [Attorney adjusts filters]
   v                                    |
[Attorney clicks on a submission]      v
   |                              [Return to search]
   v
[Modal closes]
   |
   v
[Full submission details displayed]
   |  (All 5 pages of client data)
   |
   v
[Attorney reviews information]
   |
   v
[Attorney takes action:]
   |
   +---> [Assign to self] ---> [Update assignment in DB]
   |
   +---> [Change status] ---> [Update status in DB]
   |
   +---> [Add notes] ---> [Save notes to DB]
   |
   +---> [Request documents] ---> [Send email to client with upload link]
   |
   v
[Return to Dashboard]
   |
   v
[END]
```

---

## Flow 5: Post-Submission Document Upload (Optional)

```
[START - After successful submission]
   |
   v
[Success screen displays]
   |
   v
[Optional section shown: "Upload Supporting Documents"]
   |
   v
[Client chooses action]
   |
   +---> [Upload Now] ----------+
   |                             |
   +---> [Skip for now]          |
         |                       |
         v                       v
   [Email sent with        [Upload interface
    upload link]            displayed inline]
         |                       |
         |                       v
         +---------------> [Client selects files]
                                 |
                                 v
                          [Client clicks "Upload"]
                                 |
                                 v
                          [Files uploaded to Cloud Storage]
                                 |
                                 v
                          [File references saved to DB]
                                 |  (linked to submission_id)
                                 v
                          [Confirmation: "Documents uploaded"]
                                 |
                                 v
                          [Attorney notified of new documents]
                                 |
                                 v
                               [END]
```

---

## Flow 6: Error Handling - Network Failure During Submit

```
[START - Client clicks "Submit"]
   |
   v
[System attempts to save to database]
   |
   v
[Network request fails]
   |  (No internet, server error, timeout)
   |
   v
[Data remains in IndexedDB - NOT LOST]
   |
   v
[Display error message:]
   |  "Submission failed. Your data is saved locally."
   |  "Please check your connection and try again."
   |
   v
[Display "Retry Submit" button]
   |
   v
[Client waits for connection to restore]
   |
   v
[Client clicks "Retry Submit"]
   |
   v
[System attempts submission again]
   |
   +---> [Success?] --YES--> [Continue to success screen]
   |                                |
   NO                               v
   |                              [END]
   v
[Display error again]
   |
   v
[Allow retry again OR save & resume]
   |
   v
[END - Client can resume later]
```

---

## Flow 7: Resume Link - Expired Token

```
[START - Client clicks resume link]
   |
   v
[System extracts token from URL]
   |
   v
[System queries database for token]
   |
   +---> [Token not found?] --YES--> [Display: "Invalid link"]
   |                                        |
   |                                        v
   |                                [Offer: "Start new submission"]
   |                                        |
   |                                        v
   |                                      [END]
   v
[Token found - check expiration]
   |
   +---> [Token expired?] --YES--> [Display: "Link expired (30 days)"]
   |      (> 30 days old)                  |
   |                                       v
   NO                               [Offer: "Start new submission"]
   |                                       |
   v                                       v
[Load session data]                     [END]
   |
   v
[Restore form state]
   |
   v
[Client continues from saved point]
   |
   v
[Return to Flow 1: Happy Path]
```

---

## Summary of Key Decision Points

### Client Flows:
1. **Submit immediately** → Happy Path (Flow 1)
2. **Save & Resume** → Intentional save with email link (Flow 2)
3. **Close browser** → Auto-save recovery (Flow 3)
4. **Network failure** → Retry mechanism (Flow 6)
5. **Upload documents** → Optional post-submission (Flow 5)

### Attorney Flows:
1. **Login** → Dashboard
2. **Search submissions** → Filter modal (Flow 4)
3. **Review details** → Full submission view
4. **Take actions** → Assign, status update, notes, request docs

### Error Scenarios:
1. Form validation errors → Inline messages, scroll to error
2. Network failures → Retry with IndexedDB backup
3. Expired tokens → Clear messaging, offer fresh start
4. No search results → Clear filters or adjust criteria

---

## System States

### Client Submission States:
- **Draft (In Progress)** - Client is filling, not yet submitted
- **Saved (Temporary)** - Client used "Save & Exit", has resume token
- **Submitted** - Client completed and submitted form
- **Documents Uploaded** - Client added supporting files post-submission

### Attorney Review States:
- **New** - Submitted, not yet reviewed
- **Reviewing** - Attorney actively reviewing
- **Accepted** - Attorney accepted case
- **Declined** - Attorney declined case
- **Archived** - Closed/completed

---

## Technical Notes for Flow Diagram

### Auto-Save Behavior:
- Trigger: `onBlur` event on form fields
- Debounce: 2 seconds
- Storage: IndexedDB (primary), localStorage (fallback)
- No network call until "Save & Exit" or "Submit"

### Token Generation:
- Format: UUID v4
- Expiration: 30 days from creation
- Storage: `saved_sessions` table in PostgreSQL
- Single-use: Optional (can be reused until expiration)

### Modal Specifications:
- Size: 960px × 720px
- Position: Centered on screen
- Backdrop: Semi-transparent overlay
- Layout: Split-pane (40% left filters, 60% right results)
- Responsive: Desktop-first, mobile considerations for Phase 2

---

## End of Flow Diagram Document
