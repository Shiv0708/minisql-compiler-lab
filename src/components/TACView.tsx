import React, { useState } from 'react';
import { TACInstruction } from '../compiler/types';
import { Copy, Check, FileText } from 'lucide-react';

interface TACViewProps {
  tacList: TACInstruction[];
}

export const TACView: React.FC<TACViewProps> = ({ tacList }) => {
  const [copied, setCopied] = useState(false);

  if (tacList.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded text-slate-500 text-sm">
        No Three-Address Code generated yet. Fix preceding syntax or semantic errors first.
      </div>
    );
  }

  const rawTAC = tacList.map(t => `${t.code}${t.comment ? `   # ${t.comment}` : ''}`).join('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(rawTAC);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded border border-slate-200">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <FileText className="w-4 h-4 text-slate-500" />
          <span>Intermediate Representation: Linearized Three-Address Code (TAC)</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors font-medium"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy TAC'}</span>
        </button>
      </div>

      {/* Code Display Table */}
      <div className="border border-slate-200 rounded overflow-hidden bg-white shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 uppercase font-semibold tracking-wider">
            <tr>
              <th className="py-2 px-3 w-12 text-center">#</th>
              <th className="py-2 px-4 font-mono">TAC Instruction</th>
              <th className="py-2 px-4">Relational / Arithmetic Operation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {tacList.map((t, idx) => (
              <tr key={t.index} className={`hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                <td className="py-2 px-3 text-center text-slate-400 font-sans text-[11px]">
                  {t.index}
                </td>
                <td className="py-2 px-4 text-slate-900 font-bold">
                  <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {t.code}
                  </span>
                </td>
                <td className="py-2 px-4 text-slate-600 font-sans text-xs">
                  {t.comment || `Execute ${t.op}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-200 leading-relaxed">
        <strong>Three-Address Code (TAC) Principle:</strong> In TAC, every instruction contains at most one operator and at most three addresses (two operands and one destination temporary variable, e.g. <code className="font-mono">t1 = 40 + 40</code>). Relational actions like <code className="font-mono">FILTER</code>, <code className="font-mono">PROJECT</code>, <code className="font-mono">SORT</code>, and <code className="font-mono">LIMIT</code> are expressed procedurally before machine execution.
      </div>
    </div>
  );
};
