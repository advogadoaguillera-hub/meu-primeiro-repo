// Ponto de partida do servidor: `npm start`.

import { carregarEnv } from './env.js';
carregarEnv();

const { criarApp } = await import('./app.js');
const { abrirBanco } = await import('./db.js');
const { criarUsuario } = await import('./auth.js');
const { sincronizarTodos, datajudConfigurado } = await import('./datajud.js');

abrirBanco();

// Primeira execução: cria o gestor a partir do .env.
const temGestor = abrirBanco().prepare("SELECT 1 FROM usuarios WHERE papel = 'gestor'").get();
if (!temGestor) {
  const { GESTOR_NOME, GESTOR_EMAIL, GESTOR_SENHA } = process.env;
  if (GESTOR_EMAIL && GESTOR_SENHA) {
    criarUsuario({ nome: GESTOR_NOME || 'Gestor', email: GESTOR_EMAIL, senha: GESTOR_SENHA, papel: 'gestor' });
    console.log(`Gestor criado: ${GESTOR_EMAIL}. Troque a senha no primeiro acesso e apague GESTOR_SENHA do .env.`);
  } else {
    console.warn('Nenhum gestor cadastrado. Preencha GESTOR_EMAIL e GESTOR_SENHA no .env e reinicie.');
  }
}

const porta = Number(process.env.PORT || 3000);
criarApp().listen(porta, () => console.log(`Aguillera no ar: http://localhost:${porta}`));

// Andamentos automáticos: consulta os tribunais a cada N horas (padrão 6).
if (datajudConfigurado()) {
  const horas = Number(process.env.DATAJUD_INTERVALO_HORAS || 6);
  const rodar = () => sincronizarTodos()
    .then((r) => console.log(`[datajud] ${r.processos} processos consultados, ${r.novos} andamentos novos, ${r.erros.length} erros.`))
    .catch((e) => console.error('[datajud]', e.message));
  setTimeout(rodar, 30_000);
  setInterval(rodar, horas * 3_600_000).unref();
}
