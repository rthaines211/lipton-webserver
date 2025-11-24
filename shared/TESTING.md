# Shared Components Testing Guide

This document provides comprehensive testing procedures for the shared UI components used by both client intake and document generation systems.

## Quick Start

1. **Open Demo Page**: `open shared/components/demo.html`
2. **Follow Checklists**: Use this document as a testing guide
3. **Document Results**: Mark items as complete in this file

---

## Table of Contents

1. [Visual Testing](#visual-testing)
2. [Responsive Testing](#responsive-testing)
3. [Accessibility Testing](#accessibility-testing)
4. [Cross-Browser Testing](#cross-browser-testing)
5. [Performance Testing](#performance-testing)
6. [Integration Testing](#integration-testing)

---

## Visual Testing

### IssueCheckboxGroup Component

**Test File**: `shared/components/demo.html` (Section 1)

#### Layout Verification

- [ ] Checkboxes display in grid format
- [ ] Grid has proper spacing (0.75rem gap)
- [ ] Checkbox and text align properly
- [ ] Long text wraps correctly without breaking layout
- [ ] Grid columns: 3 on desktop, 2 on tablet, 1 on mobile

#### Visual States

- [ ] **Default State**
  - [ ] Border: 1px solid #e5e7eb
  - [ ] Background: white
  - [ ] Text color: #374151

- [ ] **Hover State** (non-disabled)
  - [ ] Background changes to #f9fafb
  - [ ] Border changes to #d1d5db
  - [ ] Cursor shows pointer
  - [ ] Transition is smooth (0.2s)

- [ ] **Checked State**
  - [ ] Background: #eff6ff (light blue)
  - [ ] Border: #3b82f6 (blue)
  - [ ] Text color: #1e40af (dark blue)
  - [ ] Text weight: 500 (medium)

- [ ] **Disabled State**
  - [ ] Opacity: 0.5
  - [ ] Cursor: not-allowed
  - [ ] No hover effects

#### Edge Cases

- [ ] Empty grid (no options)
- [ ] Single option
- [ ] Many options (15+) - scrolling works
- [ ] Very long option names wrap properly
- [ ] Special characters in labels display correctly

---

### IssueCategorySection Component

**Test File**: `shared/components/demo.html` (Section 2)

#### Collapsed State

- [ ] Shows master checkbox + category title
- [ ] No expand button when not checked
- [ ] Border: 1px solid #e5e7eb
- [ ] Background: white
- [ ] Proper padding (1rem)

#### Expanded State

- [ ] Expand button appears when checked
- [ ] Content area expands smoothly
- [ ] Border changes to blue (#3b82f6)
- [ ] Shadow appears: `0 1px 3px rgba(59, 130, 246, 0.1)`
- [ ] Selection count displays correctly (e.g., "(2 selected)")

#### Master Checkbox Behavior

- [ ] Clicking checkbox expands section
- [ ] Unchecking collapses section
- [ ] Visual feedback on hover
- [ ] Focus state visible
- [ ] Keyboard accessible (Space toggles)

#### Expand/Collapse Button

- [ ] Arrow icon rotates 180° when expanded
- [ ] Smooth rotation animation (0.2s)
- [ ] Hover changes color to blue
- [ ] Accessible via keyboard (Enter/Space)
- [ ] ARIA attributes correct (`aria-expanded`)

#### Options Grid (within section)

- [ ] Uses IssueCheckboxGroup component
- [ ] Grid displays properly when expanded
- [ ] All checkbox states work
- [ ] Updates selection count on change

#### Metadata Fields (Intake-specific)

- [ ] **Details Textarea**
  - [ ] 3 rows minimum
  - [ ] Resizable vertically
  - [ ] Placeholder text visible
  - [ ] Focus state: blue border + shadow
  - [ ] Text wraps properly

- [ ] **First Noticed Date**
  - [ ] Date picker works
  - [ ] Format: YYYY-MM-DD
  - [ ] Can select any valid date
  - [ ] Focus state visible

- [ ] **Severity Dropdown**
  - [ ] Shows 4 options (blank, mild, moderate, severe)
  - [ ] Can select each option
  - [ ] Selected value displays
  - [ ] Focus state visible

- [ ] **Repair History Textarea**
  - [ ] 2 rows minimum
  - [ ] Same styling as details field
  - [ ] Works independently

#### Edge Cases

- [ ] Category with no options selected
- [ ] Category with all options selected
- [ ] Very long category name wraps
- [ ] Very long details text (500+ chars)
- [ ] Empty metadata fields

---

## Responsive Testing

### Testing Procedure

1. Open Chrome DevTools: `Cmd+Opt+I` (Mac) or `F12` (Windows)
2. Toggle device toolbar: `Cmd+Shift+M` (Mac) or `Ctrl+Shift+M` (Windows)
3. Test each breakpoint below
4. Verify layout adjustments

### Breakpoints to Test

#### Desktop (> 1024px)

- [ ] **1920×1080** (Full HD)
  - [ ] Checkbox grid: 3 columns
  - [ ] All spacing correct
  - [ ] No horizontal scroll

- [ ] **1366×768** (Laptop)
  - [ ] Checkbox grid: 3 columns
  - [ ] Content fits viewport
  - [ ] Readable font sizes

#### Tablet (641px - 1024px)

- [ ] **1024×768** (iPad Landscape)
  - [ ] Checkbox grid: 2 columns
  - [ ] Form fields stack properly
  - [ ] Touch targets adequate (min 44×44px)

- [ ] **768×1024** (iPad Portrait)
  - [ ] Checkbox grid: 2 columns
  - [ ] Vertical scrolling works
  - [ ] Master checkbox easily tappable

#### Mobile (≤ 640px)

- [ ] **640×1136** (Large Phone)
  - [ ] Checkbox grid: 1 column
  - [ ] Full-width form fields
  - [ ] No horizontal scroll

- [ ] **375×667** (iPhone SE)
  - [ ] Checkbox grid: 1 column
  - [ ] Text sizes readable (≥ 14px)
  - [ ] Touch targets ≥ 44px
  - [ ] Spacing adequate for touch

- [ ] **320×568** (Small Phone)
  - [ ] Layout doesn't break
  - [ ] All content accessible
  - [ ] No overlapping elements

### Responsive Behavior Checks

- [ ] Grid columns adjust at correct breakpoints
- [ ] Font sizes scale appropriately
- [ ] Spacing scales proportionally
- [ ] Images/icons scale properly
- [ ] No horizontal scrolling at any size
- [ ] Vertical scrolling smooth
- [ ] Touch targets minimum 44×44px on mobile
- [ ] Form inputs full-width on mobile

---

## Accessibility Testing

### Keyboard Navigation

#### Test Procedure

1. Open demo page
2. Click address bar to start from top
3. Press `Tab` repeatedly
4. Verify focus moves through all interactive elements

#### Checklist

- [ ] **Tab Navigation**
  - [ ] Tab moves forward through elements
  - [ ] Shift+Tab moves backward
  - [ ] Tab order is logical (top to bottom, left to right)
  - [ ] Focus visible on all interactive elements
  - [ ] Focus indicator has good contrast (≥ 3:1)

- [ ] **Checkbox Interaction**
  - [ ] Space bar toggles checkbox
  - [ ] Enter key submits form (when in form)
  - [ ] Arrow keys don't interfere with checkbox

- [ ] **Button Interaction**
  - [ ] Enter key activates button
  - [ ] Space bar activates button

- [ ] **Form Fields**
  - [ ] Tab reaches all form fields
  - [ ] Can type in text inputs
  - [ ] Can select dropdown options with arrows
  - [ ] Escape closes date picker

### Screen Reader Testing

#### VoiceOver (Mac)

**Activation**: `Cmd+F5`

- [ ] Turn on VoiceOver
- [ ] Navigate to demo page
- [ ] Use VO+Right Arrow to move through elements

**Checklist**:

- [ ] Category titles announced clearly
- [ ] Checkbox states announced ("checked" / "unchecked")
- [ ] Labels associated with checkboxes
- [ ] Form field labels announced
- [ ] Required fields indicated
- [ ] Error messages announced
- [ ] Selection count announced
- [ ] Expand/collapse state announced

#### NVDA (Windows)

**Installation**: [Download NVDA](https://www.nvaccess.org/download/)

- [ ] Install and start NVDA
- [ ] Navigate to demo page
- [ ] Use Down Arrow to read through content

**Same checklist as VoiceOver**

### Color Contrast

Use [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

#### Text Contrast (WCAG AA: 4.5:1)

- [ ] Normal text (#374151) on white: **Pass**
- [ ] Checked text (#1e40af) on light blue (#eff6ff): **Pass**
- [ ] Category title (#111827) on white: **Pass**
- [ ] Selection count (#3b82f6) on white: **Pass**
- [ ] Field labels (#374151) on white: **Pass**

#### Interactive Element Contrast (WCAG AA: 3:1)

- [ ] Checkbox border (#e5e7eb) on white: **Pass**
- [ ] Checked border (#3b82f6) on white: **Pass**
- [ ] Focus outline on white: **Pass**
- [ ] Button on background: **Pass**

### ARIA Attributes

- [ ] `aria-label` on icon buttons
- [ ] `aria-expanded` on expand/collapse button
- [ ] `aria-describedby` for help text (if present)
- [ ] `aria-required` on required fields (if present)
- [ ] `role` attributes appropriate
- [ ] No `aria-` attributes on non-interactive elements

### Focus Management

- [ ] Focus visible on all interactive elements
- [ ] Focus indicator has good contrast (≥ 3:1)
- [ ] Focus doesn't get trapped
- [ ] Focus order logical
- [ ] No focus on hidden elements
- [ ] Modal traps focus (if present)

---

## Cross-Browser Testing

### Browsers to Test

Test in the latest versions of:

1. **Chrome** (Mac/Windows/Linux)
2. **Firefox** (Mac/Windows/Linux)
3. **Safari** (Mac/iOS)
4. **Edge** (Windows)
5. **Mobile Safari** (iOS)
6. **Mobile Chrome** (Android)

### Testing Checklist (Per Browser)

#### Visual Rendering

- [ ] Layout matches design
- [ ] Fonts render correctly
- [ ] Colors accurate
- [ ] Borders/shadows display
- [ ] Animations smooth
- [ ] Spacing consistent

#### Functional Testing

- [ ] All checkboxes work
- [ ] Master checkbox toggles
- [ ] Expand/collapse works
- [ ] Form fields accept input
- [ ] Date picker works
- [ ] Dropdowns work
- [ ] Hover states work (desktop)
- [ ] Focus states visible

#### CSS Support

- [ ] CSS Grid works
- [ ] Flexbox works
- [ ] CSS transitions smooth
- [ ] Media queries fire correctly
- [ ] Custom properties work (if used)

### Known Browser Issues

Document any browser-specific issues here:

| Browser | Issue | Severity | Workaround |
|---------|-------|----------|------------|
| _None yet_ | - | - | - |

---

## Performance Testing

### Page Load Performance

- [ ] **Initial Load**: < 1 second
- [ ] **Time to Interactive**: < 2 seconds
- [ ] **First Contentful Paint**: < 1 second

### Runtime Performance

- [ ] Checkbox toggle: < 16ms (60fps)
- [ ] Expand/collapse animation: smooth (60fps)
- [ ] Form input: no lag
- [ ] Scrolling: smooth (60fps)

### Memory Usage

- [ ] No memory leaks on repeated interactions
- [ ] DevTools Memory profiler shows stable usage

### Bundle Size

- [ ] Component bundle: < 50 KB (gzipped)
- [ ] CSS bundle: < 10 KB (gzipped)

### Testing Tools

```bash
# Lighthouse (Chrome DevTools)
1. Open Chrome DevTools
2. Go to "Lighthouse" tab
3. Run audit (Performance + Accessibility)
4. Verify scores ≥ 90

# WebPageTest
Visit: https://www.webpagetest.org/
Enter demo URL
Run test
```

---

## Integration Testing

### Intake Form Integration

- [ ] Import components successfully
- [ ] Pass props correctly
- [ ] State management works
- [ ] Form submission includes checkbox data
- [ ] Metadata saves to database
- [ ] Can load existing data
- [ ] Validation works

### Doc Gen Form Integration

- [ ] Import components successfully
- [ ] Hide metadata fields (`showIntakeExtras={false}`)
- [ ] Form submission works
- [ ] Can load from intake
- [ ] Checkbox positions match intake
- [ ] Document generation includes selections

### Database Integration

- [ ] Config loads from database
- [ ] Category IDs match database
- [ ] Option IDs match database
- [ ] Can save selections
- [ ] Can load selections
- [ ] Foreign keys work

---

## Testing Report Template

Copy this template for each testing session:

```markdown
# Component Testing Report

**Date**: YYYY-MM-DD
**Tester**: [Name]
**Browser**: [Browser name + version]
**Device**: [Desktop/Tablet/Mobile + OS]

## Visual Testing
- [ ] IssueCheckboxGroup: Pass/Fail
- [ ] IssueCategorySection: Pass/Fail

## Responsive Testing
- [ ] Desktop (1920px): Pass/Fail
- [ ] Tablet (768px): Pass/Fail
- [ ] Mobile (375px): Pass/Fail

## Accessibility Testing
- [ ] Keyboard Navigation: Pass/Fail
- [ ] Screen Reader: Pass/Fail
- [ ] Color Contrast: Pass/Fail

## Performance
- [ ] Page Load: [X]s
- [ ] Interactions: [Smooth/Laggy]

## Issues Found
1. [Issue description]
2. [Issue description]

## Overall Result
✅ Pass / ❌ Fail

## Notes
[Additional observations]
```

---

## Automated Testing (Future)

### Jest Unit Tests

```bash
# Run unit tests
npm run test:unit -- shared/components

# Run with coverage
npm run test:coverage -- shared/components
```

### Playwright E2E Tests

```bash
# Run E2E tests
npm run test:e2e -- tests/shared-components.spec.ts

# Run in headed mode
npm run test:e2e:headed
```

### Visual Regression Tests

Future: Set up Percy or Chromatic for automated visual regression testing.

---

## Continuous Integration

### Pre-Commit Checks

Before committing changes to shared components:

1. [ ] Run linter: `npm run lint`
2. [ ] Run tests: `npm run test`
3. [ ] Check TypeScript: `tsc --noEmit`
4. [ ] Test in at least 2 browsers
5. [ ] Verify demo page works

### Pull Request Checklist

- [ ] All tests pass
- [ ] Documentation updated
- [ ] Demo page updated
- [ ] Browser testing complete
- [ ] Accessibility verified
- [ ] Performance acceptable

---

## Resources

### Tools

- **Chrome DevTools**: Built-in browser tools
- **Firefox DevTools**: Built-in browser tools
- **WebAIM Contrast Checker**: https://webaim.org/resources/contrastchecker/
- **WAVE Browser Extension**: https://wave.webaim.org/extension/
- **axe DevTools**: https://www.deque.com/axe/devtools/
- **Lighthouse**: Built into Chrome
- **WebPageTest**: https://www.webpagetest.org/

### Documentation

- **WCAG 2.1 Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
- **MDN Web Docs**: https://developer.mozilla.org/
- **React Accessibility**: https://reactjs.org/docs/accessibility.html

### Screen Readers

- **VoiceOver (Mac)**: Built-in (Cmd+F5)
- **NVDA (Windows)**: https://www.nvaccess.org/download/
- **JAWS (Windows)**: https://www.freedomscientific.com/products/software/jaws/

---

## Testing Schedule

### Initial Testing (Phase 2.3)

- **Week 1**: Visual + Responsive testing
- **Week 2**: Accessibility + Browser testing
- **Week 3**: Performance + Integration testing

### Ongoing Testing

- **Every PR**: Visual verification
- **Monthly**: Full regression test
- **Quarterly**: Accessibility audit
- **Before Major Release**: Complete test suite

---

## Sign-Off

### Phase 2.3 Testing Complete

- [ ] **QA Engineer**: All visual tests pass
- [ ] **Frontend Developer**: Components render correctly
- [ ] **Accessibility Specialist**: WCAG AA compliance verified
- [ ] **Product Owner**: Visual design approved

**Date**: __________
**Approved By**: __________

---

**Last Updated**: 2025-11-21
**Document Version**: 1.0
