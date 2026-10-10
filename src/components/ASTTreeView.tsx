import React, { useState, useMemo } from 'react';
import { SelectQueryNode, ExprNode } from '../compiler/types';
import { Code, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ASTTreeViewProps {
  ast: SelectQueryNode | null;
}

// ── Internal Tree Representation ───────────────────────────────────────────
interface InternalNode {
  id: string;
  label: string;
  sublabel?: string;
  category: 'root' | 'clause' | 'operator' | 'identifier' | 'literal';
  children: InternalNode[];
  // Layout computed properties:
  subtreeWidth: number;
  width: number;
  height: number;
  x: number;
  y: number;
}

// ── Colors matching standard textbook & compiler design diagrams ─────────
const STYLES = {
  root: {
    bg: '#0f172a',
    border: '#0f172a',
    text: '#ffffff',
    subtext: '#94a3b8'
  },
  clause: {
    bg: '#f8fafc',
    border: '#3b82f6',
    text: '#1e3a8a',
    subtext: '#60a5fa'
  },
  operator: {
    bg: '#fef2f2',
    border: '#ef4444',
    text: '#991b1b',
    subtext: '#f87171'
  },
  identifier: {
    bg: '#eff6ff',
    border: '#60a5fa',
    text: '#1d4ed8',
    subtext: '#93c5fd'
  },
  literal: {
    bg: '#f0fdf4',
    border: '#22c55e',
    text: '#15803d',
    subtext: '#86efac'
  }
};

let nextId = 0;

// Convert Expression Subtree (recursive)
function exprToInternal(expr: ExprNode): InternalNode {
  const id = `node_${nextId++}`;

  if (expr.type === 'Literal') {
    const val = typeof expr.value === 'string' ? `"${expr.value}"` : String(expr.value);
    return {
      id,
      label: val,
      sublabel: expr.rawType.toLowerCase(),
      category: 'literal',
      children: [],
      subtreeWidth: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0
    };
  }

  if (expr.type === 'Identifier') {
    return {
      id,
      label: expr.name,
      sublabel: 'col',
      category: 'identifier',
      children: [],
      subtreeWidth: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0
    };
  }

  if (expr.type === 'BinaryOp') {
    return {
      id,
      label: expr.operator,
      sublabel: 'op',
      category: 'operator',
      children: [exprToInternal(expr.left), exprToInternal(expr.right)],
      subtreeWidth: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0
    };
  }

  return {
    id,
    label: '?',
    category: 'literal',
    children: [],
    subtreeWidth: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0
  };
}

// Convert full AST to Parse Tree Nodes
function buildTree(ast: SelectQueryNode): InternalNode {
  nextId = 0;

  const selectCols: InternalNode[] = ast.isStar
    ? [
        {
          id: `node_${nextId++}`,
          label: '*',
          sublabel: 'all',
          category: 'identifier',
          children: [],
          subtreeWidth: 0,
          width: 0,
          height: 0,
          x: 0,
          y: 0
        }
      ]
    : ast.selectList.map(item => ({
        id: `node_${nextId++}`,
        label: item.type === 'Identifier' ? item.name : '*',
        sublabel: 'col',
        category: 'identifier',
        children: [],
        subtreeWidth: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0
      }));

  const clauses: InternalNode[] = [
    {
      id: `node_${nextId++}`,
      label: 'SELECT',
      category: 'clause',
      children: selectCols,
      subtreeWidth: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0
    },
    {
      id: `node_${nextId++}`,
      label: 'FROM',
      category: 'clause',
      children: [
        {
          id: `node_${nextId++}`,
          label: ast.fromTable || 'table',
          sublabel: 'table',
          category: 'identifier',
          children: [],
          subtreeWidth: 0,
          width: 0,
          height: 0,
          x: 0,
          y: 0
        }
      ],
      subtreeWidth: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0
    }
  ];

  if (ast.whereClause) {
    clauses.push({
      id: `node_${nextId++}`,
      label: 'WHERE',
      category: 'clause',
      children: [exprToInternal(ast.whereClause)],
      subtreeWidth: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0
    });
  }

  if (ast.orderByClause) {
    clauses.push({
      id: `node_${nextId++}`,
      label: 'ORDER BY',
      sublabel: ast.orderByClause.direction,
      category: 'clause',
      children: [
        {
          id: `node_${nextId++}`,
          label: ast.orderByClause.column,
          sublabel: 'col',
          category: 'identifier',
          children: [],
          subtreeWidth: 0,
          width: 0,
          height: 0,
          x: 0,
          y: 0
        }
      ],
      subtreeWidth: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0
    });
  }

  if (ast.limitClause !== undefined) {
    clauses.push({
      id: `node_${nextId++}`,
      label: 'LIMIT',
      category: 'clause',
      children: [
        {
          id: `node_${nextId++}`,
          label: String(ast.limitClause),
          sublabel: 'number',
          category: 'literal',
          children: [],
          subtreeWidth: 0,
          width: 0,
          height: 0,
          x: 0,
          y: 0
        }
      ],
      subtreeWidth: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0
    });
  }

  return {
    id: `node_${nextId++}`,
    label: 'SelectQuery',
    category: 'root',
    children: clauses,
    subtreeWidth: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0
  };
}

// ── Guaranteed Non-Overlapping Layout Engine ──────────────────────────────
const LEVEL_HEIGHT = 80;
const H_GAP = 28;
const PADDING = 40;

function estimateNodeSize(label: string, sublabel?: string): { width: number; height: number } {
  // If single character or short operator/number (<= 2 chars), make it a neat circle
  if (label.length <= 2 && !sublabel) {
    return { width: 44, height: 44 };
  }
  // Otherwise make a clean rounded capsule/pill
  const textLen = Math.max(label.length, (sublabel || '').length);
  const width = Math.max(64, textLen * 9.5 + 24);
  const height = sublabel ? 46 : 38;
  return { width, height };
}

// Phase 1: Compute node dimensions and bottom-up subtree widths
function computeSubtreeWidths(node: InternalNode): number {
  const { width, height } = estimateNodeSize(node.label, node.sublabel);
  node.width = width;
  node.height = height;

  if (node.children.length === 0) {
    node.subtreeWidth = node.width + H_GAP;
    return node.subtreeWidth;
  }

  let childrenWidthSum = 0;
  for (const child of node.children) {
    childrenWidthSum += computeSubtreeWidths(child);
  }

  node.subtreeWidth = Math.max(node.width + H_GAP, childrenWidthSum);
  return node.subtreeWidth;
}

// Phase 2: Top-down coordinate assignment (strictly disjoint horizontal bounds)
function assignPositions(
  node: InternalNode,
  leftBound: number,
  depth: number,
  allNodes: InternalNode[],
  edges: { from: InternalNode; to: InternalNode }[]
) {
  // Center this node within its reserved subtree slice
  node.x = leftBound + node.subtreeWidth / 2;
  node.y = depth * LEVEL_HEIGHT + PADDING;
  allNodes.push(node);

  if (node.children.length > 0) {
    // If the reserved subtreeWidth is wider than total children, center children
    const totalChildrenWidth = node.children.reduce((acc, c) => acc + c.subtreeWidth, 0);
    let currentLeft = leftBound + (node.subtreeWidth - totalChildrenWidth) / 2;

    for (const child of node.children) {
      edges.push({ from: node, to: child });
      assignPositions(child, currentLeft, depth + 1, allNodes, edges);
      currentLeft += child.subtreeWidth;
    }
  }
}

function runLayout(root: InternalNode) {
  computeSubtreeWidths(root);

  const allNodes: InternalNode[] = [];
  const edges: { from: InternalNode; to: InternalNode }[] = [];

  assignPositions(root, PADDING, 0, allNodes, edges);

  const maxX = Math.max(...allNodes.map(n => n.x + n.width / 2)) + PADDING;
  const maxY = Math.max(...allNodes.map(n => n.y + n.height / 2)) + PADDING;

  return { nodes: allNodes, edges, width: maxX, height: maxY };
}

// ── SVG Diagram Component ─────────────────────────────────────────────────
export const ASTTreeView: React.FC<ASTTreeViewProps> = ({ ast }) => {
  const [viewMode, setViewMode] = useState<'diagram' | 'json'>('diagram');
  const [zoom, setZoom] = useState<number>(1);

  const layoutData = useMemo(() => {
    if (!ast) return null;
    const root = buildTree(ast);
    return runLayout(root);
  }, [ast]);

  if (!ast || !layoutData) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded text-slate-500 text-sm">
        No AST available. Parser did not produce a valid syntax tree due to syntax errors.
      </div>
    );
  }

  const { nodes, edges, width, height } = layoutData;

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between bg-slate-50 p-2.5 rounded border border-slate-200 gap-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-700">
            Parse Tree (Syntax Tree)
          </span>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> Clause
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500"></span> Operator
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span> Identifier
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Literal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {viewMode === 'diagram' && (
            <div className="flex items-center border border-slate-200 rounded bg-white text-xs text-slate-600">
              <button
                onClick={() => setZoom(z => Math.max(0.6, Number((z - 0.1).toFixed(1))))}
                className="p-1 hover:bg-slate-100 border-r border-slate-200"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-mono text-[11px]">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom(z => Math.min(1.6, Number((z + 0.1).toFixed(1))))}
                className="p-1 hover:bg-slate-100 border-r border-slate-200"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoom(1)}
                className="p-1 hover:bg-slate-100"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 bg-white p-0.5 rounded border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('diagram')}
              className={`px-2.5 py-1 rounded transition-colors ${
                viewMode === 'diagram'
                  ? 'bg-slate-800 text-white font-medium'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Visual Tree
            </button>
            <button
              onClick={() => setViewMode('json')}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                viewMode === 'json'
                  ? 'bg-slate-800 text-white font-medium'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Code className="w-3 h-3" />
              JSON AST
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'json' ? (
        <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded border border-slate-800 overflow-x-auto max-h-[500px]">
          {JSON.stringify(ast, null, 2)}
        </pre>
      ) : (
        <div className="border border-slate-200 rounded-lg bg-white shadow-xs overflow-auto max-h-[620px] p-6 flex justify-center items-start">
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out'
            }}
          >
            <svg
              width={width}
              height={height}
              className="block"
              style={{ overflow: 'visible' }}
            >
              {/* Connecting lines */}
              {edges.map((edge, i) => {
                const startY = edge.from.y + edge.from.height / 2;
                const endY = edge.to.y - edge.to.height / 2;

                return (
                  <line
                    key={i}
                    x1={edge.from.x}
                    y1={startY}
                    x2={edge.to.x}
                    y2={endY}
                    stroke="#94a3b8"
                    strokeWidth={1.75}
                    strokeLinecap="round"
                  />
                );
              })}

              {/* Node capsules / circles */}
              {nodes.map(node => {
                const style = STYLES[node.category];
                const isCircle = node.width === node.height;
                const rx = isCircle ? node.width / 2 : 18;
                const ry = isCircle ? node.height / 2 : 18;

                return (
                  <g key={node.id} className="cursor-default select-none">
                    {/* Node Shape */}
                    <rect
                      x={node.x - node.width / 2}
                      y={node.y - node.height / 2}
                      width={node.width}
                      height={node.height}
                      rx={rx}
                      ry={ry}
                      fill={style.bg}
                      stroke={style.border}
                      strokeWidth={1.5}
                      className="transition-all duration-150"
                      filter="drop-shadow(0 1px 2px rgba(0, 0, 0, 0.05))"
                    />

                    {/* Main Label */}
                    <text
                      x={node.x}
                      y={node.y + (node.sublabel ? -3 : 4)}
                      textAnchor="middle"
                      fill={style.text}
                      fontSize={node.label.length > 10 ? 11 : 12}
                      fontWeight="600"
                      fontFamily="ui-monospace, monospace"
                    >
                      {node.label}
                    </text>

                    {/* Sub-label (type) */}
                    {node.sublabel && (
                      <text
                        x={node.x}
                        y={node.y + 11}
                        textAnchor="middle"
                        fill={style.subtext}
                        fontSize={8.5}
                        fontWeight="500"
                        fontFamily="ui-sans-serif, system-ui, sans-serif"
                        letterSpacing="0.02em"
                      >
                        {node.sublabel.toUpperCase()}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};
