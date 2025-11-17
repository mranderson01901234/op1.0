/**
 * Search Intent Detection for OperaStudio
 * Automatically detects when a user query should trigger web search
 */

// Keywords that strongly suggest need for current information
const CURRENT_INFO_KEYWORDS = [
  'latest',
  'recent',
  'current',
  'today',
  'this week',
  'this month',
  'this year',
  '2024',
  '2025',
  'now',
  'right now',
  'currently',
  'breaking',
  'news',
  'update',
  'updates',
];

// Question patterns that often need web search
const QUESTION_PATTERNS = [
  'what is',
  'what are',
  'who is',
  'who are',
  'where is',
  'where are',
  'when is',
  'when did',
  'when was',
  'how to',
  'how do',
  'how does',
  'why is',
  'why are',
  'why did',
  'explain',
  'tell me about',
  'what happened',
];

// Topics that typically require up-to-date information
const DYNAMIC_TOPICS = [
  'stock',
  'price',
  'weather',
  'score',
  'result',
  'election',
  'war',
  'covid',
  'pandemic',
  'release date',
  'launch',
  'announcement',
  'conference',
  'event',
];

// Commands that should always search
const SEARCH_COMMANDS = [
  '/search',
  'search for',
  'look up',
  'find information about',
  'research',
];

/**
 * Check if query starts with /search command
 */
function hasSearchCommand(query: string): boolean {
  const lowerQuery = query.toLowerCase().trim();
  return SEARCH_COMMANDS.some(cmd => lowerQuery.startsWith(cmd));
}

/**
 * Check if query contains current information keywords
 */
function hasCurrentInfoKeywords(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  return CURRENT_INFO_KEYWORDS.some(keyword => lowerQuery.includes(keyword));
}

/**
 * Check if query matches common question patterns
 */
function hasQuestionPattern(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  return QUESTION_PATTERNS.some(pattern => lowerQuery.includes(pattern));
}

/**
 * Check if query is about dynamic topics
 */
function hasDynamicTopic(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  return DYNAMIC_TOPICS.some(topic => lowerQuery.includes(topic));
}

/**
 * Check if query is about coding/development (should NOT search)
 */
function isCodingQuery(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  const codingKeywords = [
    'function',
    'component',
    'code',
    'debug',
    'error in',
    'fix the',
    'implement',
    'refactor',
    'typescript',
    'javascript',
    'react',
    'api route',
    'endpoint',
    'import',
    'export',
    'const',
    'let',
    'var',
    'class',
    'interface',
    'type',
  ];

  // If it's clearly about code in the project, don't search
  const hasCodingKeywords = codingKeywords.some(keyword => lowerQuery.includes(keyword));
  const hasFileReference = /\.(ts|tsx|js|jsx|py|java|cpp|c|go|rs|rb|php)/.test(lowerQuery);

  return hasCodingKeywords || hasFileReference;
}

/**
 * Calculate confidence score for search intent (0-100)
 */
function calculateSearchConfidence(query: string): number {
  let score = 0;

  // Search command is explicit
  if (hasSearchCommand(query)) {
    return 100;
  }

  // Current info keywords add significant weight
  if (hasCurrentInfoKeywords(query)) {
    score += 40;
  }

  // Question patterns suggest need for factual information
  if (hasQuestionPattern(query)) {
    score += 30;
  }

  // Dynamic topics likely need current data
  if (hasDynamicTopic(query)) {
    score += 30;
  }

  // Coding queries should NOT trigger search
  if (isCodingQuery(query)) {
    score = Math.max(0, score - 60);
  }

  // Short queries are less likely to need search
  if (query.length < 20) {
    score = Math.max(0, score - 10);
  }

  return Math.min(100, score);
}

/**
 * Detect if a query should trigger web search
 * Returns true if search should be performed
 */
export function shouldPerformSearch(query: string, manualSearchMode: boolean = false): boolean {
  // Manual search mode always triggers search
  if (manualSearchMode) {
    return true;
  }

  const confidence = calculateSearchConfidence(query);

  // Threshold for automatic search: 50% confidence
  return confidence >= 50;
}

/**
 * Remove search command prefix from query if present
 */
export function cleanSearchQuery(query: string): string {
  let cleaned = query.trim();

  // Remove /search command
  if (cleaned.toLowerCase().startsWith('/search')) {
    cleaned = cleaned.substring(7).trim();
  }

  // Remove "search for" prefix
  const searchForPattern = /^search for\s+/i;
  if (searchForPattern.test(cleaned)) {
    cleaned = cleaned.replace(searchForPattern, '');
  }

  // Remove "look up" prefix
  const lookUpPattern = /^look up\s+/i;
  if (lookUpPattern.test(cleaned)) {
    cleaned = cleaned.replace(lookUpPattern, '');
  }

  return cleaned;
}

/**
 * Get search confidence level for debugging/UI purposes
 */
export function getSearchConfidenceLevel(query: string): 'low' | 'medium' | 'high' {
  const confidence = calculateSearchConfidence(query);

  if (confidence >= 70) return 'high';
  if (confidence >= 40) return 'medium';
  return 'low';
}
