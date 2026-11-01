// Extensão do Claude: servidor MCP do escritório Aguillera.
// Conecte no Claude Desktop ou no Claude Code e peça em português:
//   "quem está inadimplente?", "lança o andamento de hoje no processo 12",
//   "resume as mensagens não lidas", "cria parcelamento de 6x de 3.000 para a Maria".
//
// Roda na máquina onde está o banco (mesmo arquivo do aplicativo).
// Age em nome de MCP_USUARIO_EMAIL (padrão: o gestor) — tudo fica na auditoria.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { carregarEnv } from '../server/env.js';

carregarEnv();
const { abrirBanco } = await import('../server/db.js');
const { ferramentas } = await import('../server/ferramentas.js');

const db = abrirBanco();
const email = process.env.MCP_USUARIO_EMAIL;
const usuario = email
  ? db.prepare("SELECT id, nome, papel FROM usuarios WHERE email = ? AND papel IN ('gestor','equipe') AND ativo = 1").get(email)
  : db.prepare("SELECT id, nome, papel FROM usuarios WHERE papel = 'gestor'").get();

if (!usuario) {
  console.error('Nenhum usuário do escritório encontrado. Rode o aplicativo uma vez (npm start) para criar o gestor, ou ajuste MCP_USUARIO_EMAIL.');
  process.exit(1);
}

const servidor = new McpServer({ name: 'aguillera-escritorio', version: '0.1.0' });

for (const f of ferramentas(usuario.id)) {
  servidor.registerTool(f.nome, {
    description: f.descricao,
    inputSchema: f.esquema,
    annotations: { readOnlyHint: !f.escreve, destructiveHint: false },
  }, async (args) => {
    try {
      return { content: [{ type: 'text', text: JSON.stringify(await f.executar(args ?? {}), null, 1) }] };
    } catch (e) {
      return { isError: true, content: [{ type: 'text', text: `Erro: ${e.message}` }] };
    }
  });
}

await servidor.connect(new StdioServerTransport());
console.error(`MCP Aguillera conectado como ${usuario.nome} (${usuario.papel}).`);
