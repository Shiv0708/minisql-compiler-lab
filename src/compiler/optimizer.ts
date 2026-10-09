import {
  SelectQueryNode,
  ExprNode,
  BinaryOpNode,
  LiteralNode,
  OptimizationLog,
  TACInstruction
} from './types';
import { TACGenerator } from './tac';

export interface OptimizerResult {
  optimizedAst: SelectQueryNode;
  optimizedTac: TACInstruction[];
  logs: OptimizationLog[];
  removedFilter: boolean;
  isAlwaysFalse: boolean;
}

export class MiniSQLOptimizer {
  private logs: OptimizationLog[] = [];
  private removedFilter = false;
  private isAlwaysFalse = false;

  public optimize(ast: SelectQueryNode): OptimizerResult {
    this.logs = [];
    this.removedFilter = false;
    this.isAlwaysFalse = false;

    // Deep clone the AST so we don't mutate original
    const clonedAst: SelectQueryNode = JSON.parse(JSON.stringify(ast));

    if (clonedAst.whereClause) {
      const optimizedWhere = this.optimizeExpr(clonedAst.whereClause);

      // Check if WHERE clause simplified to a constant literal
      if (optimizedWhere.type === 'Literal') {
        if (
          optimizedWhere.value === true ||
          optimizedWhere.value === 1 ||
          optimizedWhere.value === 'true'
        ) {
          this.logs.push({
            technique: 'Dead Predicate Removal',
            before: `WHERE ${this.formatExpr(clonedAst.whereClause)}`,
            after: '(Predicate eliminated)',
            explanation: 'Condition is a tautology (always TRUE). Filter stage bypassed.'
          });
          clonedAst.whereClause = undefined;
          this.removedFilter = true;
        } else if (
          optimizedWhere.value === false ||
          optimizedWhere.value === 0 ||
          optimizedWhere.value === 'false'
        ) {
          this.logs.push({
            technique: 'Dead Predicate Removal',
            before: `WHERE ${this.formatExpr(clonedAst.whereClause)}`,
            after: 'EMPTY RESULT',
            explanation: 'Condition is a contradiction (always FALSE). Returns 0 rows directly.'
          });
          this.isAlwaysFalse = true;
          clonedAst.whereClause = optimizedWhere;
        } else {
          clonedAst.whereClause = optimizedWhere;
        }
      } else {
        clonedAst.whereClause = optimizedWhere;
      }
    }

    // Re-generate TAC for optimized AST
    const tacGen = new TACGenerator();
    const optimizedTac = tacGen.generate(clonedAst);

    return {
      optimizedAst: clonedAst,
      optimizedTac,
      logs: this.logs,
      removedFilter: this.removedFilter,
      isAlwaysFalse: this.isAlwaysFalse
    };
  }

  private optimizeExpr(node: ExprNode): ExprNode {
    if (node.type !== 'BinaryOp') {
      return node;
    }

    // Recursively optimize left and right children first (bottom-up)
    const left = this.optimizeExpr(node.left);
    const right = this.optimizeExpr(node.right);
    const op = node.operator;

    // 1. Constant Folding: Both children are constants
    if (left.type === 'Literal' && right.type === 'Literal') {
      const lVal = left.value;
      const rVal = right.value;

      // Arithmetic folding
      if (typeof lVal === 'number' && typeof rVal === 'number') {
        let foldedNum: number | null = null;
        if (op === '+') foldedNum = lVal + rVal;
        else if (op === '-') foldedNum = lVal - rVal;
        else if (op === '*') foldedNum = lVal * rVal;
        else if (op === '/' && rVal !== 0) foldedNum = lVal / rVal;

        if (foldedNum !== null) {
          const beforeStr = `${lVal} ${op} ${rVal}`;
          this.logs.push({
            technique: 'Constant Folding',
            before: beforeStr,
            after: String(foldedNum),
            explanation: `Pre-computed constant arithmetic expression (${lVal} ${op} ${rVal} = ${foldedNum}) at compile time.`
          });
          return {
            type: 'Literal',
            value: foldedNum,
            rawType: 'NUMBER',
            line: node.line,
            column: node.column
          };
        }
      }

      // Relational folding for constants (e.g. 1 = 1, 40 > 20)
      if (['=', '!=', '>', '<', '>=', '<='].includes(op)) {
        let boolRes: boolean | null = null;
        if (op === '=') boolRes = lVal === rVal;
        else if (op === '!=') boolRes = lVal !== rVal;
        else if (typeof lVal === 'number' && typeof rVal === 'number') {
          if (op === '>') boolRes = lVal > rVal;
          else if (op === '<') boolRes = lVal < rVal;
          else if (op === '>=') boolRes = lVal >= rVal;
          else if (op === '<=') boolRes = lVal <= rVal;
        }

        if (boolRes !== null) {
          const beforeStr = `${lVal} ${op} ${rVal}`;
          this.logs.push({
            technique: 'Constant Folding',
            before: beforeStr,
            after: boolRes ? 'TRUE' : 'FALSE',
            explanation: `Pre-evaluated constant comparison predicate to ${boolRes ? 'TRUE' : 'FALSE'}.`
          });
          return {
            type: 'Literal',
            value: boolRes,
            rawType: 'BOOLEAN',
            line: node.line,
            column: node.column
          };
        }
      }
    }

    // 2. Algebraic Simplification
    // (x + 0) or (0 + x) -> x
    if (op === '+') {
      if (right.type === 'Literal' && right.value === 0) {
        this.logs.push({
          technique: 'Algebraic Simplification',
          before: `${this.formatExpr(left)} + 0`,
          after: this.formatExpr(left),
          explanation: 'Identity property of addition: X + 0 = X.'
        });
        return left;
      }
      if (left.type === 'Literal' && left.value === 0) {
        this.logs.push({
          technique: 'Algebraic Simplification',
          before: `0 + ${this.formatExpr(right)}`,
          after: this.formatExpr(right),
          explanation: 'Identity property of addition: 0 + X = X.'
        });
        return right;
      }
    }

    // (x - 0) -> x
    if (op === '-') {
      if (right.type === 'Literal' && right.value === 0) {
        this.logs.push({
          technique: 'Algebraic Simplification',
          before: `${this.formatExpr(left)} - 0`,
          after: this.formatExpr(left),
          explanation: 'Identity property of subtraction: X - 0 = X.'
        });
        return left;
      }
    }

    // (x * 1) or (1 * x) -> x
    if (op === '*') {
      if (right.type === 'Literal' && right.value === 1) {
        this.logs.push({
          technique: 'Algebraic Simplification',
          before: `${this.formatExpr(left)} * 1`,
          after: this.formatExpr(left),
          explanation: 'Identity property of multiplication: X * 1 = X.'
        });
        return left;
      }
      if (left.type === 'Literal' && left.value === 1) {
        this.logs.push({
          technique: 'Algebraic Simplification',
          before: `1 * ${this.formatExpr(right)}`,
          after: this.formatExpr(right),
          explanation: 'Identity property of multiplication: 1 * X = X.'
        });
        return right;
      }
      // (x * 0) or (0 * x) -> 0
      if (
        (right.type === 'Literal' && right.value === 0) ||
        (left.type === 'Literal' && left.value === 0)
      ) {
        this.logs.push({
          technique: 'Algebraic Simplification',
          before: `${this.formatExpr(left)} * ${this.formatExpr(right)}`,
          after: '0',
          explanation: 'Zero multiplication property: X * 0 = 0.'
        });
        return {
          type: 'Literal',
          value: 0,
          rawType: 'NUMBER',
          line: node.line,
          column: node.column
        };
      }
    }

    // (x / 1) -> x
    if (op === '/') {
      if (right.type === 'Literal' && right.value === 1) {
        this.logs.push({
          technique: 'Algebraic Simplification',
          before: `${this.formatExpr(left)} / 1`,
          after: this.formatExpr(left),
          explanation: 'Division identity: X / 1 = X.'
        });
        return left;
      }
    }

    return {
      type: 'BinaryOp',
      operator: op,
      left,
      right,
      line: node.line,
      column: node.column
    };
  }

  private formatExpr(node: ExprNode): string {
    if (node.type === 'Literal') {
      return typeof node.value === 'string' ? `'${node.value}'` : String(node.value);
    }
    if (node.type === 'Identifier') {
      return node.name;
    }
    if (node.type === 'BinaryOp') {
      return `(${this.formatExpr(node.left)} ${node.operator} ${this.formatExpr(node.right)})`;
    }
    return '';
  }
}
