// Safe arithmetic expression evaluator. Avoids new Function/eval by parsing
// and evaluating the expression manually with a recursive descent parser.

const VALID_CHAR_REGEX = /^[\d+*/().\s-]+$/;

class ParseError extends Error {}

interface Token {
  kind: "number" | "operator" | "paren";
  value: string;
}

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expression.length) {
    const char = expression[i];
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(char)) {
      let value = "";
      let dotCount = 0;
      while (i < expression.length && /[0-9.]/.test(expression[i])) {
        if (expression[i] === ".") dotCount++;
        if (dotCount > 1) throw new ParseError("Invalid number format");
        value += expression[i];
        i++;
      }
      if (value === ".") throw new ParseError("Invalid number format");
      tokens.push({ kind: "number", value });
      continue;
    }
    if ("+-*/".includes(char)) {
      tokens.push({ kind: "operator", value: char });
      i++;
      continue;
    }
    if (char === "(" || char === ")") {
      tokens.push({ kind: "paren", value: char });
      i++;
      continue;
    }
    throw new ParseError(`Unexpected character: ${char}`);
  }
  return tokens;
}

function parseExpression(tokens: Token[], index: { value: number }): number {
  let left = parseTerm(tokens, index);
  while (index.value < tokens.length && "+-".includes(tokens[index.value].value)) {
    const op = tokens[index.value].value;
    index.value++;
    const right = parseTerm(tokens, index);
    if (op === "+") left += right;
    else left -= right;
  }
  return left;
}

function parseTerm(tokens: Token[], index: { value: number }): number {
  let left = parseFactor(tokens, index);
  while (index.value < tokens.length && "*/".includes(tokens[index.value].value)) {
    const op = tokens[index.value].value;
    index.value++;
    const right = parseFactor(tokens, index);
    if (op === "*") left *= right;
    else left /= right;
  }
  return left;
}

function parseFactor(tokens: Token[], index: { value: number }): number {
  const token = tokens[index.value];
  if (!token) throw new ParseError("Unexpected end of expression");

  if (token.value === "(") {
    index.value++;
    const value = parseExpression(tokens, index);
    if (tokens[index.value]?.value !== ")") {
      throw new ParseError("Unbalanced parentheses");
    }
    index.value++;
    return value;
  }

  if (token.value === "-") {
    index.value++;
    return -parseFactor(tokens, index);
  }

  if (token.kind === "number") {
    index.value++;
    return Number(token.value);
  }

  throw new ParseError(`Unexpected token: ${token.value}`);
}

export function evaluateExpression(expression: string): number {
  if (!expression || !expression.trim()) {
    throw new ParseError("Empty calculator expression");
  }
  if (!VALID_CHAR_REGEX.test(expression)) {
    throw new ParseError("Invalid calculator expression");
  }
  if (!/[0-9]/.test(expression)) {
    throw new ParseError("Invalid calculator expression");
  }

  const tokens = tokenize(expression);
  const index = { value: 0 };
  const result = parseExpression(tokens, index);

  if (index.value < tokens.length) {
    throw new ParseError("Unexpected token at end of expression");
  }

  if (!Number.isFinite(result)) {
    throw new ParseError("Invalid calculator result");
  }

  return result;
}
