#!/bin/bash

# API Validation Test Suite for Document Selection Feature
# Tests backend validation for Phase 2.1

set -e

BASE_URL="http://localhost:3000"
API_ENDPOINT="${BASE_URL}/api/form-entries"

echo "======================================================================"
echo "🧪 API Validation Test Suite - Document Selection Feature"
echo "======================================================================"
echo ""
echo "Base URL: $BASE_URL"
echo "Endpoint: $API_ENDPOINT"
echo ""

# Helper function for test results
print_test_result() {
    local test_name=$1
    local expected_status=$2
    local actual_status=$3

    if [ "$expected_status" -eq "$actual_status" ]; then
        echo "✅ PASS: $test_name (HTTP $actual_status)"
    else
        echo "❌ FAIL: $test_name (Expected $expected_status, Got $actual_status)"
    fi
}

# Test 1: Valid Request - All Documents (Default)
echo "======================================================================"
echo "Test 1: Default Behavior (Field Missing - Should Default to All)"
echo "======================================================================"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-default-'$(date +%s)'",
    "plaintiff-1-first-name": "Test",
    "plaintiff-1-last-name": "User",
    "property-address": "123 Test St",
    "city": "Test City",
    "state": "NC",
    "zip-code": "12345",
    "filing-city": "Test",
    "filing-county": "Test"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

print_test_result "Default behavior" 201 "$HTTP_CODE"

if echo "$BODY" | grep -q '"documentTypesToGenerate":\["srogs","pods","admissions"\]'; then
    echo "   ✅ Response contains all 3 default documents"
else
    echo "   ⚠️  Response: $BODY"
fi
echo ""

# Test 2: Invalid Type - Empty Array
echo "======================================================================"
echo "Test 2: Empty Array (Should Reject with 400)"
echo "======================================================================"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-empty-'$(date +%s)'",
    "documentTypesToGenerate": [],
    "plaintiff-1-first-name": "Test",
    "plaintiff-1-last-name": "User",
    "property-address": "123 Test St",
    "city": "Test City",
    "state": "NC",
    "zip-code": "12345",
    "filing-city": "Test",
    "filing-county": "Test"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

print_test_result "Empty array rejection" 400 "$HTTP_CODE"

if echo "$BODY" | grep -q '"error":"At least one document type must be selected"'; then
    echo "   ✅ Correct error message returned"
else
    echo "   ⚠️  Response: $BODY"
fi
echo ""

# Test 3: Invalid Type - Not an Array
echo "======================================================================"
echo "Test 3: String Instead of Array (Should Reject with 400)"
echo "======================================================================"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-string-'$(date +%s)'",
    "documentTypesToGenerate": "srogs",
    "plaintiff-1-first-name": "Test",
    "plaintiff-1-last-name": "User",
    "property-address": "123 Test St",
    "city": "Test City",
    "state": "NC",
    "zip-code": "12345",
    "filing-city": "Test",
    "filing-county": "Test"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

print_test_result "Non-array type rejection" 400 "$HTTP_CODE"

if echo "$BODY" | grep -q '"error":"documentTypesToGenerate must be an array"'; then
    echo "   ✅ Correct error message returned"
else
    echo "   ⚠️  Response: $BODY"
fi
echo ""

# Test 4: Invalid Document Type
echo "======================================================================"
echo "Test 4: Invalid Document Type (Should Reject with 400)"
echo "======================================================================"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-invalid-'$(date +%s)'",
    "documentTypesToGenerate": ["srogs", "invalid-type"],
    "plaintiff-1-first-name": "Test",
    "plaintiff-1-last-name": "User",
    "property-address": "123 Test St",
    "city": "Test City",
    "state": "NC",
    "zip-code": "12345",
    "filing-city": "Test",
    "filing-county": "Test"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

print_test_result "Invalid document type rejection" 400 "$HTTP_CODE"

if echo "$BODY" | grep -q '"error":"Invalid document types"'; then
    echo "   ✅ Correct error message returned"
    if echo "$BODY" | grep -q '"invalidTypes":\["invalid-type"\]'; then
        echo "   ✅ Invalid type listed in response"
    fi
else
    echo "   ⚠️  Response: $BODY"
fi
echo ""

# Test 5: Valid - Single Document
echo "======================================================================"
echo "Test 5: Valid Request - Single Document (Should Accept)"
echo "======================================================================"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-single-'$(date +%s)'",
    "documentTypesToGenerate": ["srogs"],
    "plaintiff-1-first-name": "Test",
    "plaintiff-1-last-name": "User",
    "property-address": "123 Test St",
    "city": "Test City",
    "state": "NC",
    "zip-code": "12345",
    "filing-city": "Test",
    "filing-county": "Test"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

print_test_result "Single document selection" 201 "$HTTP_CODE"

if echo "$BODY" | grep -q '"documentTypesToGenerate":\["srogs"\]'; then
    echo "   ✅ Response contains correct document selection"
else
    echo "   ⚠️  Response: $BODY"
fi
echo ""

# Test 6: Valid - Two Documents
echo "======================================================================"
echo "Test 6: Valid Request - Two Documents (Should Accept)"
echo "======================================================================"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-two-'$(date +%s)'",
    "documentTypesToGenerate": ["pods", "admissions"],
    "plaintiff-1-first-name": "Test",
    "plaintiff-1-last-name": "User",
    "property-address": "123 Test St",
    "city": "Test City",
    "state": "NC",
    "zip-code": "12345",
    "filing-city": "Test",
    "filing-county": "Test"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

print_test_result "Two document selection" 201 "$HTTP_CODE"

if echo "$BODY" | grep -q '"documentTypesToGenerate":\["pods","admissions"\]'; then
    echo "   ✅ Response contains correct document selection"
else
    echo "   ⚠️  Response: $BODY"
fi
echo ""

# Test 7: Valid - All Three Documents
echo "======================================================================"
echo "Test 7: Valid Request - All Three Documents (Should Accept)"
echo "======================================================================"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-all-'$(date +%s)'",
    "documentTypesToGenerate": ["srogs", "pods", "admissions"],
    "plaintiff-1-first-name": "Test",
    "plaintiff-1-last-name": "User",
    "property-address": "123 Test St",
    "city": "Test City",
    "state": "NC",
    "zip-code": "12345",
    "filing-city": "Test",
    "filing-county": "Test"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

print_test_result "All three documents selection" 201 "$HTTP_CODE"

if echo "$BODY" | grep -q '"documentTypesToGenerate":\["srogs","pods","admissions"\]'; then
    echo "   ✅ Response contains correct document selection"
else
    echo "   ⚠️  Response: $BODY"
fi
echo ""

echo "======================================================================"
echo "🏁 Test Suite Complete"
echo "======================================================================"
echo ""
echo "Summary:"
echo "  Test 1: Default behavior (missing field)         - Should PASS (201)"
echo "  Test 2: Empty array rejection                     - Should PASS (400)"
echo "  Test 3: String instead of array rejection         - Should PASS (400)"
echo "  Test 4: Invalid document type rejection           - Should PASS (400)"
echo "  Test 5: Single document selection                 - Should PASS (201)"
echo "  Test 6: Two documents selection                   - Should PASS (201)"
echo "  Test 7: All three documents selection             - Should PASS (201)"
echo ""
echo "Note: Database connection errors are expected in local development"
echo ""
