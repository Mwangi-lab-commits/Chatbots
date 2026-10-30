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
 * Support terms that mean the same thing in a customer conversation.
 * The map keeps the similarity check useful when the customer and the bot
 * use different but equivalent words.
 */
const SUPPORT_SYNONYMS: Record<string, string> = {
  opening: "open",
  opened: "open",
  hours: "hour",
  hr: "hour",
  hrs: "hour",
  assist: "help",
  assistance: "help",
};

/**
 * Words that should not lose a trailing "s" in the simple plural normaliser.
 * Without this list, words such as "status" would become "statu".
 */
const PLURAL_EXCEPTIONS = new Set([
  "status",
  "business",
  "analysis",
  "address",
  "class",
  "glass",
  "process",
  "access",
  "progress",
]);

function normalizeToken(word: string): string {
  const mapped = SUPPORT_SYNONYMS[word];
  if (mapped) return mapped;

  if (
    word.length > 4 &&
    word.endsWith("s") &&
    !word.endsWith("ss") &&
    !PLURAL_EXCEPTIONS.has(word)
  ) {
    return word.slice(0, -1);
  }

  return word;
}

/**
 * Split text into meaningful words.
 * Steps: lower-case, remove punctuation, remove stop words, normalise
 * support synonyms and simple plurals.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(
      (word) =>
        word.length > 1 &&
        !STOP_WORDS.has(word) &&
        !/^\d+$/.test(word),
    )
    .map(normalizeToken);
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
 * Greetings and short acknowledgements contain few or no content words.
 * The relevance rule cannot judge them, so they are not flagged as irrelevant.
 */
const GREETING_WORDS = new Set([
  "hi",
  "hello",
  "hey",
  "hae",
  "helo",
  "hii",
  "good",
  "morning",
  "afternoon",
  "evening",
  "thanks",
  "thank",
  "ok",
  "okay",
  "yes",
  "no",
]);

const ACK_WORDS = new Set([
  "yes",
  "no",
  "ok",
  "okay",
  "thanks",
  "thank",
  "cool",
  "great",
  "fine",
]);

const HEALTH_WORDS = [
  "sick",
  "ill",
  "pain",
  "hurt",
  "unwell",
  "toothache",
  "headache",
  "medical",
  "prescription",
  "doctor",
  "not feeling well",
];

const SUPPORTIVE_PHRASES = [
  "sorry to hear",
  "i'm here to help",
  "i can help",
  "please let me know",
  "talk to a human",
  "i'm sorry",
];

const IDENTITY_PHRASES = ["who are you", "what is your name", "your name"];

const CAPABILITY_PHRASES = [
  "what do you do",
  "what do you deal with",
  "what are you specialized in",
  "what are you specialised in",
  "what service",
  "what services",
  "what can you help with",
  "how can you help",
];

function isSmallTalk(text: string): boolean {
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length === 0) return true;

  const words = normalized.split(" ");
  const hasGreeting = words.some((word) => GREETING_WORDS.has(word));
  const hasQuestionMark = text.includes("?");
  const content = tokenize(text).filter((word) => !GREETING_WORDS.has(word));

  if (content.length === 0) return true;
  if (!hasQuestionMark && content.length <= 1 && ACK_WORDS.has(normalized)) {
    return true;
  }
  if (hasGreeting && !hasQuestionMark && content.length <= 2) return true;
  return false;
}

function isHealthConcern(text: string): boolean {
  const lower = text.toLowerCase();
  return HEALTH_WORDS.some((word) => lower.includes(word));
}

function isSupportiveReply(text: string): boolean {
  const lower = text.toLowerCase();
  return SUPPORTIVE_PHRASES.some((phrase) => lower.includes(phrase));
}

function isIdentityQuestion(text: string): boolean {
  const lower = text.toLowerCase();
  return IDENTITY_PHRASES.some((phrase) => lower.includes(phrase));
}

function isCapabilityQuestion(text: string): boolean {
  const lower = text.toLowerCase();
  return CAPABILITY_PHRASES.some((phrase) => lower.includes(phrase));
}

/** True when a message is more than a greeting or a short acknowledgement. */
export function isSubstantiveMessage(text: string): boolean {
  return !isSmallTalk(text) && !isIdentityQuestion(text);
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
    !isSmallTalk(input.customerText) &&
    input.previousBotTexts.length > 0 &&
    maxPreviousSimilarity >= REPETITION_THRESHOLD
  ) {
    errors.push({ type: "Repetitive", confidence: round2(maxPreviousSimilarity) });
  }

  // Irrelevant: compare the reply with the customer message.
  // Greetings, short acknowledgements, identity questions, health concerns
  // with a supportive reply, and fallback replies are not judged by this rule.
  const relevance = cosineSimilarity(input.botText, input.customerText);
  const skipRelevance =
    isSmallTalk(input.customerText) ||
    isIdentityQuestion(input.customerText) ||
    isCapabilityQuestion(input.customerText) ||
    containsFallbackPhrase(input.botText) ||
    (isHealthConcern(input.customerText) && isSupportiveReply(input.botText));

  if (!skipRelevance && relevance < RELEVANCE_THRESHOLD) {
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
