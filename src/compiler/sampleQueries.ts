export interface SampleQuery {
  id: string;
  title: string;
  category: 'Valid' | 'Optimization' | 'Lexical Error' | 'Syntax Error' | 'Semantic Error';
  query: string;
  description: string;
  expectedOutcome: string;
}

export const SAMPLE_QUERIES: SampleQuery[] = [
  {
    id: 'basic-select',
    title: 'Basic SELECT with Projection',
    category: 'Valid',
    query: 'SELECT name, marks FROM students;',
    description: 'Projects two columns from the students table.',
    expectedOutcome: 'Valid query. Tokens extracted, Symbol table populated, AST generated, TAC produced and executed successfully.'
  },
  {
    id: 'constant-folding',
    title: 'Arithmetic & Constant Folding',
    category: 'Optimization',
    query: 'SELECT name, marks FROM students WHERE marks > 40 + 40;',
    description: 'Contains arithmetic constant expression (40 + 40).',
    expectedOutcome: 'Optimizer folds (40 + 40) into 80 at compile time. Before TAC has 4 instructions, After TAC is simplified.'
  },
  {
    id: 'algebraic-simplification',
    title: 'Algebraic Simplification & Dead Predicate',
    category: 'Optimization',
    query: 'SELECT name, marks FROM students WHERE 1 = 1;',
    description: 'Predicate is a tautology (1 = 1 is always TRUE).',
    expectedOutcome: 'Optimizer detects always-true condition, removes FILTER stage completely from TAC!'
  },
  {
    id: 'order-limit',
    title: 'Complex Query: WHERE + ORDER BY + LIMIT',
    category: 'Valid',
    query: 'SELECT name, marks, grade, city FROM students WHERE marks >= 70 ORDER BY marks DESC LIMIT 3;',
    description: 'Full query with condition, sorting, and limit.',
    expectedOutcome: 'Complete pipeline generates FILTER, PROJECT, SORT, and LIMIT TAC operations.'
  },
  {
    id: 'select-star',
    title: 'SELECT * All Columns',
    category: 'Valid',
    query: 'SELECT * FROM students WHERE marks < 50;',
    description: 'Wildcard projection with comparison.',
    expectedOutcome: 'Matches students with marks under 50 and outputs all 6 attributes.'
  },
  {
    id: 'lex-error',
    title: 'Lexical Error (Illegal Symbol @)',
    category: 'Lexical Error',
    query: 'SELECT name @ FROM students;',
    description: 'Contains illegal character @ not in language alphabet.',
    expectedOutcome: 'Lexer flags illegal character @ at line 1, col 13 with diagnostic error.'
  },
  {
    id: 'syntax-panic',
    title: 'Syntax Error (Missing Columns before FROM)',
    category: 'Syntax Error',
    query: 'SELECT FROM students;',
    description: 'Missing column list between SELECT and FROM.',
    expectedOutcome: 'Parser detects missing column, engages panic-mode recovery, and reports syntax error.'
  },
  {
    id: 'multiple-syntax-errors',
    title: 'Panic Recovery (Multiple Errors in One Query)',
    category: 'Syntax Error',
    query: 'SELECT FROM students WHERE ;',
    description: 'Demonstrates panic mode recovering across multiple syntax mistakes.',
    expectedOutcome: 'Recovers across clauses and reports both missing column list and incomplete WHERE clause.'
  },
  {
    id: 'semantic-col-not-found',
    title: 'Semantic Error (Unknown Column)',
    category: 'Semantic Error',
    query: 'SELECT name, salary FROM students;',
    description: 'Column "salary" does not exist in schema catalog for table "students".',
    expectedOutcome: 'Lexer & Parser succeed, but Semantic Analyzer halts: column "salary" does not exist.'
  },
  {
    id: 'semantic-table-not-found',
    title: 'Semantic Error (Unknown Table)',
    category: 'Semantic Error',
    query: 'SELECT name, marks FROM teachers;',
    description: 'Table "teachers" is not in schema catalog.',
    expectedOutcome: 'Semantic Analyzer catches unknown table "teachers".'
  },
  {
    id: 'semantic-type-mismatch',
    title: "Semantic Error (Type Mismatch: marks > 'abc')",
    category: 'Semantic Error',
    query: "SELECT name, marks FROM students WHERE marks > 'abc';",
    description: 'Attempting to compare numeric column "marks" with string literal "abc".',
    expectedOutcome: 'Semantic Analyzer flags Type Mismatch: Cannot compare INT and STRING.'
  }
];
