# Quick Demo Verification Checklist
## 5-Minute Component Verification

**Demo Page**: `shared/components/demo.html` (should be open in your browser)

---

## ✅ Quick Visual Check (2 minutes)

### IssueCheckboxGroup (Section 1)

Look at the grid of checkboxes:
- [ ] ✓ Checkboxes display in a grid (3 columns on desktop)
- [ ] ✓ "Pigeons" and "Bats" show blue background (pre-checked)
- [ ] ✓ Click an unchecked box → background turns blue
- [ ] ✓ Click a checked box → background turns white
- [ ] ✓ Hover over checkbox → background turns light gray

**Result**: □ Pass  □ Fail

---

### IssueCategorySection (Section 2)

Look at the "Vermin/Pests" expanded section:
- [ ] ✓ Master checkbox is checked
- [ ] ✓ Shows "(2 selected)" count
- [ ] ✓ Blue border around entire section
- [ ] ✓ Content area is visible with checkboxes
- [ ] ✓ Form fields below (Details, First Noticed, Severity, Repair History)
- [ ] ✓ Click collapse button (▼) → content collapses
- [ ] ✓ Click expand button (▶) → content expands

Look at the "Insect Infestation" collapsed section:
- [ ] ✓ Master checkbox is unchecked
- [ ] ✓ Gray border (not blue)
- [ ] ✓ No content visible
- [ ] ✓ No expand button
- [ ] ✓ Click master checkbox → section expands

**Result**: □ Pass  □ Fail

---

## ✅ Responsive Check (1 minute)

1. **Desktop** (current size):
   - [ ] ✓ Grid shows 3 columns

2. **Tablet** (resize to ~800px width):
   - [ ] ✓ Grid shows 2 columns
   - [ ] ✓ Layout still looks good

3. **Mobile** (resize to ~400px width):
   - [ ] ✓ Grid shows 1 column
   - [ ] ✓ Everything readable
   - [ ] ✓ No horizontal scroll

**Tip**: In Chrome, press `Cmd+Opt+I` → click device icon → select "Responsive"

**Result**: □ Pass  □ Fail

---

## ✅ Keyboard Navigation (1 minute)

1. Click in address bar (or refresh page)
2. Press `Tab` repeatedly:
   - [ ] ✓ Focus moves to first checkbox
   - [ ] ✓ Focus outline visible (blue ring)
   - [ ] ✓ Can tab through all checkboxes
   - [ ] ✓ Can tab to master checkbox
   - [ ] ✓ Can tab to expand button
   - [ ] ✓ Can tab to form fields

3. On a checkbox, press `Space`:
   - [ ] ✓ Checkbox toggles on/off

**Result**: □ Pass  □ Fail

---

## ✅ Form Inputs (1 minute)

In the expanded "Vermin/Pests" section:

1. **Details Textarea**:
   - [ ] ✓ Can click and type
   - [ ] ✓ Text wraps properly
   - [ ] ✓ Blue border on focus

2. **First Noticed Date**:
   - [ ] ✓ Date picker opens
   - [ ] ✓ Can select a date

3. **Severity Dropdown**:
   - [ ] ✓ Dropdown opens
   - [ ] ✓ Shows 4 options
   - [ ] ✓ Can select "Severe"

4. **Repair History**:
   - [ ] ✓ Can type text

**Result**: □ Pass  □ Fail

---

## 📊 Overall Verification

| Check | Result |
|-------|--------|
| IssueCheckboxGroup | □ Pass □ Fail |
| IssueCategorySection | □ Pass □ Fail |
| Responsive | □ Pass □ Fail |
| Keyboard Navigation | □ Pass □ Fail |
| Form Inputs | □ Pass □ Fail |

---

## ✅ Final Decision

**If all Pass**: ✅ **APPROVED** - Ready for Phase 3

**If any Fail**: Review the issue, check browser console for errors, refer to full testing guide at `shared/TESTING.md`

---

## Quick Troubleshooting

### Issue: Demo page blank
- **Fix**: Refresh page, check browser console for errors

### Issue: Styles don't match
- **Fix**: Hard refresh with `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

### Issue: Checkboxes don't work
- **Fix**: Check browser console, JavaScript might be disabled

### Issue: Wrong number of columns
- **Fix**: Resize window, check actual width matches breakpoint

---

## Next Steps After Verification

1. ✅ **Mark verification complete**
2. ✅ **Document any issues found** (if any)
3. ✅ **Proceed to Phase 3** - Refactor Intake Form

---

**Estimated Time**: 5 minutes
**Last Updated**: 2025-11-21
