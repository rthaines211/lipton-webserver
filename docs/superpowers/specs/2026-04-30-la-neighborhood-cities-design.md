# LA Neighborhood Cities in Dropdown — Design Spec

**Date:** 2026-04-30
**Component:** Complaint Creator (`forms/complaint/index.html`, `forms/complaint/js/form-logic.js`)
**Status:** Approved (small inline change)

---

## 1. Problem

The complaint creator's city dropdown only has "Los Angeles", "Santa Monica", and "Other". Many real complaints involve LA-area neighborhoods (Woodland Hills, Encino, etc.) that should:

1. Show up as their own option so users can pick the actual locality.
2. Trigger the same LA-specific causes-of-action checkboxes that "Los Angeles" does, since they fall under LA jurisdiction.

## 2. Goals

- Add 18 LA neighborhoods to the city dropdown.
- Picking any of them shows the LA causes-of-action section (same as picking "Los Angeles").
- Preserve the neighborhood name in form-submission data.

## 3. Non-Goals

- No DOCX template change — no `<City>` placeholder exists in the template (only `<County>`).
- No backend logic change — the city value flows through `parseFormData` unchanged.
- No new neighborhoods beyond the 18 listed below.

## 4. Neighborhoods to Add

Woodland Hills, Encino, Tarzana, Reseda, Van Nuys, North Hollywood, Studio City, Sherman Oaks, Pacoima, Chatsworth, Pacific Palisades, Venice, Playa del Rey, Playa Vista, San Pedro, Wilmington, Eagle Rock, Highland Park.

## 5. Changes

### `forms/complaint/index.html`

Replace the existing `<select id="city">` block:

```html
<select id="city" name="city" required>
    <option value="" disabled selected>Select a city...</option>
    <option value="Los Angeles">Los Angeles</option>
    <option value="Santa Monica">Santa Monica</option>
    <option value="Other">Other</option>
</select>
```

With:

```html
<select id="city" name="city" required>
    <option value="" disabled selected>Select a city...</option>
    <option value="Los Angeles">Los Angeles</option>
    <option value="Santa Monica">Santa Monica</option>
    <optgroup label="Los Angeles Neighborhoods">
        <option value="Woodland Hills">Woodland Hills</option>
        <option value="Encino">Encino</option>
        <option value="Tarzana">Tarzana</option>
        <option value="Reseda">Reseda</option>
        <option value="Van Nuys">Van Nuys</option>
        <option value="North Hollywood">North Hollywood</option>
        <option value="Studio City">Studio City</option>
        <option value="Sherman Oaks">Sherman Oaks</option>
        <option value="Pacoima">Pacoima</option>
        <option value="Chatsworth">Chatsworth</option>
        <option value="Pacific Palisades">Pacific Palisades</option>
        <option value="Venice">Venice</option>
        <option value="Playa del Rey">Playa del Rey</option>
        <option value="Playa Vista">Playa Vista</option>
        <option value="San Pedro">San Pedro</option>
        <option value="Wilmington">Wilmington</option>
        <option value="Eagle Rock">Eagle Rock</option>
        <option value="Highland Park">Highland Park</option>
    </optgroup>
    <option value="Other">Other</option>
</select>
```

`<optgroup>` visually groups the neighborhoods under a non-selectable header so users immediately see they're LA-related.

### `forms/complaint/js/form-logic.js`

In `handleCityChange()`, replace `if (city === 'Los Angeles')` check with a `LA_CITIES` array membership test.

Add at top of file (or as a module-level constant near other constants):

```javascript
const LA_CITIES = [
    'Los Angeles',
    'Woodland Hills', 'Encino', 'Tarzana', 'Reseda', 'Van Nuys',
    'North Hollywood', 'Studio City', 'Sherman Oaks', 'Pacoima', 'Chatsworth',
    'Pacific Palisades', 'Venice', 'Playa del Rey', 'Playa Vista',
    'San Pedro', 'Wilmington', 'Eagle Rock', 'Highland Park',
];
```

In `handleCityChange()`:

```javascript
if (LA_CITIES.includes(city)) {
    citySection.style.display = '';
    cityTitle.textContent = 'Los Angeles';
    cityName.textContent = 'Los Angeles';
    document.getElementById('causes-los-angeles').style.display = '';
} else if (city === 'Santa Monica') {
    // ... unchanged
} else {
    citySection.style.display = 'none';
}
```

Title and section name stay "Los Angeles" regardless of which neighborhood is picked, because the displayed causes are LA-jurisdiction causes.

## 6. Testing

Manual verification:
- Pick "Woodland Hills" → LA causes section appears with title "Los Angeles".
- Pick "Encino" → same.
- Pick "Santa Monica" → SM causes section, no LA causes.
- Pick "Other" → no city-specific causes section.
- Switch from "Woodland Hills" to "Other" → LA causes section disappears and any checked LA causes get unchecked.

No new automated tests needed — the change is a config list extension and one `===` → `Array.includes()` swap.

## 7. Rollout

- One commit on a feature branch.
- Manual smoke test locally.
- PR + Cloud Run deploy via existing workflow.
