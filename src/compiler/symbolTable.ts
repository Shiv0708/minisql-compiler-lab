import { Token, SymbolEntry, TableSchema } from './types';

export function buildIdentifierSymbolTable(
  tokens: Token[],
  catalog: TableSchema[]
): SymbolEntry[] {
  const map = new Map<string, SymbolEntry>();

  // Known catalog column names and table names
  const tableNames = new Set(catalog.map(t => t.name.toLowerCase()));
  const colTypes = new Map<string, 'INT' | 'FLOAT' | 'STRING' | 'BOOLEAN'>();

  catalog.forEach(table => {
    table.columns.forEach(col => {
      colTypes.set(col.name.toLowerCase(), col.type);
    });
  });

  for (const token of tokens) {
    if (token.type === 'IDENT' || token.type === 'KEYWORD') {
      const lower = token.lexeme.toLowerCase();
      const existing = map.get(lower);

      if (existing) {
        existing.occurrences++;
      } else {
        let category: SymbolEntry['category'] = 'IDENTIFIER';
        let dataType: SymbolEntry['dataType'] = undefined;

        if (token.type === 'KEYWORD') {
          category = 'KEYWORD';
        } else if (tableNames.has(lower)) {
          category = 'TABLE';
        } else if (colTypes.has(lower)) {
          category = 'COLUMN';
          dataType = colTypes.get(lower);
        }

        map.set(lower, {
          name: token.lexeme,
          firstSeenLine: token.line,
          firstSeenColumn: token.column,
          occurrences: 1,
          category,
          dataType
        });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.category !== b.category) {
      const order = { TABLE: 1, COLUMN: 2, IDENTIFIER: 3, KEYWORD: 4 };
      return (order[a.category] || 5) - (order[b.category] || 5);
    }
    return a.firstSeenLine - b.firstSeenLine || a.firstSeenColumn - b.firstSeenColumn;
  });
}
