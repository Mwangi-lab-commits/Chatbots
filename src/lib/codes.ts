import { randomInt } from "crypto";

/** Unambiguous characters. No 0/O and no 1/I. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length: number): string {
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += ALPHABET[randomInt(0, ALPHABET.length)];
  }
  return code;
}

/** Anonymous customer session code, for example CHT-K7PMX2Q9. */
export function newSessionCode(): string {
  return `CHT-${randomCode(8)}`;
}

/** Escalation ticket number, for example TKT-4RMX8P2K. */
export function newTicketCode(): string {
  return `TKT-${randomCode(8)}`;
}
