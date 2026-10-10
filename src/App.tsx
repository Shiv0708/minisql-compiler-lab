/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  RotateCcw,
  Sparkles,
  Database,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Code2,
  Terminal,
  Cpu
} from 'lucide-react';

import { tokenize } from './compiler/lexer';
import { MiniSQLParser } from './compiler/parser';
import { buildIdentifierSymbolTable } from './compiler/symbolTable';
import { SemanticAnalyzer } from './compiler/semantic';
import { TACGenerator } from './compiler/tac';
import { MiniSQLOptimizer, OptimizerResult } from './compiler/optimizer';
import { MiniSQLExecutor } from './compiler/executor';
import { DEFAULT_STUDENTS_SCHEMA, DEFAULT_STUDENTS_CSV, parseCSVData } from './compiler/catalog';
import { SAMPLE_QUERIES, SampleQuery } from './compiler/sampleQueries';

import { TokensView } from './components/TokensView';
import { SymbolTableView } from './components/SymbolTableView';
import { ASTTreeView } from './components/ASTTreeView';
import { ErrorRecoveryView } from './components/ErrorRecoveryView';
import { SemanticView } from './components/SemanticView';
import { TACView } from './components/TACView';
import { OptimizerView } from './components/OptimizerView';
import { ExecutionView } from './components/ExecutionView';

import { DataEditorModal } from './components/DataEditorModal';

type PipelineTab =
  | 'tokens'
  | 'symbolTable'
  | 'ast'
  | 'errors'
  | 'semantic'
  | 'tac'
  | 'optimizer'
  | 'output';

export default function App() {
  const [query, setQuery] = useState<string>('SELECT name, marks FROM students WHERE marks > 40 + 40;');
  const [csvContent, setCsvContent] = useState<string>(DEFAULT_STUDENTS_CSV);
  const [activeTab, setActiveTab] = useState<PipelineTab>('tokens');
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [compileTimestamp, setCompileTimestamp] = useState<number>(Date.now());

  // Parse CSV records
  const { columns: csvHeaders, rows: csvRows } = useMemo(() => {
    return parseCSVData(csvContent);
  }, [csvContent]);

  // Schema Catalog
  const catalog = useMemo(() => {
    return [DEFAULT_STUDENTS_SCHEMA];
  }, []);

  // Run Compiler Pipeline
  const compilation = useMemo(() => {
    const startTime = performance.now();

    // 1. Lexical Analysis
    const lexResult = tokenize(query);
    const tokens = lexResult.tokens;
    const lexDiagnostics = lexResult.diagnostics;

    // 2. Symbol Table Generation
    const symbolEntries = buildIdentifierSymbolTable(tokens, catalog);

    // 3. Syntax Analysis & Panic Mode Recovery
    const parser = new MiniSQLParser(tokens);
    const parseResult = parser.parse();
    const ast = parseResult.ast;
    const parseDiagnostics = parseResult.diagnostics;
    const recoveredErrorsCount = parseResult.recoveredErrorsCount;

    // Combine Diagnostics
    const allDiagnostics = [...lexDiagnostics, ...parseDiagnostics];

    // 4. Semantic Analysis
    const semanticAnalyzer = new SemanticAnalyzer(catalog);
    const semanticResult = semanticAnalyzer.analyze(ast);
    allDiagnostics.push(...semanticResult.diagnostics);

    // 5. Intermediate Code (TAC) Generation
    let rawTac: any[] = [];
    if (ast && semanticResult.isValid) {
      const tacGen = new TACGenerator();
      rawTac = tacGen.generate(ast);
    }

    // 6. Optimization
    let optimizerResult: OptimizerResult = {
      optimizedAst: ast!,
      optimizedTac: rawTac,
      logs: [],
      removedFilter: false,
      isAlwaysFalse: false
    };

    if (ast && semanticResult.isValid) {
      const optimizer = new MiniSQLOptimizer();
      optimizerResult = optimizer.optimize(ast);
    }

    // 7. Execution
    let executionResult = null;
    if (ast && semanticResult.isValid) {
      const executor = new MiniSQLExecutor();
      executionResult = executor.execute(
        optimizerResult.optimizedAst,
        csvRows,
        optimizerResult.isAlwaysFalse
      );
    }

    const elapsedMs = Number((performance.now() - startTime).toFixed(2));

    const hasFatalErrors =
      allDiagnostics.some(d => d.severity === 'error') || !semanticResult.isValid;

    return {
      tokens,
      symbolEntries,
      ast,
      allDiagnostics,
      recoveredErrorsCount,
      semanticResult,
      rawTac,
      optimizerResult,
      executionResult,
      hasFatalErrors,
      elapsedMs
    };
  }, [query, csvRows, catalog, compileTimestamp]);

  // Auto-switch to appropriate tab upon compilation error or success
  const handleCompile = () => {
    setCompileTimestamp(Date.now());
    if (compilation.allDiagnostics.some(d => d.severity === 'error')) {
      setActiveTab('errors');
    } else if (compilation.optimizerResult.logs.length > 0) {
      setActiveTab('optimizer');
    } else {
      setActiveTab('output');
    }
  };

  const handleSelectSample = (sample: SampleQuery) => {
    setQuery(sample.query);
    setTimeout(() => {
      setCompileTimestamp(Date.now());
      if (sample.category.includes('Error')) {
        setActiveTab('errors');
      } else if (sample.category === 'Optimization') {
        setActiveTab('optimizer');
      } else {
        setActiveTab('output');
      }
    }, 50);
  };

  const errorCount = compilation.allDiagnostics.filter(d => d.severity === 'error').length;
  const warningCount = compilation.allDiagnostics.filter(d => d.severity === 'warning').length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans selection:bg-slate-300">
      {/* College Project Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-base shadow-xs">
              &gt;_
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                MiniSQL Compiler
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDataModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-slate-500" />
              <span>students.csv ({csvRows.length} rows)</span>
            </button>

          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto w-full px-4 py-5 flex-1 space-y-5">
        {/* Query Input Box & Test Cases */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 font-medium text-slate-700">
              <Terminal className="w-4 h-4 text-slate-500" />
              <span>SQL Query Input:</span>
            </div>

            {/* Preset Samples Selector */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-slate-500 shrink-0 text-[11px]">Lab Test Cases:</span>
              <select
                onChange={e => {
                  const s = SAMPLE_QUERIES.find(q => q.id === e.target.value);
                  if (s) handleSelectSample(s);
                }}
                className="text-xs bg-white border border-slate-300 rounded px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 w-full sm:w-72"
                defaultValue=""
              >
                <option value="" disabled>
                  Select a test query to load...
                </option>
                <optgroup label="✅ Valid Queries">
                  {SAMPLE_QUERIES.filter(s => s.category === 'Valid').map(s => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="⚡ Optimization Cases">
                  {SAMPLE_QUERIES.filter(s => s.category === 'Optimization').map(s => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="⚠️ Compiler Error Cases (Panic Recovery)">
                  {SAMPLE_QUERIES.filter(s => s.category.includes('Error')).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <div className="relative">
              <textarea
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    handleCompile();
                  }
                }}
                rows={3}
                placeholder="Enter SQL query (e.g. SELECT name, marks FROM students WHERE marks > 80;)"
                className="w-full font-mono text-sm p-3 bg-slate-900 text-emerald-300 rounded border border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500 resize-y leading-relaxed"
              />
              <div className="absolute right-2.5 bottom-2.5 text-[10px] font-mono text-slate-500 pointer-events-none">
                Press Ctrl+Enter to compile
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCompile}
                  className="flex items-center gap-2 px-4 py-2 text-xs rounded bg-slate-900 text-white font-bold hover:bg-slate-800 shadow-xs transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Compile & Execute</span>
                </button>

                <button
                  onClick={() => setQuery('SELECT name, marks FROM students WHERE marks > 40 + 40;')}
                  className="px-2.5 py-2 text-xs rounded border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Reset Query"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Status pill */}
              <div className="flex items-center gap-2 text-xs">
                {errorCount > 0 ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{errorCount} Error(s) Detected</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Compiled Cleanly ({compilation.elapsedMs}ms)</span>
                  </div>
                )}

                {warningCount > 0 && (
                  <div className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[11px]">
                    {warningCount} warning(s)
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Compiler Pipeline Navigation Tabs */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-2 flex overflow-x-auto">
            <PipelineTabButton
              tab="tokens"
              active={activeTab === 'tokens'}
              label="1. Tokens"
              badge={compilation.tokens.filter(t => t.type !== 'EOF').length}
              onClick={() => setActiveTab('tokens')}
            />
            <PipelineTabButton
              tab="symbolTable"
              active={activeTab === 'symbolTable'}
              label="2. Symbol Table"
              badge={compilation.symbolEntries.length}
              onClick={() => setActiveTab('symbolTable')}
            />
            <PipelineTabButton
              tab="ast"
              active={activeTab === 'ast'}
              label="3. Parse Tree (AST)"
              badge={compilation.ast ? 'Valid' : 'None'}
              onClick={() => setActiveTab('ast')}
            />
            <PipelineTabButton
              tab="errors"
              active={activeTab === 'errors'}
              label="4. Error Recovery"
              badge={errorCount > 0 ? errorCount : '0'}
              badgeAlert={errorCount > 0}
              onClick={() => setActiveTab('errors')}
            />
            <PipelineTabButton
              tab="semantic"
              active={activeTab === 'semantic'}
              label="5. Semantic Checks"
              badge={compilation.semanticResult.isValid ? 'OK' : 'Fail'}
              badgeAlert={!compilation.semanticResult.isValid}
              onClick={() => setActiveTab('semantic')}
            />
            <PipelineTabButton
              tab="tac"
              active={activeTab === 'tac'}
              label="6. TAC (Intermediate)"
              badge={compilation.rawTac.length}
              onClick={() => setActiveTab('tac')}
            />
            <PipelineTabButton
              tab="optimizer"
              active={activeTab === 'optimizer'}
              label="7. Optimizer"
              badge={compilation.optimizerResult.logs.length}
              badgeHighlight={compilation.optimizerResult.logs.length > 0}
              onClick={() => setActiveTab('optimizer')}
            />
            <PipelineTabButton
              tab="output"
              active={activeTab === 'output'}
              label="8. CSV Execution"
              badge={compilation.executionResult ? `${compilation.executionResult.matchedRows} rows` : '-'}
              onClick={() => setActiveTab('output')}
            />

          </div>

          {/* Active Tab Panel */}
          <div className="p-4 sm:p-5">
            {activeTab === 'tokens' && (
              <TokensView tokens={compilation.tokens} />
            )}

            {activeTab === 'symbolTable' && (
              <SymbolTableView
                symbolEntries={compilation.symbolEntries}
                catalog={catalog}
              />
            )}

            {activeTab === 'ast' && (
              <ASTTreeView ast={compilation.ast} />
            )}

            {activeTab === 'errors' && (
              <ErrorRecoveryView
                diagnostics={compilation.allDiagnostics}
                sourceQuery={query}
                recoveredErrorsCount={compilation.recoveredErrorsCount}
              />
            )}

            {activeTab === 'semantic' && (
              <SemanticView
                semanticResult={compilation.semanticResult}
                ast={compilation.ast}
              />
            )}

            {activeTab === 'tac' && (
              <TACView tacList={compilation.rawTac} />
            )}

            {activeTab === 'optimizer' && (
              <OptimizerView
                beforeTac={compilation.rawTac}
                optimizerResult={compilation.optimizerResult}
              />
            )}

            {activeTab === 'output' && (
              <ExecutionView
                executionResult={compilation.executionResult}
                tableName={compilation.ast?.fromTable || 'students'}
              />
            )}


          </div>
        </div>
      </main>

      {/* Database Modal */}
      {isDataModalOpen && (
        <DataEditorModal
          csvData={csvContent}
          onSave={newCsv => setCsvContent(newCsv)}
          onClose={() => setIsDataModalOpen(false)}
        />
      )}


    </div>
  );
}

interface PipelineTabButtonProps {
  tab: PipelineTab;
  active: boolean;
  label: string;
  badge?: number | string;
  badgeAlert?: boolean;
  badgeHighlight?: boolean;
  onClick: () => void;
}

const PipelineTabButton: React.FC<PipelineTabButtonProps> = ({
  active,
  label,
  badge,
  badgeAlert,
  badgeHighlight,
  onClick
}) => {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-3 text-xs font-medium whitespace-nowrap border-b-2 flex items-center gap-1.5 transition-colors ${active
          ? 'border-slate-900 text-slate-900 font-bold bg-white'
          : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
        }`}
    >
      <span>{label}</span>
      {badge !== undefined && (
        <span
          className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${badgeAlert
              ? 'bg-red-100 text-red-700 font-bold'
              : badgeHighlight
                ? 'bg-amber-100 text-amber-800 font-bold'
                : active
                  ? 'bg-slate-200 text-slate-800'
                  : 'bg-slate-200/70 text-slate-600'
            }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
};
