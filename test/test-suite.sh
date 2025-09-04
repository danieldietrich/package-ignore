#!/bin/bash

# Test suite for package-ignore tool
# This script runs all test scenarios and reports results

# set -e  # Exit on any error - removed to allow proper cleanup on test failures

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL_PATH="$SCRIPT_DIR/../bin/index.cjs"
TOTAL_TESTS=0
FAILED_TESTS=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
RESET_COLOR='\033[0m'

echo "🧪 Running package-ignore test suite..."
echo "========================================"

# Function to compare JSON files (ignoring formatting differences)
compare_json() {
    local file1="$1"
    local file2="$2"

    # Use jq to compare JSON files and show differences
    if jq -s 'def diff: .[0] as $a | .[1] as $b |
      {
        expected: ($a | with_entries(select(.value != $b[.key]))),
        actual: ($b | with_entries(select(.value != $a[.key])))
      }; diff' "$file1" "$file2" | jq -e '(.expected | length == 0) and (.actual | length == 0)' > /dev/null 2>&1; then
        return 0  # Success - files are identical
    else
        return 1  # Failure
    fi
}

# Function to run a single test scenario
run_test() {
    local scenario_name="$1"
    local scenario_dir="$2"

    echo -n "Testing $scenario_name... "

    # Change to scenario directory
    cd "$scenario_dir" || exit 1

    # Run the package-ignore tool
    if node "$TOOL_PATH" > /dev/null 2>&1; then
        # Compare result with expected using JSON comparison
        if compare_json package.json expected.json; then
            echo -e "${GREEN}✓ PASS${RESET_COLOR}"
        else
            echo -e "${RED}✗ FAIL${RESET_COLOR}"
            diff --color=always -U 3 expected.json package.json
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    else
        echo -e "${RED}✗ FAIL (tool execution failed)${RESET_COLOR}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    # Restore original package.json from backup
    if [ -f "package-ignore-backup.json" ]; then
        node "$TOOL_PATH" restore > /dev/null 2>&1
    fi

    # Go back to test directory
    cd "$SCRIPT_DIR" || exit 1
}

# Run all test scenarios
for scenario_dir in "$SCRIPT_DIR"/*/; do
    if [ -d "$scenario_dir" ] && [ -f "$scenario_dir/package.json" ] && [ -f "$scenario_dir/.package-ignore" ] && [ -f "$scenario_dir/expected.json" ]; then
        scenario_name=$(basename "$scenario_dir")
        run_test "$scenario_name" "$scenario_dir"
    fi
done

echo "========================================"
echo "Total tests: $TOTAL_TESTS"
echo "Passed: $((TOTAL_TESTS - FAILED_TESTS))"
echo "Failed: $FAILED_TESTS"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${RESET_COLOR}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed!${RESET_COLOR}"
    exit 1
fi
