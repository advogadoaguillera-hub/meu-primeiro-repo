# Aguillera — aplicativo do escritório

Portal do cliente, gestão interna e extensão do Claude, em um só aplicativo, com a
identidade visual do escritório (verde profundo, ouro, EB Garamond).

```
                        ┌───────────────────────────┐
  Cliente (celular) ───▶│                           │◀─── Gestor (você) — controla tudo
  Estagiários ─────────▶│   Aplicativo Aguillera    │
                        │   (servidor + banco)      │◀─── Claude: assistente no app
  Tribunais (DataJud) ─▶│                           │◀─── Claude Desktop / Code (MCP)
                        └───────────────────────────┘
```

## 1. O que cada pessoa vê

| Quem | O que faz no aplicativo |
|---|---|
| **Cliente** | Cadastra-se sozinho (com consentimento LGPD). Acompanha os processos com linha do tempo e explicação em linguagem simples. Conversa com o escritório. Baixa contrato, procuração e documentos; envia RG, comprovantes e documentos assinados. Vê o que pagou, o que vence e o que atrasou, com Pix e link de pagamento. Pede análise de novos casos por área (previdenciário, imobiliário, criminal…). Encontra o contato, o WhatsApp, o site e as redes do escritório. |
| **Equipe** (estagiários) | Painel, clientes, processos, andamentos, mensagens, documentos, financeiro e pedidos. Usa o Claude. **Não** inclui nem retira pessoas. |
| **Gestor** (um só: você) | Tudo o que a equipe faz, mais: inclui e retira estagiários, desativa e reativa o acesso de clientes, redefine senhas, vê o registro de atividades de todos (inclusive do Claude) e dispara a consulta aos tribunais. |

### Onde o Claude entra

1. **Claude no app** (menu *Claude*): você pede em português — *"quem está inadimplente
   e quanto deve?"*, *"lança no processo da Maria que a perícia foi marcada para 12/11"*,
   *"cria parcelamento de 6x de R$ 3.000 para o José, vencendo dia 10"* — e o Claude
   consulta e opera o sistema. Tudo o que ele grava fica no registro de atividades.
2. **Sugerir resposta** (tela Mensagens): o Claude redige a resposta ao cliente com base no
   processo e nas cobranças; **uma pessoa revisa e envia**. O Claude nunca manda mensagem
   sozinho.
3. **Explicar andamento** (tela do processo): o Claude traduz o andamento técnico para o
   cliente, sem promessa de resultado.
4. **Extensão MCP**: o mesmo conjunto de 14 ferramentas, dentro do Claude Desktop ou do
   Claude Code (seção 5).

### Andamento automático

Com o número CNJ cadastrado, o aplicativo consulta a **API Pública do DataJud (CNJ)** a cada
6 horas e lança sozinho os movimentos novos na linha do tempo do cliente. Funciona para
TJs estaduais (inclusive TJMS), TRFs, TRTs e STJ.

## 2. Experimentar agora (dados fictícios)

Requer **Node.js 22.5 ou mais novo** ([nodejs.org](https://nodejs.org)).

```bash
cd app
npm install
npm run demo
```

Abra `http://localhost:3000` e entre com:

| Papel | E-mail | Senha |
|---|---|---|
| Gestor | `gestor@demo.br` | `demo-gestor` |
| Estagiária | `ana@demo.br` | `demo-equipe` |
| Cliente | `maria@demo.br` | `demo-cliente` |

A demonstração usa `data/demo.db`, separado do banco real.

## 3. Colocar no ar de verdade

```bash
cd app
npm install
cp .env.example .env      # preencha GESTOR_SENHA, ANTHROPIC_API_KEY e DATAJUD_API_KEY
npm start
```

Na primeira execução o gestor é criado com os dados do `.env`. Entre, troque a senha em
*Minha conta* e apague `GESTOR_SENHA` do `.env`.

**Hospedagem** — qualquer serviço que rode Node.js com disco persistente: Railway, Render,
Fly.io ou um servidor próprio (VPS) com Caddy para o HTTPS. Exigências:

- **HTTPS obrigatório** e `NODE_ENV=production` (o cookie de sessão só trafega cifrado).
- **Disco persistente** para a pasta `data/` (banco e arquivos dos clientes).
- **Backup diário** da pasta `data/` — dado de cliente é sigilo profissional.

**Identidade do escritório** — tudo o que aparece (nome, cores, contatos, WhatsApp, site,
Instagram, Facebook, áreas de atuação, chave Pix) está em
[`config/escritorio.js`](config/escritorio.js). Preencha os links das redes sociais e a
chave Pix ali; o que ficar vazio não aparece.

## 4. Conectar o Claude ao aplicativo

1. Crie uma chave em [platform.claude.com](https://platform.claude.com) → *API Keys*.
2. Coloque em `ANTHROPIC_API_KEY=` no `.env` e reinicie.

Modelo usado: `claude-opus-5-5` (troque em `CLAUDE_MODEL` se quiser). Se o modelo recusar um
pedido por política de segurança, o próprio servidor da Anthropic tenta outro modelo
adequado antes de desistir (*fallback* automático).

## 5. Usar o escritório de dentro do Claude (extensão MCP)

A extensão roda **na máquina onde está o banco** e age em nome do gestor (ou de quem estiver
em `MCP_USUARIO_EMAIL` no `.env`).

**Claude Code:**

```bash
claude mcp add aguillera -- node /caminho/completo/para/app/mcp/server.js
```

**Claude Desktop** — em *Configurações → Desenvolvedor → Editar configuração*, acrescente:

```json
{
  "mcpServers": {
    "aguillera": {
      "command": "node",
      "args": ["/caminho/completo/para/app/mcp/server.js"]
    }
  }
}
```

Depois é só pedir: *"Claude, quais clientes mandaram mensagem e ainda não respondemos?"*

Ferramentas: painel, clientes, ficha do cliente, inadimplentes, processos, processo,
caixa de entrada, conversa, solicitações, cobranças (leitura); registrar andamento, criar
cobrança, registrar pagamento, responder solicitação (escrita, sempre auditadas).

## 6. Instalar no celular

O aplicativo é um **PWA**: no celular, abra o endereço no navegador e toque em
*Adicionar à tela de início* (iPhone: botão Compartilhar). Ele abre em tela cheia, com o
ícone do escritório, como um aplicativo. A publicação nas lojas (Google Play e App Store) é a
etapa 4 da fila de evolução.

## 7. Segurança, sigilo, LGPD e OAB

- Senhas com *scrypt*; sessão em cookie `HttpOnly`/`SameSite`; proteção contra requisição
  forjada; política de segurança de conteúdo (CSP) restrita; limite de tentativas de login.
- Cliente só enxerga o que é dele. **Notas internas** do processo nunca aparecem para ele.
- Arquivos: só PDF, imagem e Word, até 15 MB, guardados com nome aleatório e entregues
  apenas a quem tem direito.
- O consentimento LGPD fica registrado com data e hora no cadastro.
- O pedido de serviço pelo app **não** gera contratação automática: o escritório analisa e
  apresenta proposta e contrato (Provimento 205/2021 e Código de Ética).
- Todo ato relevante fica no **registro de atividades** (tela Equipe), com a marca
  *Claude* quando foi o Claude.

## 8. Os quatro agentes do projeto

Em [`.claude/agents/`](../.claude/agents/) — o Claude Code os reconhece ao abrir o repositório.

| Agente | Papel |
|---|---|
| **1 · arquiteto** | Inicia cada funcionalidade nova: onde mora, tabelas, rotas, telas, testes. Guarda a arquitetura. |
| **2 · operacao** | Coloca no ar, configura chaves, backup, acessos; opera a rotina pelo Claude. |
| **3 · evolucao** | Toca as novidades: pagamento online, assinatura eletrônica, notificações, lojas, licenciamento. |
| **4 · revisor-executor** | Analisa tudo (segurança, sigilo, ética, telas, testes), corrige e só então diz "agora está bom". |

Exemplo, no Claude Code: *"use o agente evolucao para integrar o pagamento por Pix com baixa
automática"*.

## 9. Estrutura

```
app/
├── config/escritorio.js   ← identidade do escritório (troque para licenciar)
├── server/
│   ├── index.js           início do servidor e consulta periódica aos tribunais
│   ├── app.js             rotas da API e das telas
│   ├── nucleo.js          regras do escritório — única porta para os dados
│   ├── auth.js            login, senhas, papéis
│   ├── ferramentas.js     o que o Claude pode fazer (app e MCP)
│   ├── claude.js          assistente, sugestão de resposta, explicação
│   ├── datajud.js         andamentos automáticos (CNJ)
│   ├── db.js              banco SQLite embutido
│   └── demo.js            dados de demonstração
├── mcp/server.js          extensão do Claude (MCP)
├── public/                telas (HTML, CSS e JavaScript puros), ícones, PWA
└── test/api.test.js       testes de ponta a ponta — rode com `npm test`
```

## 10. O que ainda depende de você

- [ ] Preencher Instagram, Facebook, site e chave Pix em `config/escritorio.js`
- [ ] Criar a chave do Claude e a do DataJud e colocar no `.env`
- [ ] Escolher a hospedagem e o endereço (ex.: `app.seudominio.com.br`)
- [ ] Definir a rotina de backup
- [ ] Cadastrar os dois estagiários pela tela *Equipe*
- [ ] Decidir o gateway de pagamento online e a plataforma de assinatura eletrônica
