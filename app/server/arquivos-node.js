// Tomada de arquivos para o Node: uma pasta do disco.

import fs from 'node:fs/promises';
import { resolve, sep } from 'node:path';

export async function arquivosEmPasta(pasta) {
  await fs.mkdir(pasta, { recursive: true });
  const caminho = (nome) => {
    const c = resolve(pasta, nome);
    if (!c.startsWith(resolve(pasta) + sep)) throw new Error('Nome de arquivo inválido.');
    return c;
  };
  return {
    salvar: async (nome, dados) => fs.writeFile(caminho(nome), new Uint8Array(dados)),
    ler: async (nome) => {
      try { return await fs.readFile(caminho(nome)); } catch { return null; }
    },
    apagar: async (nome) => fs.rm(caminho(nome), { force: true }),
  };
}

