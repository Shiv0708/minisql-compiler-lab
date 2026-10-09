import React, { useState } from 'react';
import { Database, RotateCcw, X, Plus, Save } from 'lucide-react';
import { DEFAULT_STUDENTS_CSV } from '../compiler/catalog';

interface DataEditorModalProps {
  csvData: string;
  onSave: (newCsv: string) => void;
  onClose: () => void;
}

export const DataEditorModal: React.FC<DataEditorModalProps> = ({
  csvData,
  onSave,
  onClose
}) => {
  const [text, setText] = useState(csvData);
  const [activeTab, setActiveTab] = useState<'raw' | 'table'>('table');

  const rows = text.trim().split('\n').map(l => l.split(','));
  const headers = rows[0] || [];
  const dataRows = rows.slice(1);

  const handleReset = () => {
    setText(DEFAULT_STUDENTS_CSV);
  };

  const handleSave = () => {
    onSave(text);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-slate-300 shadow-xl max-w-3xl w-full flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-800">
              Database Catalog: students.csv
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs bg-white">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('table')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === 'table'
                  ? 'bg-slate-800 text-white font-medium'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Table View ({dataRows.length} rows)
            </button>
            <button
              onClick={() => setActiveTab('raw')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === 'raw'
                  ? 'bg-slate-800 text-white font-medium'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Raw CSV Editor
            </button>
          </div>

          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100 text-xs"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset to Default</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {activeTab === 'raw' ? (
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={12}
              className="w-full font-mono text-xs p-3 bg-slate-900 text-slate-100 rounded border border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          ) : (
            <div className="border border-slate-200 rounded overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-mono font-semibold uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 w-10 text-center">#</th>
                    {headers.map((h, i) => (
                      <th key={i} className="py-2 px-3">{h.trim()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {dataRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-center text-slate-400 font-sans text-[11px]">
                        {rIdx + 1}
                      </td>
                      {row.map((val, cIdx) => (
                        <td key={cIdx} className="py-2 px-3 text-slate-800">
                          {val.trim()}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-900 text-white rounded font-medium hover:bg-slate-800"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Apply Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
