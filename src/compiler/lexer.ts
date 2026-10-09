import { Token, TokenType, CompilerDiagnostic } from './types';

const KEYWORDS = new Set([
  'SELECT',
  'FROM',
  'WHERE',
  'ORDER',
  'BY',
  'LIMIT',
  'ASC',
  'DESC',
  'AND',
  'OR'
]);

export interface LexerResult {
  tokens: Token[];
  diagnostics: CompilerDiagnostic[];
}

export function tokenize(source: string): LexerResult {
  const diagnostics: CompilerDiagnostic[] = [];
  const tokenList: Token[] = [];

  let line = 1;
  let column = 1;
  let cursor = 0;
  let tokenId = 1;

  while (cursor < source.length) {
    const char = source[cursor];

    // Handle newlines
    if (char === '\n') {
      line++;
      column = 1;
      cursor++;
      continue;
    }

    // Handle whitespace
    if (/\s/.test(char)) {
      column++;
      cursor++;
      continue;
    }

    // Comments (-- comment till end of line)
    if (char === '-' && cursor + 1 < source.length && source[cursor + 1] === '-') {
      while (cursor < source.length && source[cursor] !== '\n') {
        cursor++;
      }
      continue;
    }

    const startColumn = column;
    const startLine = line;

    // Relational Operators (2-char first)
    const twoChar = source.slice(cursor, cursor + 2);
    if (twoChar === '>=' || twoChar === '<=' || twoChar === '!=' || twoChar === '<>') {
      tokenList.push({
        id: tokenId++,
        type: 'RELOP',
        lexeme: twoChar,
        line: startLine,
        column: startColumn,
        value: twoChar === '<>' ? '!=' : twoChar
      });
      cursor += 2;
      column += 2;
      continue;
    }

    // 1-char Relational Operators
    if (char === '=' || char === '>' || char === '<') {
      tokenList.push({
        id: tokenId++,
        type: 'RELOP',
        lexeme: char,
        line: startLine,
        column: startColumn,
        value: char
      });
      cursor++;
      column++;
      continue;
    }

    // Arithmetic operators (+, -, /) and special case *
    if (char === '+' || char === '-' || char === '/') {
      tokenList.push({
        id: tokenId++,
        type: 'ARITH_OP',
        lexeme: char,
        line: startLine,
        column: startColumn,
        value: char
      });
      cursor++;
      column++;
      continue;
    }

    // Star: could be SELECT * or factor * factor
    if (char === '*') {
      // Check previous non-whitespace token to classify as STAR or ARITH_OP
      const prevToken = tokenList.length > 0 ? tokenList[tokenList.length - 1] : null;
      const isSelectContext =
        !prevToken ||
        prevToken.lexeme.toUpperCase() === 'SELECT' ||
        prevToken.lexeme === ',';

      tokenList.push({
        id: tokenId++,
        type: isSelectContext ? 'STAR' : 'ARITH_OP',
        lexeme: '*',
        line: startLine,
        column: startColumn,
        value: '*'
      });
      cursor++;
      column++;
      continue;
    }

    // Punctuation
    if (char === ',') {
      tokenList.push({
        id: tokenId++,
        type: 'COMMA',
        lexeme: ',',
        line: startLine,
        column: startColumn
      });
      cursor++;
      column++;
      continue;
    }

    if (char === ';') {
      tokenList.push({
        id: tokenId++,
        type: 'SEMICOLON',
        lexeme: ';',
        line: startLine,
        column: startColumn
      });
      cursor++;
      column++;
      continue;
    }

    if (char === '(') {
      tokenList.push({
        id: tokenId++,
        type: 'LPAREN',
        lexeme: '(',
        line: startLine,
        column: startColumn
      });
      cursor++;
      column++;
      continue;
    }

    if (char === ')') {
      tokenList.push({
        id: tokenId++,
        type: 'RPAREN',
        lexeme: ')',
        line: startLine,
        column: startColumn
      });
      cursor++;
      column++;
      continue;
    }

    // Numbers (integer or floating point)
    if (/[0-9]/.test(char)) {
      let numStr = '';
      let hasDot = false;
      while (cursor < source.length) {
        const c = source[cursor];
        if (/[0-9]/.test(c)) {
          numStr += c;
          cursor++;
          column++;
        } else if (c === '.' && !hasDot) {
          hasDot = true;
          numStr += c;
          cursor++;
          column++;
        } else {
          break;
        }
      }
      tokenList.push({
        id: tokenId++,
        type: 'NUMBER',
        lexeme: numStr,
        line: startLine,
        column: startColumn,
        value: Number(numStr)
      });
      continue;
    }

    // Strings ('...' or "...")
    if (char === "'" || char === '"') {
      const quoteChar = char;
      cursor++;
      column++;
      let strVal = '';
      let terminated = false;

      while (cursor < source.length) {
        const c = source[cursor];
        if (c === quoteChar) {
          cursor++;
          column++;
          terminated = true;
          break;
        } else if (c === '\n') {
          break; // Unterminated string on line
        } else {
          strVal += c;
          cursor++;
          column++;
        }
      }

      if (!terminated) {
        diagnostics.push({
          phase: 'Lexer',
          severity: 'error',
          message: `Unterminated string literal starting at line ${startLine}, col ${startColumn}`,
          line: startLine,
          column: startColumn
        });
      }

      tokenList.push({
        id: tokenId++,
        type: 'STRING',
        lexeme: `${quoteChar}${strVal}${terminated ? quoteChar : ''}`,
        line: startLine,
        column: startColumn,
        value: strVal
      });
      continue;
    }

    // Identifiers and Keywords
    if (/[a-zA-Z_]/.test(char)) {
      let ident = '';
      while (cursor < source.length && /[a-zA-Z0-9_]/.test(source[cursor])) {
        ident += source[cursor];
        cursor++;
        column++;
      }

      const upper = ident.toUpperCase();
      if (KEYWORDS.has(upper)) {
        tokenList.push({
          id: tokenId++,
          type: 'KEYWORD',
          lexeme: ident,
          line: startLine,
          column: startColumn,
          value: upper
        });
      } else {
        tokenList.push({
          id: tokenId++,
          type: 'IDENT',
          lexeme: ident,
          line: startLine,
          column: startColumn,
          value: ident
        });
      }
      continue;
    }

    // Illegal / unrecognized character (e.g. '@', '$', '#', etc.)
    diagnostics.push({
      phase: 'Lexer',
      severity: 'error',
      message: `Illegal character '${char}' encountered`,
      line: startLine,
      column: startColumn
    });

    tokenList.push({
      id: tokenId++,
      type: 'ERROR',
      lexeme: char,
      line: startLine,
      column: startColumn,
      error: `Illegal character '${char}'`
    });

    cursor++;
    column++;
  }

  // Append EOF token
  tokenList.push({
    id: tokenId,
    type: 'EOF',
    lexeme: '',
    line,
    column
  });

  return { tokens: tokenList, diagnostics };
}
