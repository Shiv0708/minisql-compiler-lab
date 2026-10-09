import { SelectQueryNode, ExprNode, TACInstruction } from './types';

export class TACGenerator {
  private tempCounter = 1;
  private instructions: TACInstruction[] = [];

  public generate(ast: SelectQueryNode): TACInstruction[] {
    this.tempCounter = 1;
    this.instructions = [];

    let currentSource = ast.fromTable;

    // 1. If there is a WHERE clause, generate TAC for the expression
    if (ast.whereClause) {
      const conditionVar = this.generateExprTAC(ast.whereClause);
      const filterVar = this.newTemp();
      this.instructions.push({
        index: this.instructions.length + 1,
        op: 'FILTER',
        arg1: currentSource,
        arg2: conditionVar,
        result: filterVar,
        code: `${filterVar} = FILTER ${currentSource} WHERE ${conditionVar}`,
        comment: `Filter rows from ${currentSource} where ${conditionVar} is true`
      });
      currentSource = filterVar;
    }

    // 2. PROJECT clause
    const cols = ast.isStar
      ? '*'
      : ast.selectList.map(item => (item.type === 'Identifier' ? item.name : '*')).join(', ');
    const projVar = this.newTemp();
    this.instructions.push({
      index: this.instructions.length + 1,
      op: 'PROJECT',
      arg1: currentSource,
      arg2: cols,
      result: projVar,
      code: `${projVar} = PROJECT ${cols} FROM ${currentSource}`,
      comment: `Project selected columns (${cols})`
    });
    currentSource = projVar;

    // 3. ORDER BY clause
    if (ast.orderByClause) {
      const sortVar = this.newTemp();
      const dir = ast.orderByClause.direction;
      const col = ast.orderByClause.column;
      this.instructions.push({
        index: this.instructions.length + 1,
        op: 'SORT',
        arg1: currentSource,
        arg2: `${col} ${dir}`,
        result: sortVar,
        code: `${sortVar} = SORT ${currentSource} BY ${col} ${dir}`,
        comment: `Sort result by ${col} in ${dir} order`
      });
      currentSource = sortVar;
    }

    // 4. LIMIT clause
    if (ast.limitClause !== undefined) {
      const limitVar = this.newTemp();
      this.instructions.push({
        index: this.instructions.length + 1,
        op: 'LIMIT',
        arg1: currentSource,
        arg2: String(ast.limitClause),
        result: limitVar,
        code: `${limitVar} = LIMIT ${currentSource} ${ast.limitClause}`,
        comment: `Truncate output to first ${ast.limitClause} rows`
      });
      currentSource = limitVar;
    }

    return this.instructions;
  }

  private generateExprTAC(node: ExprNode): string {
    if (node.type === 'Literal') {
      if (typeof node.value === 'string') {
        return `'${node.value}'`;
      }
      return String(node.value);
    }

    if (node.type === 'Identifier') {
      return node.name;
    }

    if (node.type === 'BinaryOp') {
      const leftVar = this.generateExprTAC(node.left);
      const rightVar = this.generateExprTAC(node.right);
      const resultVar = this.newTemp();

      this.instructions.push({
        index: this.instructions.length + 1,
        op: node.operator,
        arg1: leftVar,
        arg2: rightVar,
        result: resultVar,
        code: `${resultVar} = ${leftVar} ${node.operator} ${rightVar}`,
        comment: `Evaluate ${node.operator} operation`
      });

      return resultVar;
    }

    return '';
  }

  private newTemp(): string {
    return `t${this.tempCounter++}`;
  }
}
