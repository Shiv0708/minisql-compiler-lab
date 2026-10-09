import React from 'react';
import { CompilerDiagnostic } from '../compiler/types';
import { AlertTriangle, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

interface ErrorRecoveryViewProps {
  diagnostics: CompilerDiagnostic[];
  sourceQuery: string;
  recoveredErrorsCount: number;
}

export const ErrorRecoveryView: React.FC<ErrorRecoveryViewProps> = ({
  diagnostics,
  sourceQuery,
  recoveredErrorsCount
}) => {
  const queryLines = sourceQuery.split('\n');

  if (diagnostics.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded p-6 text-center space-y-2">
        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-emerald-900">Zero Compiler Errors</h4>
        <p className="text-xs text-emerald-700 max-w-md mx-auto">
          Lexical analysis and grammar parsing passed with zero syntax violations. No panic-mode error recovery was required.
        </p>
      </div>
    );
  }

  const errors = diagnostics.filter(d => d.severity === 'error');
  const warnings = diagnostics.filter(d => d.severity === 'warning');

  return (
    <div className="space-y-4">
      {/* Panic Mode Recovery banner */}
      <div className="bg-amber-50 border border-amber-200 p-3.5 rounded flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <div className="font-bold text-amber-900 flex items-center gap-2">
            <span>Panic-Mode Error Recovery Active</span>
            <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded text-[10px] font-mono">
              {recoveredErrorsCount} synchronizations performed
            </span>
          </div>
          <p className="text-amber-800 leading-relaxed">
            When a syntax fault occurred, the parser activated panic mode to discard invalid tokens up to the nearest synchronizing barrier (such as <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">FROM</code>, <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">WHERE</code>, <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">ORDER</code>, or <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">;</code>). This prevented premature parser abortion and uncovered all {diagnostics.length} issue(s) in a single compilation run.
          </p>
        </div>
      </div>

      {/* Diagnostics List */}
      <div className="space-y-3">
        {diagnostics.map((diag, idx) => {
          const lineText = queryLines[diag.line - 1] || '';
          const pointerSpaces = ' '.repeat(Math.max(0, diag.column - 1));

          return (
            <div
              key={idx}
              className={`border rounded overflow-hidden shadow-xs ${
                diag.severity === 'error'
                  ? 'border-red-200 bg-white'
                  : 'border-amber-200 bg-white'
              }`}
            >
              {/* Header */}
              <div
                className={`px-3 py-2 flex items-center justify-between text-xs font-medium border-b ${
                  diag.severity === 'error'
                    ? 'bg-red-50 text-red-900 border-red-100'
                    : 'bg-amber-50 text-amber-900 border-amber-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  {diag.severity === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  )}
                  <span className="font-bold uppercase tracking-wider text-[11px]">
                    [{diag.phase} Phase] {diag.severity.toUpperCase()}
                  </span>
                </div>
                <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200">
                  Line {diag.line}, Column {diag.column}
                </span>
              </div>

              {/* Message */}
              <div className="p-3 text-xs space-y-2">
                <p className="text-slate-800 font-medium">{diag.message}</p>

                {/* Code Snippet with Visual Pointer */}
                {lineText && (
                  <div className="bg-slate-900 text-slate-100 p-2.5 rounded font-mono text-xs overflow-x-auto space-y-0.5">
                    <div className="text-slate-400 select-none text-[10px]">
                      Line {diag.line}:
                    </div>
                    <div>{lineText}</div>
                    <div className="text-rose-400 font-bold select-none whitespace-pre">
                      {pointerSpaces}^--- [Fault at column {diag.column}]
                    </div>
                  </div>
                )}

                {diag.recovered && (
                  <div className="text-[11px] text-slate-500 italic">
                    * Panic recovery triggered: Skipped tokens until next grammar synchronizer.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
