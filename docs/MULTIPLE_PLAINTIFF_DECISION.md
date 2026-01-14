# Multiple Plaintiff Decision - Separate Agreements

## ✅ Decision: Option A - Generate Separate Agreement Per Plaintiff

**Decision Made:** Each plaintiff will receive their own individual contingency agreement.

---

## Implementation Details

### File Organization

Documents will be organized by case ID:
```
output/contingency-agreements/
  └── CA-1234567890/
      ├── CA-1234567890-contingency-agreement-john-doe.docx
      ├── CA-1234567890-contingency-agreement-jane-smith.docx
      └── CA-1234567890-contingency-agreement-bob-johnson.docx
```

### Filename Format
`{caseId}-contingency-agreement-{firstname}-{lastname}.docx`

**Examples:**
- `CA-1234567890-contingency-agreement-john-doe.docx`
- `CA-1234567890-contingency-agreement-jane-smith.docx`

### Document Content

Each agreement contains:
- **Plaintiff Full Name**: Individual plaintiff's name (e.g., "John Doe")
- **Plaintiff Full Address**: Individual's address with unit (e.g., "123 Main St, Unit 4")
- **Plaintiff Email Address**: Individual's email
- **Plaintiff Phone Number**: Individual's phone (formatted)

### API Response

When generating documents, the API returns:
```json
{
  "success": true,
  "caseId": "CA-1234567890",
  "agreementCount": 3,
  "outputDirectory": "/output/contingency-agreements/CA-1234567890",
  "files": [
    {
      "plaintiffId": 1,
      "plaintiffName": "John Doe",
      "filename": "CA-1234567890-contingency-agreement-john-doe.docx",
      "filePath": "/output/contingency-agreements/CA-1234567890/CA-1234567890-contingency-agreement-john-doe.docx",
      "size": 45632
    },
    {
      "plaintiffId": 2,
      "plaintiffName": "Jane Smith",
      "filename": "CA-1234567890-contingency-agreement-jane-smith.docx",
      "filePath": "/output/contingency-agreements/CA-1234567890/CA-1234567890-contingency-agreement-jane-smith.docx",
      "size": 45789
    }
  ]
}
```

---

## Benefits of This Approach

### 1. **Individual Agreements**
- ✅ Each plaintiff has their own legally binding document
- ✅ No confusion about who signed what
- ✅ Easier to track individual agreements

### 2. **Personalized Information**
- ✅ Each agreement has the plaintiff's specific contact info
- ✅ Plaintiff's individual address, email, phone
- ✅ Professional and personalized experience

### 3. **Legal Clarity**
- ✅ Clear individual consent from each plaintiff
- ✅ Each plaintiff signs their own agreement
- ✅ No ambiguity about who is party to the agreement

### 4. **Flexible Delivery**
- ✅ Can email each plaintiff their own agreement
- ✅ Can provide individual download links
- ✅ Better privacy (plaintiffs don't see each other's info)

### 5. **Database Tracking**
- ✅ Can track signature status per plaintiff
- ✅ Can track delivery status per plaintiff
- ✅ Can manage follow-ups individually

---

## Technical Implementation

### Generation Process

1. **Load Template Once**: Template loaded into memory once for efficiency
2. **Loop Through Plaintiffs**: Generate one document per plaintiff
3. **Individual Data**: Each document gets plaintiff-specific information
4. **Organized Storage**: All agreements for a case stored in case-specific folder

### Performance Considerations

- **Template Reuse**: Template loaded once, reused for all plaintiffs
- **Parallel Processing**: Documents could be generated in parallel (future optimization)
- **Generation Time**: ~50-100ms per plaintiff
  - 1 plaintiff: ~50-100ms
  - 3 plaintiffs: ~150-300ms
  - 5 plaintiffs: ~250-500ms

### Error Handling

If generation fails for one plaintiff:
- ✅ Other plaintiffs' agreements still generated
- ✅ Detailed error logging per plaintiff
- ✅ Partial success reported to user

---

## Frontend Impact

### Progress Modal Updates

The progress modal will show:
- "Generating agreement 1 of 3..."
- "Generating agreement 2 of 3..."
- "Generating agreement 3 of 3..."
- "✅ 3 agreements generated successfully"

### Download Options

Users will see:
- **Option 1**: Download all agreements as ZIP file
- **Option 2**: Individual download links for each plaintiff
- **Option 3**: Email sent to each plaintiff with their agreement

---

## Email Notifications

When enabled, email notifications will:
1. Send to each plaintiff individually (if email provided)
2. Include link to their specific agreement
3. Personalized message with plaintiff's name

**Example:**
```
Subject: Your Contingency Fee Agreement from Lipton Legal

Dear John Doe,

Your contingency fee agreement has been prepared and is ready for your review.

[Download Your Agreement]

If you have any questions, please contact us at...

Best regards,
Lipton Legal Group
```

---

## Database Schema Updates

The `contingency_agreements` table stores:
- `document_url`: Path to the case folder containing all agreements
- `document_status`: Overall generation status

Future enhancement: Track individual plaintiff signature status
```sql
ALTER TABLE contingency_plaintiffs ADD COLUMN agreement_signed BOOLEAN DEFAULT FALSE;
ALTER TABLE contingency_plaintiffs ADD COLUMN agreement_signed_at TIMESTAMP;
```

---

## Future Enhancements

### Phase 1 (Current)
- ✅ Generate separate agreements per plaintiff
- ✅ Store in organized folder structure
- ✅ Basic download/email delivery

### Phase 2 (Future)
- [ ] E-signature integration (DocuSign, HelloSign)
- [ ] Track signature status per plaintiff
- [ ] Automatic reminders for unsigned agreements
- [ ] Download all as ZIP file

### Phase 3 (Future)
- [ ] Individual plaintiff portal access
- [ ] Digital signing workflow
- [ ] Countersigning by attorney
- [ ] Fully executed agreement storage

---

## Testing Checklist

- [ ] Single plaintiff: 1 agreement generated
- [ ] Multiple plaintiffs: N agreements generated (where N = plaintiff count)
- [ ] Each agreement has correct plaintiff information
- [ ] File naming follows convention
- [ ] Files organized in case-specific folder
- [ ] API response includes all generated files
- [ ] Progress modal updates correctly
- [ ] Email delivery works for individual plaintiffs
- [ ] Database status tracking accurate
- [ ] Error handling for partial failures

---

**Status:** ✅ Approved & Documented
**Implementation:** Ready for Phase 6
**Updated:** 2026-01-13
