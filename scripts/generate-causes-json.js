#!/usr/bin/env node

/**
 * One-time script to generate data/causes-of-action.json from the authoritative CSV.
 *
 * Usage: node scripts/generate-causes-json.js
 */

const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', 'docs', 'Cause of Action Master List.csv');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'causes-of-action.json');

// --- Robust CSV parser that handles quoted fields with embedded newlines and commas ---

function parseCSV(text) {
  const rows = [];
  let i = 0;

  // Skip BOM if present
  if (text.charCodeAt(0) === 0xFEFF) i = 1;

  while (i < text.length) {
    const row = [];
    while (true) {
      let value;
      if (text[i] === '"') {
        // Quoted field
        i++; // skip opening quote
        let field = '';
        while (i < text.length) {
          if (text[i] === '"') {
            if (i + 1 < text.length && text[i + 1] === '"') {
              // Escaped quote
              field += '"';
              i += 2;
            } else {
              // End of quoted field
              i++; // skip closing quote
              break;
            }
          } else {
            field += text[i];
            i++;
          }
        }
        value = field;
      } else {
        // Unquoted field
        let field = '';
        while (i < text.length && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
          field += text[i];
          i++;
        }
        value = field;
      }
      row.push(value);

      if (i >= text.length) break;
      if (text[i] === ',') {
        i++; // skip comma, continue to next field
      } else {
        // End of row (\n or \r\n)
        if (text[i] === '\r') i++;
        if (text[i] === '\n') i++;
        break;
      }
    }
    // Skip empty trailing rows
    if (row.length > 1 || (row.length === 1 && row[0].trim() !== '')) {
      rows.push(row);
    }
  }
  return rows;
}

// --- Category mapping ---

const CATEGORY_MAP = {
  'General': 'general',
  'Special': 'special',
  'City - Los Angeles': 'los-angeles',
  'City - Santa Monica': 'santa-monica',
};

// --- Slugify ---

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// --- Main ---

const csvText = fs.readFileSync(CSV_PATH, 'utf-8');
const rows = parseCSV(csvText);

// First row is header
const header = rows[0];
console.log('CSV header:', header.map(h => h.trim()));

const dataRows = rows.slice(1);
console.log(`Parsed ${dataRows.length} data rows from CSV`);

const causes = dataRows.map(row => {
  const [rawCategory, rawOrder, checkboxText, heading, insertText] = row;
  const category = CATEGORY_MAP[rawCategory.trim()];
  if (!category) {
    console.error(`Unknown category: "${rawCategory.trim()}"`);
    process.exit(1);
  }

  const id = slugify(checkboxText.trim());

  const entry = {
    id,
    category,
  };

  // Only include order for General causes
  if (category === 'general') {
    const order = parseInt(rawOrder.trim(), 10);
    if (isNaN(order)) {
      console.error(`Invalid order for general cause "${checkboxText.trim()}": "${rawOrder.trim()}"`);
      process.exit(1);
    }
    entry.order = order;
  }

  entry.checkboxText = checkboxText.trim();
  entry.heading = heading;
  entry.insertText = insertText;

  return entry;
});

// Sort: general (by order), then special, then los-angeles, then santa-monica
const categoryOrder = { 'general': 0, 'special': 1, 'los-angeles': 2, 'santa-monica': 3 };

causes.sort((a, b) => {
  const catDiff = categoryOrder[a.category] - categoryOrder[b.category];
  if (catDiff !== 0) return catDiff;
  if (a.category === 'general') return a.order - b.order;
  return 0; // preserve CSV order within non-general categories
});

// Stats
const stats = {};
causes.forEach(c => {
  stats[c.category] = (stats[c.category] || 0) + 1;
});

console.log('\nCategory breakdown:');
Object.entries(stats).forEach(([cat, count]) => {
  console.log(`  ${cat}: ${count}`);
});
console.log(`  TOTAL: ${causes.length}`);

// Spot checks
const first = causes[0];
console.log(`\nFirst cause: id="${first.id}", category="${first.category}", order=${first.order}`);

const lastGeneral = causes.filter(c => c.category === 'general').pop();
console.log(`Last general: id="${lastGeneral.id}", order=${lastGeneral.order}`);

// Write output
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(causes, null, 2) + '\n', 'utf-8');
console.log(`\nWrote ${causes.length} causes to ${OUTPUT_PATH}`);
