// Tomada do banco para o Node: SQLite embutido (node:sqlite), num arquivo.
// Fica separada para o Cloudflare não precisar carregar nada do Node.

import { DatabaseSync } from 'node:sqlite';
import { valores } from './banco.js';

export async function bancoNode(caminho) {
  const sqlite = new DatabaseSync(caminho);
  sqlite.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  const cache = new Map();
  const st = (sql) => {
    if (!cache.has(sql)) cache.set(sql, sqlite.prepare(sql));
    return cache.get(sql);
  };
  return {
    tipo: 'node',
    get: async (sql, ...a) => st(sql).get(...valores(a)) ?? null,
    all: async (sql, ...a) => st(sql).all(...valores(a)),
    run: async (sql, ...a) => {
      const r = st(sql).run(...valores(a));
      return { changes: Number(r.changes), id: Number(r.lastInsertRowid) };
    },
    // Várias escritas de uma vez: ou todas gravam, ou nenhuma.
    lote: async (lista) => {
      sqlite.exec('BEGIN');
      try {
        const r = lista.map(([sql, ...a]) => {
          const x = st(sql).run(...valores(a));
          return { changes: Number(x.changes), id: Number(x.lastInsertRowid) };
        });
        sqlite.exec('COMMIT');
        return r;
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },
    colunas: async (tabela) => sqlite.prepare(`PRAGMA table_info(${tabela})`).all().map((c) => c.name),
    fechar: () => sqlite.close(),
  };
}

