import React from 'react';
import { ExecutionResult } from '../compiler/types';
import { Table, CheckCircle2, Clock, Layers } from 'lucide-react';

interface ExecutionViewProps {
  executionResult: ExecutionResult | null;
  tableName: string;
}

export const ExecutionView: React.FC<ExecutionViewProps> = ({
  executionResult,
  tableName
}) => {
  if (!executionResult) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded text-slate-500 text-sm">
        Query has not been executed yet. Compile a valid query to inspect live results.
      </div>
    );
  }

  const { columns, rows, totalRowsScanned, matchedRows, executionTimeMs, stepTrace } =
    executionResult;

  return (
    <div className="space-y-6">
      {/* Execution Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 p-3 rounded shadow-xs">
          <div className="text-[11px] text-slate-500 font-medium">Scanned Rows</div>
          <div className="text-lg font-bold text-slate-800 font-mono mt-0.5">
            {totalRowsScanned}
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-3 rounded shadow-xs">
          <div className="text-[11px] text-slate-500 font-medium">Output Result Rows</div>
          <div className="text-lg font-bold text-emerald-600 font-mono mt-0.5">
            {matchedRows}
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-3 rounded shadow-xs">
          <div className="text-[11px] text-slate-500 font-medium">Projected Columns</div>
          <div className="text-lg font-bold text-blue-600 font-mono mt-0.5">
            {columns.length}
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-3 rounded shadow-xs">
          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Execution Time</span>
          </div>
          <div className="text-lg font-bold text-slate-800 font-mono mt-0.5">
            {executionTimeMs} ms
          </div>
        </div>
      </div>

      {/* Execution Trace Steps */}
      <div className="border border-slate-200 rounded overflow-hidden bg-white shadow-xs">
        <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <span>Interpreter Relational Pipeline Trace</span>
        </div>
        <div className="p-3 bg-slate-50 font-mono text-xs space-y-1.5 text-slate-700">
          {stepTrace.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Result Relation Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Table className="w-4 h-4 text-slate-500" />
            <span>Query Result Relation ({rows.length} rows)</span>
          </h4>
        </div>

        <div className="border border-slate-200 rounded overflow-hidden bg-white shadow-xs">
          <div className="overflow-x-auto max-h-[380px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-800 text-white sticky top-0 uppercase font-mono font-semibold tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center text-slate-400 font-sans">#</th>
                  {columns.map(col => (
                    <th key={col} className="py-2.5 px-4">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      className="py-8 text-center text-slate-400 font-sans text-xs"
                    >
                      Empty set (0 rows matched the condition)
                    </td>
                  </tr>
                ) : (
                  rows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={`hover:bg-slate-50 ${
                        rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                      }`}
                    >
                      <td className="py-2 px-3 text-center text-slate-400 text-[11px] font-sans">
                        {rIdx + 1}
                      </td>
                      {columns.map(col => (
                        <td key={col} className="py-2 px-4 text-slate-800">
                          {row[col] !== undefined ? String(row[col]) : <span className="text-slate-300">NULL</span>}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
