// Variáveis de configuração (chaves, senhas, opções).
// No computador/servidor comum vêm do .env (process.env); no Cloudflare vêm
// das "variáveis e segredos" do Worker. O resto do código lê só por aqui.

let fonte = {};

export function definirAmbiente(objeto) {
  fonte = objeto || {};
}

export const variavel = (nome, padrao = '') => {
  const v = fonte[nome];
  return v === undefined || v === null || v === '' ? padrao : String(v);
};
