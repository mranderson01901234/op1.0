// Quick test of search detection logic
const { shouldPerformSearch, cleanSearchQuery } = require('./lib/search/detectSearchIntent.ts');

const testQueries = [
  "What's the latest news in AI?",
  "Who won the Super Bowl 2024?",
  "How to implement a React component?",
  "Fix the bug in my TypeScript code",
  "What is quantum computing?",
  "/search latest AI developments"
];

console.log("Testing Search Detection:\n");

testQueries.forEach(query => {
  const shouldSearch = shouldPerformSearch(query, false);
  const cleaned = cleanSearchQuery(query);
  console.log(`Query: "${query}"`);
  console.log(`  Should search: ${shouldSearch}`);
  console.log(`  Cleaned: "${cleaned}"\n`);
});
