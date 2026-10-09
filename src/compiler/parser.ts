import {
  Token,
  SelectQueryNode,
  ExprNode,
  BinaryOpNode,
  IdentifierNode,
  LiteralNode,
  StarNode,
  CompilerDiagnostic,
  OrderByClause
} from './types';

export interface ParserResult {
  ast: SelectQueryNode | null;
  diagnostics: CompilerDiagnostic[];
  recoveredErrorsCount: number;
}

export class MiniSQLParser {
  private tokens: Token[];
  private current = 0;
  private diagnostics: CompilerDiagnostic[] = [];
  private recoveredCount = 0;

  constructor(tokens: Token[]) {
    // Filter out Lexer ERROR tokens so the parser doesn't choke on them,
    // but the diagnostics are already logged.
    this.tokens = tokens.filter(t => t.type !== 'ERROR');
  }

  public parse(): ParserResult {
    try {
      const ast = this.query();
      return {
        ast,
        diagnostics: this.diagnostics,
        recoveredErrorsCount: this.recoveredCount
      };
    } catch (e: any) {
      if (this.diagnostics.length === 0) {
        this.diagnostics.push({
          phase: 'Parser',
          severity: 'error',
          message: e?.message || 'Unexpected parsing failure',
          line: this.peek()?.line || 1,
          column: this.peek()?.column || 1
        });
      }
      return {
        ast: null,
        diagnostics: this.diagnostics,
        recoveredErrorsCount: this.recoveredCount
      };
    }
  }

  // query → SELECT select_list FROM IDENT [WHERE condition] [ORDER BY IDENT [ASC|DESC]] [LIMIT NUMBER] ';'
  private query(): SelectQueryNode | null {
    if (!this.checkKeyword('SELECT')) {
      this.error(
        `Expected 'SELECT' at the start of query, found '${this.peek().lexeme || 'EOF'}'`
      );
      this.synchronize(['FROM', 'WHERE', 'ORDER', 'LIMIT', ';']);
      if (!this.checkKeyword('SELECT')) {
        // Can't recover without SELECT
        return null;
      }
    }
    this.advance(); // consume SELECT

    // select_list → '*' | IDENT (',' IDENT)*
    let isStar = false;
    const selectList: (IdentifierNode | StarNode)[] = [];

    if (this.match('STAR')) {
      isStar = true;
      selectList.push({ type: 'Star', line: this.previous().line, column: this.previous().column });
    } else {
      let expectMoreCols = true;
      while (expectMoreCols && !this.isAtEnd()) {
        if (this.match('STAR')) {
          this.error("'*' cannot be mixed with column names in this SQL dialect");
          selectList.push({ type: 'Star', line: this.previous().line, column: this.previous().column });
        } else if (this.match('IDENT')) {
          const colToken = this.previous();
          selectList.push({
            type: 'Identifier',
            name: colToken.lexeme,
            line: colToken.line,
            column: colToken.column
          });
        } else {
          this.error(
            `Expected column name or '*' in SELECT list, but found '${this.peek().lexeme || 'EOF'}'`
          );
          // Panic recovery to next comma or FROM
          this.synchronize([',', 'FROM', 'WHERE', 'ORDER', ';']);
          if (this.match('IDENT')) {
            const col = this.previous();
            selectList.push({ type: 'Identifier', name: col.lexeme, line: col.line, column: col.column });
          }
        }

        if (this.match('COMMA')) {
          expectMoreCols = true;
        } else {
          expectMoreCols = false;
        }
      }
    }

    if (selectList.length === 0) {
      this.error("SELECT clause must specify at least one column or '*'");
    }

    // FROM IDENT
    let fromTable = '';
    if (!this.checkKeyword('FROM')) {
      this.error(`Missing 'FROM' keyword after SELECT list. Found '${this.peek().lexeme || 'EOF'}'`);
      this.synchronize(['FROM', 'WHERE', 'ORDER', 'LIMIT', ';']);
    }

    if (this.checkKeyword('FROM')) {
      this.advance(); // consume FROM
      if (this.match('IDENT')) {
        fromTable = this.previous().lexeme;
      } else {
        this.error(`Expected table name after 'FROM', but found '${this.peek().lexeme || 'EOF'}'`);
      }
    } else {
      // Default to empty table so semantic check can handle it
      fromTable = '';
    }

    // [WHERE condition]
    let whereClause: ExprNode | undefined;
    if (this.checkKeyword('WHERE')) {
      this.advance(); // consume WHERE
      try {
        whereClause = this.condition();
      } catch {
        this.synchronize(['ORDER', 'LIMIT', ';']);
      }
    }

    // [ORDER BY IDENT [ASC|DESC]]
    let orderByClause: OrderByClause | undefined;
    if (this.checkKeyword('ORDER')) {
      this.advance(); // consume ORDER
      if (this.checkKeyword('BY')) {
        this.advance(); // consume BY
        if (this.match('IDENT')) {
          const col = this.previous().lexeme;
          let direction: 'ASC' | 'DESC' = 'ASC';
          if (this.checkKeyword('ASC')) {
            this.advance();
            direction = 'ASC';
          } else if (this.checkKeyword('DESC')) {
            this.advance();
            direction = 'DESC';
          }
          orderByClause = { column: col, direction };
        } else {
          this.error(`Expected column name after 'ORDER BY', found '${this.peek().lexeme || 'EOF'}'`);
        }
      } else {
        this.error(`Expected 'BY' after 'ORDER', found '${this.peek().lexeme || 'EOF'}'`);
      }
    }

    // [LIMIT NUMBER]
    let limitClause: number | undefined;
    if (this.checkKeyword('LIMIT')) {
      this.advance(); // consume LIMIT
      if (this.match('NUMBER')) {
        limitClause = Number(this.previous().value);
        if (limitClause < 0 || !Number.isInteger(limitClause)) {
          this.error(`LIMIT value must be a positive integer, got '${this.previous().lexeme}'`);
        }
      } else {
        this.error(`Expected integer number after 'LIMIT', found '${this.peek().lexeme || 'EOF'}'`);
      }
    }

    // Expect ';'
    if (!this.match('SEMICOLON')) {
      this.error("Query must terminate with a semicolon ';'");
    }

    return {
      type: 'SelectQuery',
      selectList,
      isStar,
      fromTable,
      whereClause,
      orderByClause,
      limitClause,
      line: 1,
      column: 1
    };
  }

  // condition → condition OR and_cond | and_cond
  private condition(): ExprNode {
    let expr = this.andCond();

    while (this.checkKeyword('OR')) {
      const opToken = this.advance();
      const right = this.andCond();
      expr = {
        type: 'BinaryOp',
        operator: 'OR',
        left: expr,
        right,
        line: opToken.line,
        column: opToken.column
      };
    }

    return expr;
  }

  // and_cond → and_cond AND comparison | comparison
  private andCond(): ExprNode {
    let expr = this.comparison();

    while (this.checkKeyword('AND')) {
      const opToken = this.advance();
      const right = this.comparison();
      expr = {
        type: 'BinaryOp',
        operator: 'AND',
        left: expr,
        right,
        line: opToken.line,
        column: opToken.column
      };
    }

    return expr;
  }

  // comparison → expr relop expr
  private comparison(): ExprNode {
    const left = this.expr();

    if (this.match('RELOP')) {
      const opToken = this.previous();
      const right = this.expr();
      return {
        type: 'BinaryOp',
        operator: opToken.lexeme,
        left,
        right,
        line: opToken.line,
        column: opToken.column
      };
    }

    return left;
  }

  // expr → expr (+|-) term | term
  private expr(): ExprNode {
    let node = this.term();

    while (this.checkOp(['+', '-'])) {
      const opToken = this.advance();
      const right = this.term();
      node = {
        type: 'BinaryOp',
        operator: opToken.lexeme,
        left: node,
        right,
        line: opToken.line,
        column: opToken.column
      };
    }

    return node;
  }

  // term → term (*|/) factor | factor
  private term(): ExprNode {
    let node = this.factor();

    while (this.checkOp(['*', '/']) || this.check('STAR')) {
      const opToken = this.advance();
      const right = this.factor();
      node = {
        type: 'BinaryOp',
        operator: opToken.lexeme,
        left: node,
        right,
        line: opToken.line,
        column: opToken.column
      };
    }

    return node;
  }

  // factor → IDENT | NUMBER | STRING | '(' expr ')'
  private factor(): ExprNode {
    if (this.match('NUMBER')) {
      const t = this.previous();
      return {
        type: 'Literal',
        value: Number(t.value),
        rawType: 'NUMBER',
        line: t.line,
        column: t.column
      };
    }

    if (this.match('STRING')) {
      const t = this.previous();
      return {
        type: 'Literal',
        value: String(t.value),
        rawType: 'STRING',
        line: t.line,
        column: t.column
      };
    }

    if (this.match('IDENT')) {
      const t = this.previous();
      return {
        type: 'Identifier',
        name: t.lexeme,
        line: t.line,
        column: t.column
      };
    }

    if (this.match('LPAREN')) {
      const expr = this.condition();
      if (!this.match('RPAREN')) {
        this.error("Expected closing parenthesis ')' after expression");
      }
      return expr;
    }

    const t = this.peek();
    this.error(`Unexpected token '${t.lexeme || 'EOF'}' in expression`);
    // Return a dummy literal so parsing can continue
    return {
      type: 'Literal',
      value: 0,
      rawType: 'NUMBER',
      line: t.line,
      column: t.column
    };
  }

  // Panic Mode Synchronization
  private synchronize(syncKeywords: string[]) {
    this.recoveredCount++;
    while (!this.isAtEnd()) {
      const currentLexeme = this.peek().lexeme.toUpperCase();
      if (syncKeywords.some(kw => kw.toUpperCase() === currentLexeme)) {
        return;
      }
      if (this.peek().type === 'SEMICOLON') {
        return;
      }
      this.advance();
    }
  }

  private error(message: string) {
    const t = this.peek();
    this.diagnostics.push({
      phase: 'Parser',
      severity: 'error',
      message,
      line: t.line,
      column: t.column,
      recovered: true
    });
  }

  private checkKeyword(keyword: string): boolean {
    if (this.isAtEnd()) return false;
    const t = this.peek();
    return t.type === 'KEYWORD' && t.lexeme.toUpperCase() === keyword.toUpperCase();
  }

  private checkOp(ops: string[]): boolean {
    if (this.isAtEnd()) return false;
    const t = this.peek();
    return (t.type === 'ARITH_OP' || t.type === 'RELOP') && ops.includes(t.lexeme);
  }

  private check(type: string): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private match(...types: string[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.current >= this.tokens.length || this.peek().type === 'EOF';
  }

  private peek(): Token {
    return this.tokens[this.current] || { id: 0, type: 'EOF', lexeme: '', line: 1, column: 1 };
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }
}
