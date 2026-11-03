// Extensão do Claude: liga o Claude Desktop / Claude Code ao sistema do escritório.
// Você pede em português ("quem está inadimplente?", "lança o andamento de hoje
// no processo 12") e o Claude usa as ferramentas abaixo. Usa a sua assinatura do
// Claude: não precisa de chave da API da Anthropic.
//
// Funciona com o sistema em qualquer lugar (Cloudflare, Google, seu computador):
//   AGUILLERA_URL   = endereço do sistema   (ex.: https://area.aguillera.art.br)
//   AGUILLERA_CHAVE = chave de acesso criada em "Minha conta → Chaves do Claude"
// Tudo o que o Claude fizer fica no registro de atividades, em seu nome.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { carregarEnv } from '../server/env.js';
import { ferramentas } from '../server/ferramentas.js';

carregarEnv();
const URL_SISTEMA = String(process.env.AGUILLERA_URL || '').replace(/\/$/, '');
const CHAVE = process.env.AGUILLERA_CHAVE || '';

if (!URL_SISTEMA || !CHAVE) {
  console.error('Configure AGUILLERA_URL e AGUILLERA_CHAVE (veja o README, seção "Usar o escritório de dentro do Claude").');
  process.exit(1);
}

async function chamar(caminho, corpo) {
  const resp = await fetch(`${URL_SISTEMA}/api/escritorio${caminho}`, {
    method: corpo === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${CHAVE}`, 'Content-Type': 'application/json' },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
    signal: AbortSignal.timeout(30_000),
  });
  const dados = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(dados.erro || `O sistema respondeu ${resp.status}.`);
  return dados;
}

const servidor = new McpServer({ name: 'aguillera-escritorio', version: '0.2.0' });

// Os nomes, descrições e formatos vêm das mesmas definições do servidor;
// quem executa é o sistema na nuvem, com as permissões de quem criou a chave.
for (const f of ferramentas(0)) {
  servidor.registerTool(f.nome, {
    description: f.descricao,
    inputSchema: f.esquema,
    annotations: { readOnlyHint: !f.escreve, destructiveHint: false },
  }, async (args) => {
    try {
      return { content: [{ type: 'text', text: JSON.stringify(await chamar(`/ferramentas/${f.nome}`, args ?? {}), null, 1) }] };
    } catch (e) {
      return { isError: true, content: [{ type: 'text', text: `Erro: ${e.message}` }] };
    }
  });
}

await servidor.connect(new StdioServerTransport());
const eu = await chamar('/equipe').then(() => 'conectado').catch((e) => `sem acesso (${e.message})`);
console.error(`MCP Aguillera → ${URL_SISTEMA}: ${eu}.`);
