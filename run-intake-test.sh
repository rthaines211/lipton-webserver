#!/bin/bash

#
# Script to run the intake form Playwright test
#
# Usage:
#   ./run-intake-test.sh           # Run headless
#   ./run-intake-test.sh headed    # Run with visible browser
#   ./run-intake-test.sh debug     # Run in debug mode
#

echo "🎭 Intake Form Test Runner"
echo "════════════════════════════════════════"
echo ""

# Check if servers are running
echo "⚙️  Checking if required servers are running..."
if ! curl -s http://localhost:3000 > /dev/null; then
  echo "❌ Error: Main server (port 3000) is not running"
  echo "   Run: npm start"
  exit 1
fi

if ! curl -s http://localhost:3002 > /dev/null; then
  echo "❌ Error: Client intake server (port 3002) is not running"
  echo "   Run: cd client-intake && npm run dev"
  exit 1
fi

echo "✅ Both servers are running"
echo ""

# Run the test based on the argument
MODE="${1:-headless}"

case $MODE in
  headed)
    echo "🚀 Running test with visible browser..."
    npx playwright test tests/intake-form.spec.ts --headed --project=chromium
    ;;
  debug)
    echo "🐛 Running test in debug mode..."
    npx playwright test tests/intake-form.spec.ts --debug --project=chromium
    ;;
  *)
    echo "🚀 Running test headless..."
    npx playwright test tests/intake-form.spec.ts --project=chromium
    ;;
esac

# Check test result
if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Test completed successfully!"
  echo ""
  echo "📊 To view the HTML report:"
  echo "   npx playwright show-report"
else
  echo ""
  echo "❌ Test failed!"
  echo ""
  echo "📸 Check screenshots and videos in:"
  echo "   test-results/"
  echo ""
  echo "📊 To view the HTML report:"
  echo "   npx playwright show-report"
fi
