// Onde ficam os documentos dos clientes, com duas "tomadas":
//   arquivosEmPasta(pasta) → uma pasta do disco (computador, servidor comum) — em arquivos-node.js
//   arquivosR2(binding)    → Cloudflare R2
// O nome de cada arquivo é sorteado pelo servidor: ninguém escolhe o caminho.

export function arquivosR2(r2) {
  return {
    salvar: async (nome, dados, tipo) => { await r2.put(nome, dados, { httpMetadata: { contentType: tipo } }); },
    ler: async (nome) => {
      const o = await r2.get(nome);
      return o ? o.body : null;
    },
    apagar: async (nome) => r2.delete(nome),
  };
}

let atual = null;
export const usarArquivos = (a) => { atual = a; };
export const arquivos = () => {
  if (!atual) throw new Error('Armazenamento de arquivos não configurado.');
  return atual;
};
