import {
  SelectQueryNode,
  TableSchema,
  CompilerDiagnostic,
  ExprNode,
  BinaryOpNode
} from './types';

export interface SemanticResult {
  isValid: boolean;
  diagnostics: CompilerDiagnostic[];
  tableSchema?: TableSchema;
}

type DataType = 'INT' | 'FLOAT' | 'STRING' | 'BOOLEAN' | 'UNKNOWN';

export class SemanticAnalyzer {
  private diagnostics: CompilerDiagnostic[] = [];
  private catalog: Map<string, TableSchema>;

  constructor(catalogList: TableSchema[]) {
    this.catalog = new Map();
    catalogList.forEach(t => this.catalog.set(t.name.toLowerCase(), t));
  }

  public analyze(ast: SelectQueryNode | null): SemanticResult {
    this.diagnostics = [];
    if (!ast) {
      return { isValid: false, diagnostics: this.diagnostics };
    }

    // 1. Table existence check
    const tableNameLower = ast.fromTable.toLowerCase();
    const tableSchema = this.catalog.get(tableNameLower);

    if (!tableNameLower) {
      this.addError("No table specified in FROM clause", ast.line || 1, ast.column || 1);
      return { isValid: false, diagnostics: this.diagnostics };
    }

    if (!tableSchema) {
      this.addError(
        `Table '${ast.fromTable}' does not exist in schema catalog. Available tables: [${Array.from(this.catalog.keys()).join(', ')}]`,
        ast.line || 1,
        ast.column || 1
      );
      return { isValid: false, diagnostics: this.diagnostics };
    }

    // Map column names for easy lookup
    const colMap = new Map<string, 'INT' | 'FLOAT' | 'STRING' | 'BOOLEAN'>();
    tableSchema.columns.forEach(c => colMap.set(c.name.toLowerCase(), c.type));

    // 2. Select list verification
    if (!ast.isStar) {
      const seenCols = new Set<string>();
      ast.selectList.forEach(node => {
        if (node.type === 'Identifier') {
          const colName = node.name.toLowerCase();
          if (!colMap.has(colName)) {
            this.addError(
              `Column '${node.name}' does not exist in table '${tableSchema.name}'. Available columns: ${tableSchema.columns.map(c => c.name).join(', ')}`,
              node.line || 1,
              node.column || 1
            );
          } else {
            if (seenCols.has(colName)) {
              this.addWarning(
                `Duplicate column '${node.name}' in SELECT list`,
                node.line || 1,
                node.column || 1
              );
            }
            seenCols.add(colName);
          }
        }
      });
    }

    // 3. WHERE clause verification & type checking
    if (ast.whereClause) {
      const exprType = this.checkExprType(ast.whereClause, colMap, tableSchema.name);
      if (exprType !== 'BOOLEAN' && exprType !== 'UNKNOWN') {
        this.addError(
          `WHERE clause must evaluate to a boolean condition, but evaluates to '${exprType}'`,
          ast.whereClause.line || 1,
          ast.whereClause.column || 1
        );
      }
    }

    // 4. ORDER BY clause verification
    if (ast.orderByClause) {
      const orderCol = ast.orderByClause.column.toLowerCase();
      if (!colMap.has(orderCol)) {
        this.addError(
          `Column '${ast.orderByClause.column}' in ORDER BY clause does not exist in table '${tableSchema.name}'`,
          ast.line || 1,
          ast.column || 1
        );
      }
    }

    const hasErrors = this.diagnostics.some(d => d.severity === 'error');

    return {
      isValid: !hasErrors,
      diagnostics: this.diagnostics,
      tableSchema
    };
  }

  private checkExprType(
    node: ExprNode,
    colMap: Map<string, 'INT' | 'FLOAT' | 'STRING' | 'BOOLEAN'>,
    tableName: string
  ): DataType {
    if (node.type === 'Literal') {
      if (node.rawType === 'NUMBER') return 'FLOAT';
      if (node.rawType === 'STRING') return 'STRING';
      return 'BOOLEAN';
    }

    if (node.type === 'Identifier') {
      const colName = node.name.toLowerCase();
      if (!colMap.has(colName)) {
        this.addError(
          `Unknown column '${node.name}' used in expression (not in '${tableName}')`,
          node.line || 1,
          node.column || 1
        );
        return 'UNKNOWN';
      }
      return colMap.get(colName)!;
    }

    if (node.type === 'BinaryOp') {
      const leftType = this.checkExprType(node.left, colMap, tableName);
      const rightType = this.checkExprType(node.right, colMap, tableName);

      // Logical operators: AND, OR
      if (node.operator === 'AND' || node.operator === 'OR') {
        if (leftType !== 'BOOLEAN' && leftType !== 'UNKNOWN') {
          this.addError(
            `Left side of '${node.operator}' must be a boolean comparison, got '${leftType}'`,
            node.line || 1,
            node.column || 1
          );
        }
        if (rightType !== 'BOOLEAN' && rightType !== 'UNKNOWN') {
          this.addError(
            `Right side of '${node.operator}' must be a boolean comparison, got '${rightType}'`,
            node.line || 1,
            node.column || 1
          );
        }
        return 'BOOLEAN';
      }

      // Relational operators: >, <, >=, <=, =, !=
      const isRelop = ['>', '<', '>=', '<=', '=', '!='].includes(node.operator);
      if (isRelop) {
        if (leftType !== 'UNKNOWN' && rightType !== 'UNKNOWN') {
          const isLeftNumeric = leftType === 'INT' || leftType === 'FLOAT';
          const isRightNumeric = rightType === 'INT' || rightType === 'FLOAT';

          if (isLeftNumeric !== isRightNumeric) {
            this.addError(
              `Type mismatch in comparison '${node.operator}': Cannot compare '${leftType}' with '${rightType}'`,
              node.line || 1,
              node.column || 1
            );
          } else if (
            (node.operator === '>' || node.operator === '<' || node.operator === '>=' || node.operator === '<=') &&
            leftType === 'STRING' &&
            rightType === 'STRING'
          ) {
            // Permissible or note warning
          }
        }
        return 'BOOLEAN';
      }

      // Arithmetic operators: +, -, *, /
      const isArith = ['+', '-', '*', '/'].includes(node.operator);
      if (isArith) {
        if (leftType !== 'UNKNOWN' && leftType !== 'INT' && leftType !== 'FLOAT') {
          this.addError(
            `Operator '${node.operator}' cannot be applied to type '${leftType}'`,
            node.line || 1,
            node.column || 1
          );
        }
        if (rightType !== 'UNKNOWN' && rightType !== 'INT' && rightType !== 'FLOAT') {
          this.addError(
            `Operator '${node.operator}' cannot be applied to type '${rightType}'`,
            node.line || 1,
            node.column || 1
          );
        }
        return 'FLOAT';
      }
    }

    return 'UNKNOWN';
  }

  private addError(message: string, line: number, column: number) {
    this.diagnostics.push({
      phase: 'Semantic',
      severity: 'error',
      message,
      line,
      column
    });
  }

  private addWarning(message: string, line: number, column: number) {
    this.diagnostics.push({
      phase: 'Semantic',
      severity: 'warning',
      message,
      line,
      column
    });
  }
}
