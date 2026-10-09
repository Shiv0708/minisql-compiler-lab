import React from 'react';
import { SemanticResult } from '../compiler/semantic';
import { SelectQueryNode } from '../compiler/types';
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

interface SemanticViewProps {
  semanticResult: SemanticResult;
  ast: SelectQueryNode | null;
}

export const SemanticView: React.FC<SemanticViewProps> = ({ semanticResult, ast }) => {
  if (!ast) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded text-slate-500 text-sm">
        Semantic analysis skipped because the syntax tree could not be constructed due to prior parser errors.
      </div>
    );
  }

  const { isValid, diagnostics, tableSchema } = semanticResult;
  const errors = diagnostics.filter(d => d.severity === 'error');
  const warnings = diagnostics.filter(d => d.severity === 'warning');

  // Checklist items
  const checks = [
    {
      title: 'Table Existence in Schema Catalog',
      desc: `Verifies whether table '${ast.fromTable}' is registered.`,
      passed: Boolean(tableSchema),
      detail: tableSchema
        ? `Found table '${tableSchema.name}' in catalog.`
        : `Table '${ast.fromTable}' not found.`
    },
    {
      title: 'Projection Columns Validation',
      desc: 'Ensures every column requested in SELECT exists in the table schema.',
      passed: !errors.some(e => e.message.includes('Column') && e.message.includes('does not exist in table')),
      detail: ast.isStar
        ? 'Wildcard (*) requested - all attributes valid.'
        : `Columns [${ast.selectList.map(s => (s.type === 'Identifier' ? s.name : '*')).join(', ')}] checked.`
    },
    {
      title: 'Type Compatibility & Operand Rules',
      desc: 'Checks that relational and arithmetic operations use matching and valid types (e.g., number vs number).',
      passed: !errors.some(e => e.message.includes('Type mismatch') || e.message.includes('cannot be applied to type')),
      detail: 'Arithmetic (+,-,*,/) restricted to INT/FLOAT; Comparisons forbid INT vs STRING.'
    },
    {
      title: 'ORDER BY Column Verification',
      desc: 'Checks that sorting attribute exists in the schema.',
      passed: !errors.some(e => e.message.includes('ORDER BY')),
      detail: ast.orderByClause
        ? `Sorted by '${ast.orderByClause.column}' (${ast.orderByClause.direction}).`
        : 'No ORDER BY clause specified.'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div
        className={`p-4 rounded border flex items-start gap-3 ${
          isValid
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-red-50 border-red-200 text-red-900'
        }`}
      >
        {isValid ? (
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        ) : (
          <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        )}
        <div className="text-xs space-y-1">
          <div className="font-bold text-sm">
            {isValid ? 'Semantic Analysis Passed' : 'Semantic Validation Failed'}
          </div>
          <p className="opacity-90">
            {isValid
              ? 'All identifiers and data types are semantically consistent with the relational catalog schema.'
              : `Found ${errors.length} semantic error(s) preventing Intermediate Code (TAC) generation.`}
          </p>
        </div>
      </div>

      {/* Semantic Check Rules Checklist */}
      <div className="border border-slate-200 rounded overflow-hidden bg-white shadow-xs">
        <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 text-xs font-semibold text-slate-700">
          Formal Semantic Rule Validations
        </div>
        <div className="divide-y divide-slate-100 text-xs">
          {checks.map((c, idx) => (
            <div key={idx} className="p-3 flex items-start gap-3 hover:bg-slate-50/50">
              {c.passed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 flex-1">
                <div className="font-semibold text-slate-800 flex items-center justify-between">
                  <span>{c.title}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      c.passed
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {c.passed ? 'PASSED' : 'VIOLATION'}
                  </span>
                </div>
                <div className="text-slate-500 text-[11px]">{c.desc}</div>
                <div className="text-slate-700 font-mono text-[11px] pt-0.5">{c.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Diagnostics if any */}
      {diagnostics.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
            Semantic Diagnostics
          </h4>
          <div className="space-y-2">
            {diagnostics.map((d, idx) => (
              <div
                key={idx}
                className={`p-3 rounded border text-xs flex items-start gap-2.5 ${
                  d.severity === 'error'
                    ? 'bg-red-50/70 border-red-200 text-red-900'
                    : 'bg-amber-50/70 border-amber-200 text-amber-900'
                }`}
              >
                {d.severity === 'error' ? (
                  <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold">{d.message}</div>
                  <div className="text-[11px] opacity-75 font-mono mt-0.5">
                    Line {d.line}, Column {d.column}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
