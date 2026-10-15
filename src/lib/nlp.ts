import {
  FALLBACK_CONFIDENCE,
  FALLBACK_PHRASES,
  REASK_THRESHOLD,
  RELEVANCE_THRESHOLD,
  REPETITION_THRESHOLD,
  STOP_WORDS,
} from "./constants";
import type { ErrorType } from "./types";

export interface DetectedError {
  type: ErrorType;
  confidence: number;
}

/**
 * Split text into meaningful words.
 * Steps: lower-case, remove punctuation, remove stop words.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

/** Count how often each word appears. */
export function termFrequency(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return counts;
}

/**
 * Cosine similarity of the term vectors of two texts.
 * Returns a value between 0 (not similar) and 1 (the same words).
 */
export function cosineSimilarity(textA: string, textB: string): number {
  const vectorA = termFrequency(tokenize(textA));
  const vectorB = termFrequency(tokenize(textB));
  if (vectorA.size === 0 || vectorB.size === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const count of vectorA.values()) normA += count * count;
  for (const count of vectorB.values()) normB += count * count;
  for (const [term, countA] of vectorA) {
    dot += countA * (vectorB.get(term) ?? 0);
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function containsFallbackPhrase(text: string): boolean {
  const normalized = text.toLowerCase();
  return FALLBACK_PHRASES.some((phrase) => normalized.includes(phrase));
}

/**
 * Analyse one chatbot reply for NLP errors.
 *
 * Rules from the design document:
 * - Repetitive: similarity to an earlier bot reply >= 0.85.
 * - Irrelevant: similarity to the customer message < 0.20.
 * - Misinterpreted: the reply contains a fallback phrase.
 *
 * A reply may raise more than one flag.
 */
export function detectErrors(input: {
  botText: string;
  customerText: string;
  previousBotTexts: string[];
}): DetectedError[] {
  const errors: DetectedError[] = [];

  // Repetitive: compare with every earlier bot reply in this conversation.
  let maxPreviousSimilarity = 0;
  for (const previous of input.previousBotTexts) {
    const similarity = cosineSimilarity(input.botText, previous);
    if (similarity > maxPreviousSimilarity) maxPreviousSimilarity = similarity;
  }
  if (
    input.previousBotTexts.length > 0 &&
    maxPreviousSimilarity >= REPETITION_THRESHOLD
  ) {
    errors.push({ type: "Repetitive", confidence: round2(maxPreviousSimilarity) });
  }

  // Irrelevant: compare the reply with the customer message.
  const relevance = cosineSimilarity(input.botText, input.customerText);
  if (relevance < RELEVANCE_THRESHOLD) {
    errors.push({ type: "Irrelevant", confidence: round2(1 - relevance) });
  }

  // Misinterpreted: the reply uses a fallback phrase.
  if (containsFallbackPhrase(input.botText)) {
    errors.push({ type: "Misinterpreted", confidence: FALLBACK_CONFIDENCE });
  }

  return errors;
}

/**
 * Check if a new customer message repeats the previous customer message.
 * A re-ask shows that the previous bot reply was misinterpreted.
 * Returns the similarity (0 to 1).
 */
export function reaskSimilarity(
  newCustomerText: string,
  previousCustomerText: string,
): number {
  return round2(cosineSimilarity(newCustomerText, previousCustomerText));
}

/** True when the customer re-asked the same question. */
export function isReask(similarity: number): boolean {
  return similarity >= REASK_THRESHOLD;
}
