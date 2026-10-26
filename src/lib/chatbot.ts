/**
 * Customer support chatbot.
 *
 * OpenRouter supplies the reply when OPENROUTER_API_KEY is set.
 * If the key is missing or the request fails, the rule-based replies below
 * keep the demo working. The public function is generateBotReply().
 */

import { generateOpenRouterReply } from "./openrouter";

const SYSTEM_PROMPT = `You are the customer support assistant for a demo online store.

Rules:
- Reply in clear, simple English.
- Use plain text only. Do not use markdown.
- Keep the reply to 2 to 4 short sentences.
- Use only the facts below.
- Do not invent order status, delivery dates, account details, or payment details.
- If the customer asks about a specific order or account, tell them to open Orders or use the "Talk to a human" option.
- Never ask for a password, card number, or M-Pesa PIN.
- You are an automated assistant. Do not claim to be a human.
- If you cannot solve the problem, offer the "Talk to a human" option.

Facts:
- Support hours: Monday to Friday, 08:00 to 18:00. Weekend requests are answered on Monday morning.
- Head office: Nairobi, Kenya. The store serves customers online across the country.
- Delivery: standard delivery takes 2 to 4 business days. Express delivery takes 1 business day. A tracking link is sent by SMS.
- Refunds: request a refund within 14 days of purchase. Refunds are processed in 5 to 7 business days.
- Payments: M-Pesa, debit cards, and credit cards. Payments are secured with bank-level encryption.
- Cancellation: cancel an order before it ships.
- Account: open Settings and select Profile. If you cannot log in, select Forgot password on the login page.`;

interface Intent {
  name: string;
  keywords: string[];
  responses: string[];
}

const INTENTS: Intent[] = [
  {
    name: "greeting",
    keywords: ["hello", "hi", "hey", "morning", "afternoon", "evening"],
    responses: [
      "Hello! I am the support assistant. How can I help you today?",
      "Hi there! What can I do for you today?",
    ],
  },
  {
    name: "hours",
    keywords: ["hours", "open", "close", "closed", "closing", "opening"],
    responses: [
      "Our support desk is open Monday to Friday, from 8:00 to 18:00. Weekend requests are answered on Monday morning.",
    ],
  },
  {
    name: "location",
    keywords: ["location", "located", "address", "office", "branch", "headquarters"],
    responses: [
      "Our head office is in Nairobi, Kenya. We also serve customers online, across the country.",
    ],
  },
  {
    name: "order",
    keywords: [
      "order status",
      "order number",
      "order id",
      "where is my order",
      "track",
      "tracking",
      "track my order",
      "my order status",
      "parcel status",
      "shipment status",
      "not arrived",
      "not delivered",
      "late delivery",
    ],
    responses: [
      "To check your order, open Orders and select the order. You will see the current status and a tracking link. If the status has not changed for 2 days, use the Talk to a human option.",
    ],
  },
  {
    name: "delivery",
    keywords: ["delivery", "deliver", "shipping", "ship", "courier", "parcel"],
    responses: [
      "Standard delivery takes 2 to 4 business days. Express delivery takes 1 business day. You receive a tracking link by SMS.",
    ],
  },
  {
    name: "refund",
    keywords: ["refund", "money back", "return item", "reimburse"],
    responses: [
      "You can request a refund within 14 days of purchase. Go to Orders, select the order, and choose Request refund. Refunds are processed in 5 to 7 business days.",
    ],
  },
  {
    name: "payment",
    keywords: ["payment", "pay", "mpesa", "m-pesa", "card", "invoice", "price", "cost", "charge"],
    responses: [
      "We accept M-Pesa, debit cards and credit cards. All payments are secured with bank-level encryption.",
    ],
  },
  {
    name: "account",
    keywords: ["account", "register", "signup", "sign up", "profile", "login problem", "password"],
    responses: [
      "To manage your account, go to Settings and select Profile. If you cannot log in, select Forgot password on the login page.",
    ],
  },
  {
    name: "cancel",
    keywords: ["cancel", "cancellation", "stop order"],
    responses: [
      "You can cancel an order before it is shipped. Open Orders, select the order, and choose Cancel order.",
    ],
  },
  {
    name: "human",
    keywords: ["human", "agent", "person", "representative", "staff", "talk to someone"],
    responses: [
      "I can connect you to a human agent. Use the Talk to a human option on the chat page. Please describe your feedback or problem there.",
    ],
  },
  {
    name: "thanks",
    keywords: ["thanks", "thank", "appreciate"],
    responses: [
      "You are welcome! Is there anything else I can help you with?",
    ],
  },
  {
    name: "goodbye",
    keywords: ["bye", "goodbye", "see you", "that is all", "nothing else"],
    responses: [
      "Thank you for contacting us. Have a great day!",
    ],
  },
];

const FALLBACK_RESPONSES = [
  "Sorry, I did not understand that. Could you rephrase your question?",
  "Sorry, I did not understand. Can you give me more details?",
];

const GREETING_HINTS = ["hello", "hi", "hey"];

/** Find the intent with the most keyword matches. */
function matchIntent(message: string): Intent | null {
  const text = ` ${message.toLowerCase().replace(/[^a-z0-9\s-]/g, " ")} `;
  let best: Intent | null = null;
  let bestScore = 0;
  for (const intent of INTENTS) {
    let score = 0;
    for (const keyword of intent.keywords) {
      if (text.includes(` ${keyword} `) || text.includes(` ${keyword}s `)) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = intent;
    }
  }
  return best;
}

function pick(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}

let replyCounter = 0;

/**
 * Generate a reply with the built-in rule engine.
 * This is the fallback when OpenRouter is not configured or fails.
 */
function generateRuleReply(
  customerMessage: string,
  history: { sender: string; content: string }[],
): string {
  const trimmed = customerMessage.trim();
  if (trimmed.length === 0) {
    return "It looks like your message is empty. Please type your question.";
  }

  // If the customer greets as the first message, greet back.
  const isFirstMessage = history.length === 0;
  if (isFirstMessage) {
    const lowered = trimmed.toLowerCase();
    if (GREETING_HINTS.some((hint) => lowered.includes(hint))) {
      return "Hello! I am the support assistant. How can I help you today?";
    }
  }

  const intent = matchIntent(trimmed);
  if (intent) {
    // Rotate through responses to reduce (but not remove) repetition.
    replyCounter += 1;
    return intent.responses[replyCounter % intent.responses.length];
  }

  return pick(FALLBACK_RESPONSES);
}

/**
 * Generate the chatbot reply for a customer message.
 * Uses OpenRouter when configured, then falls back to the rule engine.
 * history is the full list of earlier messages, oldest first.
 */
export async function generateBotReply(
  customerMessage: string,
  history: { sender: string; content: string }[],
): Promise<string> {
  const aiReply = await generateOpenRouterReply(
    SYSTEM_PROMPT,
    customerMessage,
    history,
  );
  if (aiReply) return aiReply;
  return generateRuleReply(customerMessage, history);
}
