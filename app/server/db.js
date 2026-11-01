// Banco de dados: SQLite embutido no próprio Node (node:sqlite).
// Um único arquivo, sem servidor de banco para instalar ou pagar.
// O mesmo arquivo é lido pelo aplicativo e pela extensão do Claude (mcp/).

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function caminhoDoBanco() {
  const p = process.env.DB_PATH || 'data/aguillera.db';
  return p === ':memory:' ? p : resolve(raiz, p);
}

const ESQUEMA = `
CREATE TABLE IF NOT EXISTS usuarios (
  id            INTEGER PRIMARY KEY,
  nome          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  senha_hash    TEXT NOT NULL,
  papel         TEXT NOT NULL CHECK (papel IN ('gestor','equipe','cliente')),
  ativo         INTEGER NOT NULL DEFAULT 1,
  telefone      TEXT,
  cpf           TEXT,
  endereco      TEXT,
  area_interesse TEXT,
  observacoes   TEXT,
  consentimento_lgpd_em TEXT,
  criado_em     TEXT NOT NULL DEFAULT (datetime('now')),
  ultimo_acesso TEXT
);

CREATE TABLE IF NOT EXISTS sessoes (
  token_hash  TEXT PRIMARY KEY,
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  expira_em   TEXT NOT NULL,
  criado_em   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS processos (
  id             INTEGER PRIMARY KEY,
  cliente_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  numero_cnj     TEXT,
  titulo         TEXT NOT NULL,
  area           TEXT,
  tribunal       TEXT,
  status         TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','suspenso','arquivado','encerrado')),
  responsavel_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  sincronizar    INTEGER NOT NULL DEFAULT 1,
  sincronizado_em TEXT,
  criado_em      TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS andamentos (
  id              INTEGER PRIMARY KEY,
  processo_id     INTEGER NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  data            TEXT NOT NULL,
  descricao       TEXT NOT NULL,
  explicacao      TEXT,
  origem          TEXT NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual','datajud','claude')),
  visivel_cliente INTEGER NOT NULL DEFAULT 1,
  autor_id        INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (processo_id, data, descricao)
);

CREATE TABLE IF NOT EXISTS mensagens (
  id           INTEGER PRIMARY KEY,
  cliente_id   INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  autor_id     INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  texto        TEXT NOT NULL,
  do_escritorio INTEGER NOT NULL DEFAULT 0,
  lida         INTEGER NOT NULL DEFAULT 0,
  criado_em    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS documentos (
  id          INTEGER PRIMARY KEY,
  cliente_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  processo_id INTEGER REFERENCES processos(id) ON DELETE SET NULL,
  tipo        TEXT NOT NULL CHECK (tipo IN ('contrato','procuracao','declaracao','comprovante','documento_pessoal','peca','outro')),
  titulo      TEXT NOT NULL,
  arquivo     TEXT NOT NULL,
  nome_original TEXT NOT NULL,
  mime        TEXT NOT NULL,
  tamanho     INTEGER NOT NULL,
  enviado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel','aguardando_assinatura','assinado')),
  criado_em   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cobrancas (
  id             INTEGER PRIMARY KEY,
  cliente_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  processo_id    INTEGER REFERENCES processos(id) ON DELETE SET NULL,
  descricao      TEXT NOT NULL,
  valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
  vencimento     TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','paga','cancelada')),
  pago_em        TEXT,
  link_pagamento TEXT,
  criado_em      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS solicitacoes (
  id          INTEGER PRIMARY KEY,
  cliente_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  area        TEXT,
  assunto     TEXT NOT NULL,
  descricao   TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'nova' CHECK (status IN ('nova','em_analise','aceita','recusada','concluida')),
  resposta    TEXT,
  criado_em   TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS auditoria (
  id         INTEGER PRIMARY KEY,
  usuario_id INTEGER,
  origem     TEXT NOT NULL DEFAULT 'app',
  acao       TEXT NOT NULL,
  detalhe    TEXT,
  criado_em  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Visitas ao site, já somadas por dia/página/fonte. Nada identifica a pessoa:
-- sem IP, sem cookie, sem nome. Basta para saber o que é visto e de onde vêm.
CREATE TABLE IF NOT EXISTS visitas (
  dia        TEXT NOT NULL,
  pagina     TEXT NOT NULL,
  fonte      TEXT NOT NULL,
  vistas     INTEGER NOT NULL DEFAULT 0,
  visitantes INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dia, pagina, fonte)
);

CREATE INDEX IF NOT EXISTS ix_processos_cliente ON processos(cliente_id);
CREATE INDEX IF NOT EXISTS ix_andamentos_processo ON andamentos(processo_id, data);
CREATE INDEX IF NOT EXISTS ix_mensagens_cliente ON mensagens(cliente_id, criado_em);
CREATE INDEX IF NOT EXISTS ix_documentos_cliente ON documentos(cliente_id);
CREATE INDEX IF NOT EXISTS ix_cobrancas_cliente ON cobrancas(cliente_id, vencimento);
CREATE INDEX IF NOT EXISTS ix_solicitacoes_status ON solicitacoes(status);
`;

let banco;

export function abrirBanco() {
  if (banco) return banco;
  const caminho = caminhoDoBanco();
  if (caminho !== ':memory:') mkdirSync(dirname(caminho), { recursive: true });
  banco = new DatabaseSync(caminho);
  banco.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  banco.exec(ESQUEMA);
  migrar(banco);
  return banco;
}

// Colunas acrescentadas depois da primeira versão: bancos antigos ganham a coluna sem perder nada.
function migrar(db) {
  const colunas = (t) => db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name);
  if (!colunas('usuarios').includes('origem')) db.exec('ALTER TABLE usuarios ADD COLUMN origem TEXT');
}

export function fecharBanco() {
  if (banco) banco.close();
  banco = undefined;
}

// Executa várias escritas como uma só: ou tudo grava, ou nada grava.
export function transacao(fn) {
  const db = abrirBanco();
  db.exec('BEGIN');
  try {
    const r = fn(db);
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
