import React, { useState } from 'react';
import { PYTHON_PROJECT_FILES, PythonFile } from '../compiler/pythonFiles';
import { FileCode, Download, Copy, Check, BookOpen, HelpCircle } from 'lucide-react';

export const PythonSourceView: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<PythonFile>(PYTHON_PROJECT_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'files' | 'syllabus' | 'viva'>('files');

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([selectedFile.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = selectedFile.filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const syllabusMapping = [
    {
      practical: 'Practical 1',
      title: 'Lexical Analyzer (Lexer / Tokenizer)',
      module: 'lexer.py',
      description: 'Regular expression token specifications, identifier recognition, line/column tracking, illegal character detection.'
    },
    {
      practical: 'Practical 2',
      title: 'Symbol Table Generation',
      module: 'symbol_table.py',
      description: 'Identifier registration, token frequency tracking, and relational schema catalog mapping.'
    },
    {
      practical: 'Practical 3',
      title: 'Syntax Analyzer & AST (LALR Parser)',
      module: 'parser.py, ast_nodes.py',
      description: 'Context-free grammar rules in BNF form, operator precedence handling, abstract syntax tree construction.'
    },
    {
      practical: 'Practical 4',
      title: 'Error Recovery (Panic-Mode)',
      module: 'parser.py (p_error)',
      description: 'Panic-mode token discarding until synchronizing barriers (FROM, WHERE, ORDER, LIMIT, semicolon); reporting multiple errors.'
    },
    {
      practical: 'Practical 5',
      title: 'Semantic Analyzer & Type Checking',
      module: 'semantic.py',
      description: 'Schema catalog validation, column existence checks, type compatibility (numeric vs string), arithmetic validation.'
    },
    {
      practical: 'Practical 6',
      title: 'Intermediate Code Generator (TAC)',
      module: 'tac.py',
      description: 'Linearizing AST into Three-Address Code with temporary variables (t1, t2...) and relational primitives (FILTER, PROJECT, SORT).'
    },
    {
      practical: 'Practical 7',
      title: 'Code Optimizer',
      module: 'optimizer.py',
      description: 'Constant folding (e.g. 40+40 -> 80), algebraic simplification (x*1 -> x, x+0 -> x), dead predicate removal (WHERE 1=1).'
    },
    {
      practical: 'Practical 8',
      title: 'Execution Engine / Code Interpreter',
      module: 'executor.py',
      description: 'Interpreting optimized relational TAC steps on dataset records loaded from CSV file.'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Sub-navigation tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-medium">
        <button
          onClick={() => setActiveSubTab('files')}
          className={`pb-2.5 flex items-center gap-1.5 transition-colors ${
            activeSubTab === 'files'
              ? 'border-b-2 border-slate-900 text-slate-900 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>Python (PLY) Source Code Files</span>
        </button>

        <button
          onClick={() => setActiveSubTab('syllabus')}
          className={`pb-2.5 flex items-center gap-1.5 transition-colors ${
            activeSubTab === 'syllabus'
              ? 'border-b-2 border-slate-900 text-slate-900 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Lab Syllabus Mapping Table</span>
        </button>

        <button
          onClick={() => setActiveSubTab('viva')}
          className={`pb-2.5 flex items-center gap-1.5 transition-colors ${
            activeSubTab === 'viva'
              ? 'border-b-2 border-slate-900 text-slate-900 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Viva Voice Questions & Answers</span>
        </button>
      </div>

      {activeSubTab === 'files' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* File List Sidebar */}
          <div className="md:col-span-1 space-y-1">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-2 py-1">
              Project Files
            </div>
            {PYTHON_PROJECT_FILES.map(file => (
              <button
                key={file.filename}
                onClick={() => setSelectedFile(file)}
                className={`w-full text-left px-2.5 py-2 rounded text-xs transition-colors flex items-center justify-between font-mono ${
                  selectedFile.filename === file.filename
                    ? 'bg-slate-800 text-white font-bold'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{file.filename}</span>
                <span className="text-[10px] opacity-60">
                  {file.filename.endsWith('.py') ? 'py' : file.filename.endsWith('.csv') ? 'csv' : 'md'}
                </span>
              </button>
            ))}
          </div>

          {/* Code Viewer */}
          <div className="md:col-span-3 space-y-2">
            <div className="bg-slate-50 p-2.5 rounded border border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-mono text-xs font-bold text-slate-900">
                  {selectedFile.filename}
                </span>
                <p className="text-[11px] text-slate-500">{selectedFile.description}</p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-slate-800 text-white hover:bg-slate-900 font-medium"
                >
                  <Download className="w-3 h-3" />
                  <span>Download</span>
                </button>
              </div>
            </div>

            <div className="border border-slate-800 rounded overflow-hidden shadow-xs">
              <pre className="p-4 bg-slate-900 text-slate-200 font-mono text-xs overflow-x-auto max-h-[460px] leading-relaxed">
                <code>{selectedFile.code}</code>
              </pre>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'syllabus' && (
        <div className="space-y-4">
          <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs text-slate-700 leading-relaxed">
            <strong>Direct Syllabus Alignment:</strong> This project is designed so that each module corresponds 1-to-1 with the standard university Compiler Design lab syllabus practicals.
          </div>

          <div className="border border-slate-200 rounded overflow-hidden bg-white shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 uppercase font-semibold tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Practical #</th>
                  <th className="py-2.5 px-3">Syllabus Topic</th>
                  <th className="py-2.5 px-3 font-mono">Implemented File</th>
                  <th className="py-2.5 px-4">Demonstration in MiniSQL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {syllabusMapping.map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-800">{s.practical}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{s.title}</td>
                    <td className="py-2.5 px-3 font-mono text-blue-700 bg-slate-50">{s.module}</td>
                    <td className="py-2.5 px-4 text-slate-600 text-xs">{s.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'viva' && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded text-xs">
            <strong>Viva Preparation Guide:</strong> Standard questions typically asked by external examiners and lab instructors, along with exact, concise answers.
          </div>

          <div className="space-y-3">
            {[
              {
                q: '1. Why did you choose PLY (Python Lex-Yacc)?',
                a: 'PLY mirrors the standard Lex and Yacc compiler tools used in industry and academia. It directly demonstrates regular expressions for token scanning and BNF production rules for LALR(1) shift-reduce parsing, while allowing easy inspection of intermediate tables.'
              },
              {
                q: '2. What parsing technique does this compiler utilize?',
                a: 'It uses LALR(1) (Lookahead LR parsing with 1 token lookahead). The parser maintains a parse stack, shifting input tokens and reducing handles based on grammar rules while utilizing precedence tables to resolve ambiguities.'
              },
              {
                q: '3. How does panic-mode error recovery work?',
                a: 'When an unexpected token is encountered, rather than terminating the entire compilation immediately, the parser discards incoming tokens until a known synchronizing token (such as FROM, WHERE, ORDER, LIMIT, or ;) is reached. Once synchronized, parsing continues, allowing the compiler to report multiple errors in a single run.'
              },
              {
                q: '4. What is stored in your symbol table?',
                a: 'Two tables are maintained: (a) Identifier Symbol Table: records all variable/keyword names, category (KEYWORD, TABLE, COLUMN), line/col of occurrence, and frequency; (b) Schema Catalog: maintains the database schema (table name, column names, and expected data types INT, STRING, FLOAT).'
              },
              {
                q: '5. Why perform constant folding in the optimizer?',
                a: 'Constant folding computes constant expressions (e.g., marks > 40 + 40 is folded to marks > 80) at compile-time instead of running the addition repeatedly for every row in the dataset during database execution, improving query throughput.'
              },
              {
                q: '6. What is Three-Address Code (TAC)?',
                a: 'Three-Address Code is an intermediate representation where each instruction has at most one operator and at most three addresses (two operands and one destination temporary variable, e.g., t1 = a + b). It provides an architecture-independent bridge between the high-level AST and the execution engine.'
              }
            ].map((v, i) => (
              <div key={i} className="border border-slate-200 rounded p-3.5 bg-white shadow-xs space-y-1.5">
                <div className="font-bold text-slate-900 text-xs">{v.q}</div>
                <div className="text-xs text-slate-700 leading-relaxed pl-2 border-l-2 border-slate-300">
                  {v.a}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
