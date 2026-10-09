export type TokenType =
  | 'KEYWORD'
  | 'IDENT'
  | 'NUMBER'
  | 'STRING'
  | 'RELOP'
  | 'ARITH_OP'
  | 'STAR'
  | 'COMMA'
  | 'SEMICOLON'
  | 'LPAREN'
  | 'RPAREN'
  | 'ERROR'
  | 'EOF';

export interface Token {
  id: number;
  type: TokenType;
  lexeme: string;
  line: number;
  column: number;
  value?: string | number;
  error?: string;
}

export type ASTNodeType =
  | 'SelectQuery'
  | 'BinaryOp'
  | 'UnaryOp'
  | 'Identifier'
  | 'Literal'
  | 'Star';

export interface BaseASTNode {
  type: ASTNodeType;
  line?: number;
  column?: number;
}

export interface LiteralNode extends BaseASTNode {
  type: 'Literal';
  value: number | string | boolean;
  rawType: 'NUMBER' | 'STRING' | 'BOOLEAN';
}

export interface IdentifierNode extends BaseASTNode {
  type: 'Identifier';
  name: string;
}

export interface StarNode extends BaseASTNode {
  type: 'Star';
}

export interface BinaryOpNode extends BaseASTNode {
  type: 'BinaryOp';
  operator: string;
  left: ExprNode;
  right: ExprNode;
}

export type ExprNode = BinaryOpNode | IdentifierNode | LiteralNode | StarNode;

export interface OrderByClause {
  column: string;
  direction: 'ASC' | 'DESC';
}

export interface SelectQueryNode extends BaseASTNode {
  type: 'SelectQuery';
  selectList: (IdentifierNode | StarNode)[];
  isStar: boolean;
  fromTable: string;
  whereClause?: ExprNode;
  orderByClause?: OrderByClause;
  limitClause?: number;
}

export interface SymbolEntry {
  name: string;
  firstSeenLine: number;
  firstSeenColumn: number;
  occurrences: number;
  category: 'KEYWORD' | 'IDENTIFIER' | 'TABLE' | 'COLUMN';
  dataType?: 'INT' | 'FLOAT' | 'STRING' | 'BOOLEAN';
}

export interface ColumnSchema {
  name: string;
  type: 'INT' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  description?: string;
}

export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
}

export interface CompilerDiagnostic {
  phase: 'Lexer' | 'Parser' | 'Semantic' | 'Optimizer';
  severity: 'error' | 'warning' | 'info';
  message: string;
  line: number;
  column: number;
  recovered?: boolean;
}

export interface TACInstruction {
  index: number;
  label?: string;
  op: string; // e.g., '+', '*', '>', 'FILTER', 'PROJECT', 'SORT', 'LIMIT', 'ASSIGN'
  arg1?: string;
  arg2?: string;
  result: string;
  code: string;
  comment?: string;
}

export interface OptimizationLog {
  technique: 'Constant Folding' | 'Algebraic Simplification' | 'Dead Predicate Removal';
  before: string;
  after: string;
  explanation: string;
}

export interface ExecutionResult {
  columns: string[];
  rows: Record<string, any>[];
  totalRowsScanned: number;
  matchedRows: number;
  executionTimeMs: number;
  stepTrace: string[];
}
