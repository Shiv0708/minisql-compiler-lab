import React from 'react';
import { OptimizerResult } from '../compiler/optimizer';
import { TACInstruction } from '../compiler/types';
import { Zap, ArrowRight, CheckCircle2 } from 'lucide-react';

interface OptimizerViewProps {
  beforeTac: TACInstruction[];
  optimizerResult: OptimizerResult;
}

export const OptimizerView: React.FC<OptimizerViewProps> = ({
  beforeTac,
  optimizerResult
}) => {
  const { optimizedTac, logs, removedFilter, isAlwaysFalse } = optimizerResult;

  if (beforeTac.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded text-slate-500 text-sm">
        No TAC to optimize yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-slate-50 border border-slate-200 p-3.5 rounded flex items-start gap-3">
        <Zap className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-slate-700">
          <div className="font-bold text-slate-900 flex items-center gap-2">
            <span>Machine-Independent Code Optimizer</span>
            <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded text-[10px] font-mono">
              {logs.length} optimization(s) applied
            </span>
          </div>
          <p className="leading-relaxed">
            Applies compile-time evaluation including <strong>Constant Folding</strong> (evaluates constant subexpressions before execution), <strong>Algebraic Simplification</strong> (eliminates identity operators like <code className="bg-slate-200 px-1 rounded">X + 0</code> or <code className="bg-slate-200 px-1 rounded">X * 1</code>), and <strong>Dead Predicate Removal</strong> (bypasses full table scans if conditions are tautologies).
          </p>
        </div>
      </div>

      {/* Side-by-Side TAC Comparison */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Side-by-Side Three-Address Code (TAC) Comparison
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Before TAC */}
          <div className="border border-slate-200 rounded overflow-hidden bg-white shadow-xs">
            <div className="bg-slate-800 text-white px-3 py-2 text-xs font-mono font-bold flex items-center justify-between">
              <span>(1) Unoptimized TAC (Before)</span>
              <span className="text-slate-400 font-sans text-[11px]">{beforeTac.length} instructions</span>
            </div>
            <div className="p-3 bg-slate-900 text-slate-200 font-mono text-xs overflow-x-auto min-h-[160px] space-y-1.5">
              {beforeTac.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-slate-300">
                  <span className="text-slate-500 w-5 select-none">{t.index}.</span>
                  <span className="text-amber-300 font-bold">{t.code}</span>
                </div>
              ))}
            </div>
          </div>

          {/* After TAC */}
          <div className="border border-emerald-300 rounded overflow-hidden bg-white shadow-xs">
            <div className="bg-emerald-800 text-white px-3 py-2 text-xs font-mono font-bold flex items-center justify-between">
              <span>(2) Optimized TAC (After)</span>
              <span className="text-emerald-200 font-sans text-[11px]">{optimizedTac.length} instructions</span>
            </div>
            <div className="p-3 bg-slate-900 text-emerald-300 font-mono text-xs overflow-x-auto min-h-[160px] space-y-1.5">
              {optimizedTac.length === 0 ? (
                <div className="text-slate-400 italic py-4">No TAC instructions (Dead predicate eliminated all actions)</div>
              ) : (
                optimizedTac.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 text-emerald-200">
                    <span className="text-slate-500 w-5 select-none">{t.index}.</span>
                    <span className="text-emerald-300 font-bold">{t.code}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Optimization Log Table */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Transformations Applied ({logs.length})</span>
        </h4>

        {logs.length === 0 ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 text-center">
            No foldable constants or algebraic identities detected in this query. The TAC is already in canonical minimal form.
          </div>
        ) : (
          <div className="border border-slate-200 rounded overflow-hidden bg-white shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 uppercase font-semibold tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Technique</th>
                  <th className="py-2.5 px-3 font-mono">Before</th>
                  <th className="py-2.5 px-3 font-mono">After</th>
                  <th className="py-2.5 px-4">Compiler Optimization Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3">
                      <span className="inline-block px-2 py-0.5 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded">
                        {log.technique}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-rose-700">
                      {log.before}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                      {log.after}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 text-xs">
                      {log.explanation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
