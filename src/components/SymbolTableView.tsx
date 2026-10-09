import React from 'react';
import { SymbolEntry, TableSchema } from '../compiler/types';
import { Database, BookOpen } from 'lucide-react';

interface SymbolTableViewProps {
  symbolEntries: SymbolEntry[];
  catalog: TableSchema[];
}

export const SymbolTableView: React.FC<SymbolTableViewProps> = ({
  symbolEntries,
  catalog
}) => {
  return (
    <div className="space-y-6">
      {/* 1. Lexical Identifiers Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-800">
              (a) Identifier Table (Populated from Lexical Tokens)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {symbolEntries.length} unique identifiers
          </span>
        </div>

        <div className="border border-slate-200 rounded overflow-hidden bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 font-semibold tracking-wider uppercase">
                <tr>
                  <th className="py-2.5 px-3">Identifier Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Catalog Data Type</th>
                  <th className="py-2.5 px-3 text-center">First Seen (Line:Col)</th>
                  <th className="py-2.5 px-3 text-center">Frequency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {symbolEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400 font-sans">
                      No identifiers recorded
                    </td>
                  </tr>
                ) : (
                  symbolEntries.map((entry, idx) => (
                    <tr
                      key={entry.name}
                      className={`hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                    >
                      <td className="py-2 px-3 font-bold text-slate-800">
                        {entry.name}
                      </td>
                      <td className="py-2 px-3 font-sans">
                        <span
                          className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded border ${
                            entry.category === 'KEYWORD'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : entry.category === 'TABLE'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : entry.category === 'COLUMN'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {entry.category}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        {entry.dataType ? (
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] text-slate-700 font-semibold">
                            {entry.dataType}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center text-slate-600 font-sans">
                        L{entry.firstSeenLine} : C{entry.firstSeenColumn}
                      </td>
                      <td className="py-2 px-3 text-center text-slate-800 font-bold font-sans">
                        {entry.occurrences}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 2. Schema Catalog */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-800">
              (b) Schema Catalog (Database Metadata from CSV)
            </h3>
          </div>
        </div>

        {catalog.map(table => (
          <div key={table.name} className="border border-slate-200 rounded overflow-hidden bg-white shadow-xs">
            <div className="bg-slate-800 text-white px-3 py-2 flex items-center justify-between text-xs">
              <span className="font-mono font-semibold">Table: {table.name}</span>
              <span className="text-slate-300">{table.columns.length} columns defined</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-2 px-3 font-mono">Column Name</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Description / Semantic Constraints</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {table.columns.map(col => (
                    <tr key={col.name} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-800">{col.name}</td>
                      <td className="py-2 px-3 font-sans">
                        <span className="inline-block px-1.5 py-0.5 text-[11px] font-mono font-bold bg-slate-100 text-slate-700 rounded border border-slate-200">
                          {col.type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600 font-sans text-xs">
                        {col.description || 'Standard table attribute'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
