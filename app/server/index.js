// Ponto de partida no Node: `npm start` (computador ou servidor comum).

import { carregarEnv } from './env.js';
carregarEnv();

const { montarNode, iniciarServidor } = await import('./node.js');
const { garantirGestor } = await import('./inicio.js');
const { sincronizarTodos, datajudConfigurado } = await import('./datajud.js');

const app = await montarNode(process.env);

const gestor = await garantirGestor();
if (gestor === 'criado') console.log(`Gestor criado: ${process.env.GESTOR_EMAIL}. Troque a senha no primeiro acesso e apague GESTOR_SENHA do .env.`);
if (gestor === 'faltam-dados') console.warn('Nenhum gestor cadastrado. Preencha GESTOR_EMAIL e GESTOR_SENHA no .env e reinicie.');

const porta = Number(process.env.PORT || 3000);
iniciarServidor(app, porta).once('listening', () => console.log(`Aguillera no ar: http://localhost:${porta}`));

// Andamentos automáticos: consulta os tribunais a cada N horas (padrão 6).
if (datajudConfigurado()) {
  const horas = Number(process.env.DATAJUD_INTERVALO_HORAS || 6);
  const rodar = () => sincronizarTodos()
    .then((r) => console.log(`[datajud] ${r.processos} processos consultados, ${r.novos} andamentos novos, ${r.erros.length} erros.`))
    .catch((e) => console.error('[datajud]', e.message));
  setTimeout(rodar, 30_000);
  setInterval(rodar, horas * 3_600_000).unref();
}
