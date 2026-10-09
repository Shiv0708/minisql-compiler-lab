export interface PythonFile {
  filename: string;
  description: string;
  code: string;
}

export const PYTHON_PROJECT_FILES: PythonFile[] = [
  {
    filename: 'lexer.py',
    description: 'Lexical Analyzer using ply.lex: Tokens, regex patterns, line/column tracking, illegal char handler',
    code: `import ply.lex as lex

# MiniSQL Lexer
# Practical: Lexical Analyzer implementation

tokens = (
    'SELECT', 'FROM', 'WHERE', 'ORDER', 'BY', 'LIMIT',
    'ASC', 'DESC', 'AND', 'OR',
    'IDENT', 'NUMBER', 'STRING',
    'RELOP', 'PLUS', 'MINUS', 'TIMES', 'DIVIDE',
    'STAR', 'COMMA', 'SEMICOLON', 'LPAREN', 'RPAREN'
)

reserved = {
    'select': 'SELECT',
    'from': 'FROM',
    'where': 'WHERE',
    'order': 'ORDER',
    'by': 'BY',
    'limit': 'LIMIT',
    'asc': 'ASC',
    'desc': 'DESC',
    'and': 'AND',
    'or': 'OR'
}

# Regular expression rules
t_STAR      = r'\\*'
t_COMMA     = r','
t_SEMICOLON = r';'
t_LPAREN    = r'\\('
t_RPAREN    = r'\\)'
t_PLUS      = r'\\+'
t_MINUS     = r'-'
t_TIMES     = r'\\*'
t_DIVIDE    = r'/'

def t_RELOP(t):
    r'>=|<=|!=|<>|=|>|<'
    if t.value == '<>':
        t.value = '!='
    return t

def t_NUMBER(t):
    r'\\d+(\\.\\d+)?'
    t.value = float(t.value) if '.' in t.value else int(t.value)
    return t

def t_STRING(t):
    r"'[^']*'|\\"[^\\"]*\\""
    t.value = t.value[1:-1]
    return t

def t_IDENT(t):
    r'[a-zA-Z_][a-zA-Z0-9_]*'
    t.type = reserved.get(t.value.lower(), 'IDENT')
    return t

t_ignore = ' \\t'

def t_newline(t):
    r'\\n+'
    t.lexer.lineno += len(t.value)

lexical_errors = []

def t_error(t):
    col = find_column(t.lexer.lexdata, t)
    lexical_errors.append({
        'line': t.lexer.lineno,
        'col': col,
        'char': t.value[0],
        'message': f"Illegal character '{t.value[0]}' at line {t.lexer.lineno}, col {col}"
    })
    t.lexer.skip(1)

def find_column(input_text, token):
    line_start = input_text.rfind('\\n', 0, token.lexpos) + 1
    return (token.lexpos - line_start) + 1

def build_lexer():
    return lex.lex()`
  },
  {
    filename: 'ast_nodes.py',
    description: 'Abstract Syntax Tree (AST) node definitions',
    code: `class ASTNode:
    pass

class SelectQuery(ASTNode):
    def __init__(self, select_list, from_table, where_clause=None, order_by=None, limit=None):
        self.select_list = select_list      # list of str or ['*']
        self.from_table = from_table        # str
        self.where_clause = where_clause    # ExprNode
        self.order_by = order_by            # tuple (column, 'ASC'|'DESC')
        self.limit = limit                  # int

class BinaryOp(ASTNode):
    def __init__(self, op, left, right):
        self.op = op
        self.left = left
        self.right = right

class Identifier(ASTNode):
    def __init__(self, name):
        self.name = name

class Literal(ASTNode):
    def __init__(self, value, raw_type):
        self.value = value
        self.raw_type = raw_type  # 'NUMBER', 'STRING', 'BOOLEAN'`
  },
  {
    filename: 'parser.py',
    description: 'Syntax Analyzer using ply.yacc: Grammar rules and panic-mode error recovery',
    code: `import ply.yacc as yacc
from lexer import tokens
from ast_nodes import SelectQuery, BinaryOp, Identifier, Literal

# Precedence for expressions
precedence = (
    ('left', 'OR'),
    ('left', 'AND'),
    ('nonassoc', 'RELOP'),
    ('left', 'PLUS', 'MINUS'),
    ('left', 'TIMES', 'DIVIDE', 'STAR'),
)

syntax_errors = []

def p_query(p):
    '''query : SELECT select_list FROM IDENT opt_where opt_order opt_limit SEMICOLON'''
    p[0] = SelectQuery(
        select_list=p[2],
        from_table=p[4],
        where_clause=p[5],
        order_by=p[6],
        limit=p[7]
    )

def p_select_list_star(p):
    '''select_list : STAR'''
    p[0] = ['*']

def p_select_list_cols(p):
    '''select_list : col_list'''
    p[0] = p[1]

def p_col_list(p):
    '''col_list : IDENT
                | col_list COMMA IDENT'''
    if len(p) == 2:
        p[0] = [p[1]]
    else:
        p[0] = p[1] + [p[3]]

def p_opt_where(p):
    '''opt_where : WHERE condition
                 | empty'''
    p[0] = p[2] if len(p) == 3 else None

def p_opt_order(p):
    '''opt_order : ORDER BY IDENT opt_dir
                 | empty'''
    p[0] = (p[3], p[4]) if len(p) == 5 else None

def p_opt_dir(p):
    '''opt_dir : ASC
               | DESC
               | empty'''
    p[0] = p[1] if p[1] else 'ASC'

def p_opt_limit(p):
    '''opt_limit : LIMIT NUMBER
                 | empty'''
    p[0] = int(p[2]) if len(p) == 3 else None

def p_condition_or(p):
    '''condition : condition OR and_cond
                 | and_cond'''
    p[0] = BinaryOp('OR', p[1], p[3]) if len(p) == 4 else p[1]

def p_and_cond(p):
    '''and_cond : and_cond AND comparison
                | comparison'''
    p[0] = BinaryOp('AND', p[1], p[3]) if len(p) == 4 else p[1]

def p_comparison(p):
    '''comparison : expr RELOP expr
                  | expr'''
    p[0] = BinaryOp(p[2], p[1], p[3]) if len(p) == 4 else p[1]

def p_expr_arith(p):
    '''expr : expr PLUS term
            | expr MINUS term
            | term'''
    p[0] = BinaryOp(p[2], p[1], p[3]) if len(p) == 4 else p[1]

def p_term_arith(p):
    '''term : term TIMES factor
            | term DIVIDE factor
            | term STAR factor
            | factor'''
    p[0] = BinaryOp(p[2], p[1], p[3]) if len(p) == 4 else p[1]

def p_factor_id(p):
    '''factor : IDENT'''
    p[0] = Identifier(p[1])

def p_factor_num(p):
    '''factor : NUMBER'''
    p[0] = Literal(p[1], 'NUMBER')

def p_factor_str(p):
    '''factor : STRING'''
    p[0] = Literal(p[1], 'STRING')

def p_factor_paren(p):
    '''factor : LPAREN condition RPAREN'''
    p[0] = p[2]

def p_empty(p):
    '''empty :'''
    pass

# Panic-mode error recovery
def p_error(p):
    if p:
        msg = f"Syntax error at '{p.value}' (line {p.lineno})"
        syntax_errors.append(msg)
        # Panic recovery: skip tokens until safe synchronization token
        while True:
            tok = yacc.token()
            if not tok or tok.type in ('SEMICOLON', 'FROM', 'WHERE', 'ORDER', 'LIMIT'):
                break
        yacc.errok()
    else:
        syntax_errors.append("Syntax error: Unexpected end of input (missing semicolon?)")

def build_parser():
    return yacc.yacc()`
  },
  {
    filename: 'symbol_table.py',
    description: 'Identifier Symbol Table and CSV Schema Catalog',
    code: `class SymbolTable:
    def __init__(self):
        self.entries = {}  # name -> dict

    def add(self, name, category, line=1, col=1, data_type=None):
        name_lower = name.lower()
        if name_lower in self.entries:
            self.entries[name_lower]['occurrences'] += 1
        else:
            self.entries[name_lower] = {
                'name': name,
                'category': category,
                'first_line': line,
                'first_col': col,
                'occurrences': 1,
                'data_type': data_type
            }

SCHEMA_CATALOG = {
    'students': {
        'roll_no': 'INT',
        'name': 'STRING',
        'marks': 'INT',
        'grade': 'STRING',
        'city': 'STRING',
        'age': 'INT'
    }
}`
  },
  {
    filename: 'semantic.py',
    description: 'Semantic Analyzer: Table validation, column verification, type compatibility',
    code: `from ast_nodes import Identifier, Literal, BinaryOp

class SemanticAnalyzer:
    def __init__(self, catalog):
        self.catalog = catalog
        self.errors = []
        self.warnings = []

    def check(self, ast):
        self.errors.clear()
        self.warnings.clear()

        # 1. Table check
        table_name = ast.from_table.lower()
        if table_name not in self.catalog:
            self.errors.append(f"Table '{ast.from_table}' does not exist in schema catalog.")
            return False

        table_cols = self.catalog[table_name]

        # 2. Select list check
        if ast.select_list != ['*']:
            seen = set()
            for col in ast.select_list:
                col_lower = col.lower()
                if col_lower not in table_cols:
                    self.errors.append(f"Column '{col}' does not exist in table '{table_name}'.")
                elif col_lower in seen:
                    self.warnings.append(f"Duplicate column '{col}' in SELECT list.")
                seen.add(col_lower)

        # 3. WHERE condition check & type verification
        if ast.where_clause:
            w_type = self._check_expr(ast.where_clause, table_cols)
            if w_type != 'BOOLEAN':
                self.errors.append(f"WHERE clause condition must evaluate to BOOLEAN, got {w_type}.")

        # 4. ORDER BY column check
        if ast.order_by:
            col, _ = ast.order_by
            if col.lower() not in table_cols:
                self.errors.append(f"Column '{col}' in ORDER BY does not exist in table '{table_name}'.")

        return len(self.errors) == 0

    def _check_expr(self, node, cols):
        if isinstance(node, Literal):
            return node.raw_type
        if isinstance(node, Identifier):
            col_l = node.name.lower()
            return cols.get(col_l, 'UNKNOWN')
        if isinstance(node, BinaryOp):
            lt = self._check_expr(node.left, cols)
            rt = self._check_expr(node.right, cols)

            if node.op in ('>', '<', '>=', '<=', '=', '!='):
                # Type compatibility rule
                if (lt in ('INT', 'FLOAT') and rt == 'STRING') or (lt == 'STRING' and rt in ('INT', 'FLOAT')):
                    self.errors.append(f"Type mismatch in comparison '{node.op}': Cannot compare {lt} and {rt}.")
                return 'BOOLEAN'
            if node.op in ('AND', 'OR'):
                return 'BOOLEAN'
            if node.op in ('+', '-', '*', '/'):
                if lt not in ('INT', 'FLOAT') or rt not in ('INT', 'FLOAT'):
                    self.errors.append(f"Arithmetic operator '{node.op}' requires numeric operands, got {lt} and {rt}.")
                return 'FLOAT'
        return 'UNKNOWN'`
  },
  {
    filename: 'tac.py',
    description: 'Intermediate Code Generator: Three-Address Code (TAC) generation',
    code: `from ast_nodes import Literal, Identifier, BinaryOp

class TACGenerator:
    def __init__(self):
        self.temp_count = 1
        self.code = []

    def new_temp(self):
        t = f"t{self.temp_count}"
        self.temp_count += 1
        return t

    def generate(self, ast):
        self.temp_count = 1
        self.code.clear()

        curr_src = ast.from_table

        # 1. Condition TAC
        if ast.where_clause:
            cond_t = self._expr_tac(ast.where_clause)
            filt_t = self.new_temp()
            self.code.append(f"{filt_t} = FILTER {curr_src} WHERE {cond_t}")
            curr_src = filt_t

        # 2. Projection TAC
        cols = "*" if ast.select_list == ['*'] else ", ".join(ast.select_list)
        proj_t = self.new_temp()
        self.code.append(f"{proj_t} = PROJECT {cols} FROM {curr_src}")
        curr_src = proj_t

        # 3. Sort TAC
        if ast.order_by:
            col, direction = ast.order_by
            sort_t = self.new_temp()
            self.code.append(f"{sort_t} = SORT {curr_src} BY {col} {direction}")
            curr_src = sort_t

        # 4. Limit TAC
        if ast.limit is not None:
            limit_t = self.new_temp()
            self.code.append(f"{limit_t} = LIMIT {curr_src} {ast.limit}")

        return self.code

    def _expr_tac(self, node):
        if isinstance(node, Literal):
            return repr(node.value) if isinstance(node.value, str) else str(node.value)
        if isinstance(node, Identifier):
            return node.name
        if isinstance(node, BinaryOp):
            l = self._expr_tac(node.left)
            r = self._expr_tac(node.right)
            t = self.new_temp()
            self.code.append(f"{t} = {l} {node.op} {r}")
            return t
        return ""`
  },
  {
    filename: 'optimizer.py',
    description: 'Code Optimizer: Constant folding, algebraic simplification, and dead predicate elimination',
    code: `from ast_nodes import Literal, Identifier, BinaryOp
from tac import TACGenerator

class Optimizer:
    def __init__(self):
        self.logs = []

    def optimize(self, ast):
        self.logs.clear()
        if ast.where_clause:
            ast.where_clause = self._fold(ast.where_clause)
            # Dead predicate removal
            if isinstance(ast.where_clause, Literal) and ast.where_clause.value in (True, 1):
                self.logs.append("Dead predicate removed: WHERE condition always TRUE (1=1).")
                ast.where_clause = None

        gen = TACGenerator()
        return gen.generate(ast), self.logs

    def _fold(self, node):
        if not isinstance(node, BinaryOp):
            return node

        node.left = self._fold(node.left)
        node.right = self._fold(node.right)

        # 1. Constant folding
        if isinstance(node.left, Literal) and isinstance(node.right, Literal):
            l, r = node.left.value, node.right.value
            if isinstance(l, (int, float)) and isinstance(r, (int, float)):
                if node.op == '+': res = l + r
                elif node.op == '-': res = l - r
                elif node.op == '*': res = l * r
                elif node.op == '/' and r != 0: res = l / r
                elif node.op == '>': res = l > r
                elif node.op == '<': res = l < r
                elif node.op == '=': res = l == r
                elif node.op == '!=': res = l != r
                else: res = None

                if res is not None:
                    self.logs.append(f"Constant Folding: {l} {node.op} {r} -> {res}")
                    raw = 'BOOLEAN' if isinstance(res, bool) else 'NUMBER'
                    return Literal(res, raw)

        # 2. Algebraic simplification
        if node.op == '+' and isinstance(node.right, Literal) and node.right.value == 0:
            self.logs.append("Algebraic Simplification: x + 0 -> x")
            return node.left
        if node.op == '*' and isinstance(node.right, Literal) and node.right.value == 1:
            self.logs.append("Algebraic Simplification: x * 1 -> x")
            return node.left

        return node`
  },
  {
    filename: 'executor.py',
    description: 'Execution Engine: Interprets AST/TAC over CSV data',
    code: `import csv

class CSVExecutor:
    def __init__(self, csv_filepath):
        self.csv_filepath = csv_filepath
        self.rows = []
        self._load()

    def _load(self):
        with open(self.csv_filepath, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                parsed = {}
                for k, v in row.items():
                    try:
                        parsed[k] = float(v) if '.' in v else int(v)
                    except ValueError:
                        parsed[k] = v
                self.rows.append(parsed)

    def execute(self, ast):
        data = list(self.rows)

        # 1. Filter
        if ast.where_clause:
            data = [r for r in data if self._eval(ast.where_clause, r)]

        # 2. Sort
        if ast.order_by:
            col, direction = ast.order_by
            rev = (direction.upper() == 'DESC')
            data.sort(key=lambda r: r.get(col, 0), reverse=rev)

        # 3. Limit
        if ast.limit is not None:
            data = data[:ast.limit]

        # 4. Project
        if ast.select_list != ['*']:
            data = [{c: r[c] for c in ast.select_list if c in r} for r in data]

        return data

    def _eval(self, node, row):
        from ast_nodes import Literal, Identifier, BinaryOp
        if isinstance(node, Literal):
            return node.value
        if isinstance(node, Identifier):
            return row.get(node.name)
        if isinstance(node, BinaryOp):
            l = self._eval(node.left, row)
            r = self._eval(node.right, row)
            op = node.op
            if op == '+': return l + r
            if op == '-': return l - r
            if op == '*': return l * r
            if op == '/': return l / r if r != 0 else 0
            if op == '>': return l > r
            if op == '<': return l < r
            if op == '>=': return l >= r
            if op == '<=': return l <= r
            if op == '=': return l == r
            if op == '!=': return l != r
            if op == 'AND': return bool(l) and bool(r)
            if op == 'OR': return bool(l) or bool(r)
        return False`
  },
  {
    filename: 'students.csv',
    description: 'Sample CSV dataset representing the students table',
    code: `roll_no,name,marks,grade,city,age
101,Aarav Sharma,92,A,Delhi,20
102,Priya Patel,78,B,Mumbai,21
103,Rohan Verma,85,A,Bangalore,20
104,Sneha Rao,45,D,Hyderabad,22
105,Vikram Singh,62,C,Jaipur,21
106,Ananya Iyer,95,A,Chennai,19
107,Karan Malhotra,38,F,Delhi,22
108,Divya Nair,88,A,Kochi,20
109,Rahul Gupta,71,B,Pune,21
110,Meera Joshi,81,A,Ahmedabad,20`
  },
  {
    filename: 'viva_prep.md',
    description: 'Viva Voice preparation questions and clear answers for the lab defense',
    code: `# MiniSQL Compiler Viva Voice Questions & Answers

### 1. Why did you choose PLY (Python Lex-Yacc)?
**Answer:** PLY mirrors the classic UNIX compiler tools Lex (Flex) and Yacc (Bison). It enforces genuine compiler design principles (defining regular expressions for tokens and context-free grammar with BNF notation in LALR(1) tables) while allowing interactive inspection and visualization.

### 2. What parsing technique does this compiler use?
**Answer:** It uses LALR(1) parsing (Lookahead LR with 1 lookahead token). PLY constructs a Shift-Reduce parsing table. It uses precedence declarations to resolve shift/reduce ambiguities in arithmetic and logical operators.

### 3. How does panic-mode error recovery work?
**Answer:** When an unexpected token is encountered in \`p_error\`, rather than immediately crashing, the parser discards incoming tokens until it encounters a known "synchronizing token" (such as \`FROM\`, \`WHERE\`, \`ORDER\`, \`LIMIT\`, or \`;\`). Once a synchronizing token is reached, it re-aligns its state and continues parsing the remaining clauses. This allows the compiler to report multiple distinct errors in a single pass.

### 4. What is stored in your symbol table?
**Answer:** We maintain two symbol tables:
1. **Identifier Table:** Contains all tokens identified as identifiers or keywords during lexical analysis, including lexeme name, category (KEYWORD / TABLE / COLUMN), first seen line & column, and frequency of occurrence.
2. **Schema Catalog:** Contains metadata about relational tables and their attribute definitions (column name, data type: INT, STRING, FLOAT, etc.).

### 5. Why do we perform constant folding in intermediate code?
**Answer:** Constant folding evaluates constant expressions at compile-time instead of runtime. For example, \`marks > 40 + 40\` evaluates \`40 + 40\` to \`80\` once during compilation, preventing repetitive arithmetic computations for every row scanned during database execution.

### 6. What is Three-Address Code (TAC)?
**Answer:** Three-Address Code is a linearized representation of the AST where every instruction has at most one operator and at most three operands (two inputs and one destination result, e.g., \`t1 = a + b\`). This bridges high-level relational expressions with low-level procedural execution steps.`
  }
];
