// Claude dentro do aplicativo.
//  1) Assistente do escritório: o gestor e a equipe pedem em português
//     ("quem está inadimplente?", "lança o andamento de hoje no processo X")
//     e o Claude consulta e opera o sistema pelas ferramentas abaixo.
//  2) Sugestão de resposta ao cliente: o Claude redige, a equipe revisa e envia.
//  3) Explicação de andamento: traduz o "juridiquês" para o cliente.
//
// Regra de ouro: o Claude NUNCA envia mensagem ao cliente sozinho.
// Ele redige; uma pessoa do escritório revisa e envia.

import Anthropic from '@anthropic-ai/sdk';
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import escritorio from '../config/escritorio.js';
import * as n from './nucleo.js';
import { ferramentas } from './ferramentas.js';

const MODELO = () => process.env.CLAUDE_MODEL || 'claude-opus-5-5';

export const claudeConfigurado = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

let cliente;
const api = () => (cliente ??= new Anthropic());

// Recusa por política de segurança: o próprio servidor tenta outro modelo
// adequado antes de desistir ("fallbacks: default").
const SEGURANCA = { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' };

const json = (v) => JSON.stringify(v, null, 1);
const reais = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function textoFinal(msg) {
  if (msg.stop_reason === 'refusal') return 'Não consegui atender a este pedido. Reformule ou faça a tarefa manualmente.';
  return msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
}

// ---------------------------------------------------------------- ferramentas
// Definidas em ferramentas.js (as mesmas da extensão MCP), adaptadas ao SDK.
export function ferramentasDoEscritorio(usuario) {
  return ferramentas(usuario.id).map((f) => betaZodTool({
    name: f.nome,
    description: f.descricao,
    inputSchema: f.esquema,
    run: async (args) => {
      try {
        return json(await f.executar(args));
      } catch (e) {
        return `Erro: ${e.message}`;
      }
    },
  }));
}

function sistemaDoEscritorio(usuario) {
  return `Você é o assistente de gestão do escritório ${escritorio.marca.nomeCompleto} (${escritorio.advogado.oab}).
Quem fala com você: ${usuario.nome}, ${usuario.papel === 'gestor' ? 'gestor do escritório' : 'membro da equipe (estagiário)'}.

Como trabalhar:
- Use as ferramentas para consultar dados reais. Nunca invente cliente, processo, valor ou prazo; se o dado não existe no sistema, diga isso.
- Valores das ferramentas vêm em centavos; ao responder, escreva em reais (R$ 1.234,56).
- Antes de qualquer escrita (andamento, cobrança, pagamento, solicitação), confirme o essencial com a pessoa quando o pedido não for inequívoco.
- Você não envia mensagens a clientes. Quando pedirem uma mensagem, escreva o rascunho na sua resposta para a equipe revisar e enviar.
- Ao redigir para clientes, respeite o Código de Ética da OAB: sem promessa de resultado, tom claro, respeitoso e humano.
- Responda em português do Brasil, de forma direta e organizada. Comece pela resposta; detalhe depois.
Data de hoje: ${n.hoje()}.`;
}

// Conversa com o assistente. `historico` é a conversa visível: [{papel:'usuario'|'assistente', texto}].
export async function conversarComAssistente(usuario, historico) {
  if (!claudeConfigurado()) throw new n.ErroDeRegra('O Claude ainda não foi conectado. Configure ANTHROPIC_API_KEY no arquivo .env.', 503);
  const mensagens = historico
    .filter((m) => m && typeof m.texto === 'string' && m.texto.trim())
    .slice(-30)
    .map((m) => ({ role: m.papel === 'assistente' ? 'assistant' : 'user', content: m.texto.slice(0, 20_000) }));
  // A conversa enviada ao Claude começa sempre por um pedido da pessoa.
  while (mensagens.length && mensagens[0].role !== 'user') mensagens.shift();
  if (!mensagens.length || mensagens.at(-1).role !== 'user') throw new n.ErroDeRegra('Escreva o seu pedido.');

  const final = await api().beta.messages.toolRunner({
    model: MODELO(),
    max_tokens: 16000,
    output_config: { effort: 'medium' },
    system: sistemaDoEscritorio(usuario),
    tools: ferramentasDoEscritorio(usuario),
    messages: mensagens,
    max_iterations: 12,
    thread: false,
    ...SEGURANCA,
  });
  n.registrar(usuario.id, 'claude.assistente', { pergunta: mensagens.at(-1).content.slice(0, 120) }, 'claude');
  return textoFinal(final);
}

async function pedirTexto(sistema, pedido) {
  if (!claudeConfigurado()) throw new n.ErroDeRegra('O Claude ainda não foi conectado. Configure ANTHROPIC_API_KEY no arquivo .env.', 503);
  const msg = await api().beta.messages.create({
    model: MODELO(),
    max_tokens: 4000,
    output_config: { effort: 'low' },
    system: sistema,
    messages: [{ role: 'user', content: pedido }],
    ...SEGURANCA,
  });
  return textoFinal(msg);
}

// Rascunho de resposta para a conversa de um cliente.
export async function sugerirResposta(clienteId, usuario) {
  const c = n.exigirCliente(clienteId);
  const conversa = n.listarConversa(clienteId).slice(-25)
    .map((m) => `[${m.criado_em}] ${m.do_escritorio ? 'ESCRITÓRIO' : 'CLIENTE'}: ${m.texto}`).join('\n');
  const processos = n.listarProcessos({ clienteId, apenasVisivel: true })
    .map((p) => `- ${p.titulo} (${p.numero_cnj || 'sem número'}), situação ${p.status}; último andamento: ${p.ultimo_andamento || 'nenhum'}`).join('\n');
  const abertas = n.listarCobrancas({ clienteId }).filter((x) => x.status === 'aberta')
    .map((x) => `- ${x.descricao}: ${reais(x.valor_centavos)}, vence ${x.vencimento} (${x.situacao})`).join('\n');

  const texto = await pedirTexto(
    `Você redige respostas do escritório ${escritorio.marca.nomeCompleto} para clientes, que um advogado ou estagiário vai revisar antes de enviar.
Escreva só o texto da mensagem, pronto para enviar: cordial, claro, sem juridiquês, sem promessa de resultado (Código de Ética da OAB).
Use apenas os fatos fornecidos. Se a pergunta exigir informação que não está nos dados, diga ao cliente que o escritório vai verificar e retornar — não invente.`,
    `Cliente: ${c.nome}\n\nProcessos:\n${processos || '(nenhum)'}\n\nCobranças em aberto:\n${abertas || '(nenhuma)'}\n\nConversa (mais recente por último):\n${conversa || '(vazia)'}\n\nRedija a próxima mensagem do escritório.`,
  );
  n.registrar(usuario.id, 'claude.sugestao_resposta', { cliente_id: clienteId }, 'claude');
  return texto;
}

// Explicação simples de um andamento técnico, para o cliente.
export async function explicarAndamento(processoId, descricao, usuario) {
  const p = n.buscarProcesso(processoId);
  const texto = await pedirTexto(
    `Você explica andamentos processuais para clientes leigos do escritório ${escritorio.marca.nomeCompleto}.
Em no máximo 3 frases: o que aconteceu e o que significa agora. Sem promessa de resultado. Sem inventar fatos além do andamento.`,
    `Processo: ${p.titulo} (${p.area || 'área não informada'})\nAndamento: ${descricao}`,
  );
  n.registrar(usuario.id, 'claude.explicacao', { processo_id: processoId }, 'claude');
  return texto;
}
