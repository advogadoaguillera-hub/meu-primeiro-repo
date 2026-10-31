// Ferramentas que o Claude usa para operar o escritório.
// Definidas uma única vez e servidas por dois caminhos:
//   - server/claude.js → assistente dentro do aplicativo (API do Claude)
//   - mcp/server.js    → extensão para o Claude Desktop / Claude Code (MCP)
// Toda escrita entra na auditoria com origem "claude".

import { z } from 'zod';
import * as n from './nucleo.js';

const STATUS_PROCESSO = ['ativo', 'suspenso', 'arquivado', 'encerrado'];
const STATUS_SOLICITACAO = ['nova', 'em_analise', 'aceita', 'recusada', 'concluida'];

export function ferramentas(autorId) {
  return [
    {
      nome: 'painel_do_escritorio',
      descricao: 'Números do escritório agora: clientes ativos e novos, processos ativos, mensagens não lidas, solicitações novas, recebido no mês, a receber, em atraso, vencimentos dos próximos 7 dias e andamentos recentes. Valores em centavos.',
      esquema: z.object({}),
      executar: () => n.painel(),
    },
    {
      nome: 'listar_clientes',
      descricao: 'Lista clientes com processos ativos, valores pagos e em atraso (centavos) e mensagens não lidas. Filtre por nome/e-mail/CPF/telefone e por situação.',
      esquema: z.object({
        busca: z.string().optional().describe('Trecho do nome, e-mail, CPF ou telefone'),
        situacao: z.enum(['todos', 'inadimplentes', 'em_dia', 'inativos']).optional(),
      }),
      executar: (a) => n.listarClientes(a),
    },
    {
      nome: 'ficha_do_cliente',
      descricao: 'Ficha completa de um cliente: dados cadastrais, processos, cobranças, documentos, solicitações e as últimas 20 mensagens.',
      esquema: z.object({ cliente_id: z.number().int() }),
      executar: ({ cliente_id }) => ({
        cliente: n.exigirCliente(cliente_id),
        processos: n.listarProcessos({ clienteId: cliente_id }),
        cobrancas: n.listarCobrancas({ clienteId: cliente_id }),
        documentos: n.listarDocumentos(cliente_id),
        solicitacoes: n.listarSolicitacoes({ clienteId: cliente_id }),
        ultimas_mensagens: n.listarConversa(cliente_id).slice(-20),
      }),
    },
    {
      nome: 'listar_inadimplentes',
      descricao: 'Clientes com cobranças vencidas e não pagas: quantas parcelas, total (centavos) e desde quando.',
      esquema: z.object({}),
      executar: () => n.inadimplentes(),
    },
    {
      nome: 'buscar_processos',
      descricao: 'Busca processos por título, número CNJ ou nome do cliente; filtra por situação ou cliente.',
      esquema: z.object({
        busca: z.string().optional(),
        status: z.enum(STATUS_PROCESSO).optional(),
        cliente_id: z.number().int().optional(),
      }),
      executar: (a) => n.listarProcessos({ busca: a.busca, status: a.status, clienteId: a.cliente_id }),
    },
    {
      nome: 'ver_processo',
      descricao: 'Dados do processo e todos os andamentos (inclusive os internos, não visíveis ao cliente).',
      esquema: z.object({ processo_id: z.number().int() }),
      executar: ({ processo_id }) => n.buscarProcesso(processo_id),
    },
    {
      nome: 'caixa_de_entrada',
      descricao: 'Conversas com clientes, com a última mensagem e quantas estão sem leitura pelo escritório.',
      esquema: z.object({}),
      executar: () => n.caixaDeEntrada(),
    },
    {
      nome: 'ler_conversa',
      descricao: 'Lê a conversa completa com um cliente (não marca como lida).',
      esquema: z.object({ cliente_id: z.number().int() }),
      executar: ({ cliente_id }) => n.listarConversa(cliente_id),
    },
    {
      nome: 'listar_solicitacoes',
      descricao: 'Pedidos de serviço enviados pelos clientes pelo aplicativo.',
      esquema: z.object({ status: z.enum(STATUS_SOLICITACAO).optional() }),
      executar: (a) => n.listarSolicitacoes(a),
    },
    {
      nome: 'listar_cobrancas',
      descricao: 'Cobranças do escritório (ou de um cliente), com situação: a_vencer, atrasada, paga ou cancelada. Valores em centavos.',
      esquema: z.object({
        cliente_id: z.number().int().optional(),
        situacao: z.enum(['a_vencer', 'atrasada', 'paga', 'cancelada']).optional(),
      }),
      executar: (a) => n.listarCobrancas({ clienteId: a.cliente_id, situacao: a.situacao }),
    },
    {
      nome: 'registrar_andamento',
      descricao: 'Lança um andamento em um processo. Por padrão fica visível ao cliente; use visivel_cliente=false para nota interna. Confirme com a pessoa antes de lançar se o pedido for ambíguo.',
      escreve: true,
      esquema: z.object({
        processo_id: z.number().int(),
        descricao: z.string().describe('O que aconteceu, em linguagem técnica'),
        explicacao: z.string().optional().describe('O que isso significa para o cliente, em linguagem simples'),
        data: z.string().optional().describe('AAAA-MM-DD; padrão: hoje'),
        visivel_cliente: z.boolean().optional(),
      }),
      executar: (a) => n.registrarAndamento(a.processo_id, { ...a, origem: 'claude', visivel_cliente: a.visivel_cliente ?? true }, autorId),
    },
    {
      nome: 'criar_cobranca',
      descricao: 'Cria uma cobrança de honorários, ou um parcelamento mensal. Valor TOTAL em reais (ex.: "3000" ou "3.000,00"). Confirme valor, parcelas e vencimento antes de criar.',
      escreve: true,
      esquema: z.object({
        cliente_id: z.number().int(),
        descricao: z.string(),
        valor: z.string().describe('Valor TOTAL em reais'),
        vencimento: z.string().describe('Primeiro vencimento, AAAA-MM-DD'),
        parcelas: z.number().int().min(1).max(60).optional(),
        processo_id: z.number().int().optional(),
      }),
      executar: (a) => n.criarCobrancas(a, autorId, 'claude'),
    },
    {
      nome: 'marcar_cobranca_paga',
      descricao: 'Registra o pagamento de uma cobrança.',
      escreve: true,
      esquema: z.object({ cobranca_id: z.number().int(), pago_em: z.string().optional().describe('AAAA-MM-DD; padrão: hoje') }),
      executar: (a) => n.alterarCobranca(a.cobranca_id, { status: 'paga', pago_em: a.pago_em }, autorId, 'claude'),
    },
    {
      nome: 'atualizar_solicitacao',
      descricao: 'Muda a situação de uma solicitação de cliente e registra a resposta do escritório (a resposta aparece para o cliente).',
      escreve: true,
      esquema: z.object({
        solicitacao_id: z.number().int(),
        status: z.enum(STATUS_SOLICITACAO),
        resposta: z.string().optional(),
      }),
      executar: (a) => n.responderSolicitacao(a.solicitacao_id, a, autorId, 'claude'),
    },
  ];
}
