import { SelectQueryNode, ExprNode, ExecutionResult } from './types';

export class MiniSQLExecutor {
  public execute(
    ast: SelectQueryNode,
    tableRows: Record<string, any>[],
    isAlwaysFalse = false
  ): ExecutionResult {
    const startTime = performance.now();
    const trace: string[] = [];

    trace.push(`1. Loaded table '${ast.fromTable}' with ${tableRows.length} total rows.`);

    if (isAlwaysFalse) {
      trace.push('2. Optimization determined predicate is ALWAYS FALSE. Filtered out 100% of rows immediately.');
      return {
        columns: ast.isStar ? Object.keys(tableRows[0] || {}) : ast.selectList.map(s => (s.type === 'Identifier' ? s.name : '*')),
        rows: [],
        totalRowsScanned: tableRows.length,
        matchedRows: 0,
        executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
        stepTrace: trace
      };
    }

    // Filter stage
    let currentRows = [...tableRows];
    if (ast.whereClause) {
      currentRows = currentRows.filter(row => this.evaluateExpr(ast.whereClause!, row));
      trace.push(
        `2. Executed FILTER: Evaluated condition across ${tableRows.length} rows; ${currentRows.length} matched.`
      );
    } else {
      trace.push('2. FILTER stage bypassed (no WHERE predicate or removed by dead-code elimination).');
    }

    // Sort stage
    if (ast.orderByClause) {
      const { column, direction } = ast.orderByClause;
      currentRows.sort((a, b) => {
        const valA = a[column];
        const valB = b[column];

        if (typeof valA === 'number' && typeof valB === 'number') {
          return direction === 'ASC' ? valA - valB : valB - valA;
        }

        const strA = String(valA ?? '');
        const strB = String(valB ?? '');
        return direction === 'ASC' ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
      trace.push(`3. Executed SORT: Ordered ${currentRows.length} rows by column '${column}' (${direction}).`);
    }

    // Limit stage
    if (ast.limitClause !== undefined) {
      const origCount = currentRows.length;
      currentRows = currentRows.slice(0, ast.limitClause);
      trace.push(`4. Executed LIMIT: Truncated from ${origCount} to first ${ast.limitClause} rows.`);
    }

    // Projection stage
    let outputColumns: string[] = [];
    if (ast.isStar) {
      outputColumns = tableRows.length > 0 ? Object.keys(tableRows[0]) : ['*'];
    } else {
      outputColumns = ast.selectList
        .filter(item => item.type === 'Identifier')
        .map(item => (item as any).name);
    }

    const projectedRows = currentRows.map(row => {
      if (ast.isStar) {
        return { ...row };
      }
      const projected: Record<string, any> = {};
      outputColumns.forEach(col => {
        // case-insensitive match on row keys if needed
        const actualKey = Object.keys(row).find(k => k.toLowerCase() === col.toLowerCase()) || col;
        projected[col] = row[actualKey];
      });
      return projected;
    });

    trace.push(
      `5. Executed PROJECT: Generated final result relation with ${outputColumns.length} columns and ${projectedRows.length} rows.`
    );

    const endTime = performance.now();

    return {
      columns: outputColumns,
      rows: projectedRows,
      totalRowsScanned: tableRows.length,
      matchedRows: projectedRows.length,
      executionTimeMs: Number((endTime - startTime).toFixed(2)),
      stepTrace: trace
    };
  }

  private evaluateExpr(node: ExprNode, row: Record<string, any>): any {
    if (node.type === 'Literal') {
      return node.value;
    }

    if (node.type === 'Identifier') {
      const key = Object.keys(row).find(k => k.toLowerCase() === node.name.toLowerCase());
      return key ? row[key] : undefined;
    }

    if (node.type === 'BinaryOp') {
      const left = this.evaluateExpr(node.left, row);
      const right = this.evaluateExpr(node.right, row);
      const op = node.operator;

      switch (op) {
        case '+':
          return Number(left) + Number(right);
        case '-':
          return Number(left) - Number(right);
        case '*':
          return Number(left) * Number(right);
        case '/':
          return Number(right) !== 0 ? Number(left) / Number(right) : 0;
        case '>':
          return left > right;
        case '<':
          return left < right;
        case '>=':
          return left >= right;
        case '<=':
          return left <= right;
        case '=':
          return left == right;
        case '!=':
          return left != right;
        case 'AND':
          return Boolean(left) && Boolean(right);
        case 'OR':
          return Boolean(left) || Boolean(right);
        default:
          return false;
      }
    }

    return false;
  }
}
