import React, { useState } from 'react';
import { Token } from '../compiler/types';
import { Search, Tag } from 'lucide-react';

interface TokensViewProps {
  tokens: Token[];
}

export const TokensView: React.FC<TokensViewProps> = ({ tokens }) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  const displayTokens = tokens.filter(t => t.type !== 'EOF');

  const filtered = displayTokens.filter(t => {
    if (filterType !== 'ALL' && t.type !== filterType) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        t.lexeme.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q) ||
        String(t.line).includes(q)
      );
    }
    return true;
  });

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'KEYWORD':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'IDENT':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'NUMBER':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'STRING':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'RELOP':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'ARITH_OP':
      case 'STAR':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'ERROR':
        return 'bg-red-200 text-red-900 border-red-300 font-bold';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const tokenTypes = ['ALL', 'KEYWORD', 'IDENT', 'NUMBER', 'STRING', 'RELOP', 'ARITH_OP', 'ERROR'];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded border border-slate-200">
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <Tag className="w-4 h-4 text-slate-500" />
          <span className="font-medium">Total Tokens:</span>
          <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono font-bold">
            {displayTokens.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search token..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-2 py-1 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-400 w-full sm:w-40"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto max-w-full pb-1 sm:pb-0">
            {tokenTypes.map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  filterType === t
                    ? 'bg-slate-800 text-white font-medium'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="border border-slate-200 rounded overflow-hidden shadow-xs bg-white">
        <div className="overflow-x-auto max-h-[460px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-600 sticky top-0 border-b border-slate-200 uppercase font-semibold tracking-wider">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">#</th>
                <th className="py-2.5 px-4 font-mono">Lexeme</th>
                <th className="py-2.5 px-4">Token Type</th>
                <th className="py-2.5 px-3 text-center">Line</th>
                <th className="py-2.5 px-3 text-center">Col</th>
                <th className="py-2.5 px-4 font-mono">Literal / Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-sans text-sm">
                    No matching tokens found
                  </td>
                </tr>
              ) : (
                filtered.map((t, idx) => (
                  <tr
                    key={t.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      t.type === 'ERROR' ? 'bg-red-50/70' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                    }`}
                  >
                    <td className="py-2 px-3 text-center text-slate-400 text-[11px] font-sans">
                      {t.id}
                    </td>
                    <td className="py-2 px-4 font-bold text-slate-800">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-900">
                        {t.lexeme}
                      </span>
                    </td>
                    <td className="py-2 px-4 font-sans">
                      <span
                        className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded border ${getTypeBadgeClass(
                          t.type
                        )}`}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center text-slate-600 font-sans">
                      {t.line}
                    </td>
                    <td className="py-2 px-3 text-center text-slate-600 font-sans">
                      {t.column}
                    </td>
                    <td className="py-2 px-4 text-slate-500 text-[11px]">
                      {t.value !== undefined
                        ? typeof t.value === 'string'
                          ? `"${t.value}"`
                          : String(t.value)
                        : t.error
                        ? <span className="text-red-600 font-bold font-sans">{t.error}</span>
                        : <span className="text-slate-300">-</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-[11px] text-slate-500 flex items-center justify-between px-1">
        <span>* Matching grammar terminal tokens extracted during single-pass regex scan</span>
        <span>Showing {filtered.length} of {displayTokens.length} tokens</span>
      </div>
    </div>
  );
};
