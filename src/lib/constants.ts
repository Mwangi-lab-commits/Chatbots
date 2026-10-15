/**
 * Thresholds and word lists for the NLP error detector.
 *
 * The threshold values are starting points. Tune them with sample data.
 */

/** Flag a reply if it is this similar to an earlier bot reply. */
export const REPETITION_THRESHOLD = 0.85;

/** Flag a reply if it is LESS similar than this to the customer message. */
export const RELEVANCE_THRESHOLD = 0.2;

/** Flag the previous bot reply if the customer re-asks with this similarity. */
export const REASK_THRESHOLD = 0.8;

/** Confidence value used when a fallback phrase is found. */
export const FALLBACK_CONFIDENCE = 0.9;

/** Common English stop words. The detector removes them before comparison. */
export const STOP_WORDS = new Set([
  "a", "about", "after", "again", "all", "also", "am", "an", "and", "any",
  "are", "as", "at", "be", "because", "been", "before", "being", "between",
  "but", "by", "can", "could", "did", "do", "does", "doing", "done", "down",
  "during", "each", "few", "for", "from", "further", "get", "got", "had",
  "has", "have", "having", "he", "her", "here", "hers", "him", "his", "how",
  "i", "if", "in", "into", "is", "it", "its", "just", "me", "more", "most",
  "my", "no", "nor", "not", "now", "of", "off", "on", "once", "only", "or",
  "other", "our", "out", "over", "own", "please", "same", "she", "should",
  "so", "some", "such", "than", "that", "the", "their", "them", "then",
  "there", "these", "they", "this", "those", "through", "to", "too", "under",
  "until", "up", "very", "was", "we", "were", "what", "when", "where",
  "which", "while", "who", "why", "will", "with", "would", "you", "your",
]);

/** Phrases that show that the chatbot did not understand the question. */
export const FALLBACK_PHRASES = [
  "sorry, i did not understand",
  "i did not understand",
  "i do not understand",
  "i did not get that",
  "could you rephrase",
  "can you rephrase",
  "please rephrase",
  "i am not sure i understood",
  "not sure i understood",
  "i do not have an answer",
];
