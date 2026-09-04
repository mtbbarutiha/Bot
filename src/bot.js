'use strict';

/**
 * A small, dependency-free rule-based chatbot engine.
 *
 * The engine is intentionally deterministic so it can be exercised end-to-end
 * in tests and demos without any external API keys or network access.
 */

const HELP_TEXT = [
  "Here is what I can do:",
  '- say "hello" and I will greet you back',
  '- ask "what time is it?" for the current server time',
  '- do math like "2 + 3 * 4"',
  '- say "echo <something>" and I will repeat it',
  '- ask for "help" to see this message again',
].join('\n');

/**
 * Safely evaluate a simple arithmetic expression containing only numbers,
 * whitespace, parentheses and the + - * / operators.
 *
 * @param {string} expression
 * @returns {number|null} the result, or null if the expression is invalid
 */
function evaluateMath(expression) {
  const trimmed = expression.trim();
  if (!/^[0-9+\-*/().\s]+$/.test(trimmed)) {
    return null;
  }
  if (!/[+\-*/]/.test(trimmed)) {
    return null;
  }
  try {
    const result = Function(`"use strict"; return (${trimmed});`)();
    if (typeof result === 'number' && Number.isFinite(result)) {
      return result;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Produce a reply for a single user message.
 *
 * @param {string} rawMessage
 * @param {{ now?: () => Date }} [options] optional clock injection for testing
 * @returns {string}
 */
function getReply(rawMessage, options = {}) {
  const now = options.now || (() => new Date());
  const message = typeof rawMessage === 'string' ? rawMessage.trim() : '';

  if (!message) {
    return "I didn't catch that. Type \"help\" to see what I can do.";
  }

  const lower = message.toLowerCase();

  if (/^(hi|hello|hey|yo|howdy)\b/.test(lower)) {
    return 'Hello! I am Bot. How can I help you today? (type "help" for options)';
  }

  if (lower === 'help' || lower === '?') {
    return HELP_TEXT;
  }

  if (lower.includes('time')) {
    return `The current server time is ${now().toISOString()}.`;
  }

  if (lower.startsWith('echo ')) {
    return message.slice(5);
  }

  if (/\b(bye|goodbye|see you|cya)\b/.test(lower)) {
    return 'Goodbye! Come back any time.';
  }

  const mathResult = evaluateMath(message);
  if (mathResult !== null) {
    return `${message.trim()} = ${mathResult}`;
  }

  return `You said: "${message}". I'm a simple bot — type "help" to see what I understand.`;
}

module.exports = { getReply, evaluateMath, HELP_TEXT };
