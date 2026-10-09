import React, { useState } from 'react';
import { SelectQueryNode, ExprNode } from '../compiler/types';
import { GitCommit, Code, ChevronRight, ChevronDown } from 'lucide-react';

interface ASTTreeViewProps {
  ast: SelectQueryNode | null;
}

export const ASTTreeView: React.FC<ASTTreeViewProps> = ({ ast }) => {
  const [viewMode, setViewMode] = useState<'diagram' | 'json'>('diagram');

  if (!ast) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded text-slate-500 text-sm">
        No AST available. Parser did not produce a valid syntax tree due to syntax errors.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded border border-slate-200">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <GitCommit className="w-4 h-4 text-slate-500" />
          <span>Root: &lt;SelectQueryNode&gt;</span>
        </div>
        <div className="flex items-center gap-1 bg-white p-0.5 rounded border border-slate-200 text-xs">
          <button
            onClick={() => setViewMode('diagram')}
            className={`px-2.5 py-1 rounded transition-colors ${
              viewMode === 'diagram'
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Visual Tree
          </button>
          <button
            onClick={() => setViewMode('json')}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
              viewMode === 'json'
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Code className="w-3 h-3" />
            JSON AST
          </button>
        </div>
      </div>

      {viewMode === 'json' ? (
        <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded border border-slate-800 overflow-x-auto max-h-[480px]">
          {JSON.stringify(ast, null, 2)}
        </pre>
      ) : (
        <div className="border border-slate-200 rounded p-4 bg-white shadow-xs overflow-x-auto">
          <div className="min-w-[500px] space-y-4 font-mono text-xs">
            {/* Root Node */}
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-900 px-3 py-1.5 rounded w-fit font-bold">
              <span>ROOT</span>
              <span className="text-slate-400">→</span>
              <span>SelectQuery</span>
            </div>

            <div className="pl-6 border-l-2 border-slate-200 space-y-4">
              {/* SELECT Clause */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>SELECT Clause (Projection List):</span>
                </div>
                <div className="pl-4 flex flex-wrap gap-1.5">
                  {ast.isStar ? (
                    <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded border border-blue-200 font-bold">
                      * (ALL COLUMNS)
                    </span>
                  ) : (
                    ast.selectList.map((item, idx) => (
                      <span
                        key={idx}
                        className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200"
                      >
                        {item.type === 'Identifier' ? item.name : '*'}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* FROM Clause */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  <span>FROM Table:</span>
                </div>
                <div className="pl-4">
                  <span className="bg-purple-100 text-purple-800 px-2.5 py-1 rounded border border-purple-200 font-bold">
                    {ast.fromTable || '(undefined)'}
                  </span>
                </div>
              </div>

              {/* WHERE Clause Subtree */}
              {ast.whereClause && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>WHERE Condition (Expression Subtree):</span>
                  </div>
                  <div className="pl-4">
                    <ExprTreeNode node={ast.whereClause} depth={0} />
                  </div>
                </div>
              )}

              {/* ORDER BY Clause */}
              {ast.orderByClause && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>ORDER BY Clause:</span>
                  </div>
                  <div className="pl-4 flex items-center gap-2">
                    <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                      Column: {ast.orderByClause.column}
                    </span>
                    <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                      Direction: {ast.orderByClause.direction}
                    </span>
                  </div>
                </div>
              )}

              {/* LIMIT Clause */}
              {ast.limitClause !== undefined && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>LIMIT Clause:</span>
                  </div>
                  <div className="pl-4">
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                      {ast.limitClause} rows
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ExprTreeNodeProps {
  node: ExprNode;
  depth: number;
}

const ExprTreeNode: React.FC<ExprTreeNodeProps> = ({ node, depth }) => {
  const [collapsed, setCollapsed] = useState(false);

  if (node.type === 'Literal') {
    return (
      <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-900 px-2 py-1 rounded text-xs">
        <span className="text-[10px] text-amber-600 font-sans font-bold">LITERAL:</span>
        <span className="font-bold">
          {typeof node.value === 'string' ? `"${node.value}"` : String(node.value)}
        </span>
        <span className="text-[10px] text-slate-400">({node.rawType})</span>
      </div>
    );
  }

  if (node.type === 'Identifier') {
    return (
      <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-900 px-2 py-1 rounded text-xs">
        <span className="text-[10px] text-blue-600 font-sans font-bold">IDENT:</span>
        <span className="font-bold">{node.name}</span>
      </div>
    );
  }

  if (node.type === 'BinaryOp') {
    const isLogical = node.operator === 'AND' || node.operator === 'OR';
    const isRelop = ['>', '<', '>=', '<=', '=', '!='].includes(node.operator);

    const badgeColor = isLogical
      ? 'bg-purple-100 text-purple-800 border-purple-300'
      : isRelop
      ? 'bg-rose-100 text-rose-800 border-rose-300'
      : 'bg-orange-100 text-orange-800 border-orange-300';

    return (
      <div className="space-y-1.5 my-1">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-0.5 text-slate-400 hover:text-slate-600"
            title="Toggle subtree"
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <div
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-bold ${badgeColor}`}
          >
            <span>OpNode:</span>
            <span className="text-sm font-black underline">{node.operator}</span>
          </div>
        </div>

        {!collapsed && (
          <div className="pl-5 border-l-2 border-slate-200 space-y-2 mt-1">
            <div className="flex items-start gap-2">
              <span className="text-slate-400 text-[11px] mt-1 font-sans">Left:</span>
              <ExprTreeNode node={node.left} depth={depth + 1} />
            </div>
            <div className="flex items-start gap-2">
              <span className="text-slate-400 text-[11px] mt-1 font-sans">Right:</span>
              <ExprTreeNode node={node.right} depth={depth + 1} />
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};
