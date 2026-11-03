// Primeira execução: cria o gestor a partir das variáveis GESTOR_EMAIL e GESTOR_SENHA
// (no .env ou nos segredos do Cloudflare). Depois disso, não faz mais nada.

import { db } from './banco.js';
import { criarUsuario } from './auth.js';
import { variavel } from './ambiente.js';

export async function garantirGestor() {
  if (await db().get("SELECT 1 FROM usuarios WHERE papel = 'gestor'")) return 'existe';
  const email = variavel('GESTOR_EMAIL');
  const senha = variavel('GESTOR_SENHA');
  if (!email || !senha) return 'faltam-dados';
  await criarUsuario({ nome: variavel('GESTOR_NOME', 'Gestor'), email, senha, papel: 'gestor' });
  return 'criado';
}
