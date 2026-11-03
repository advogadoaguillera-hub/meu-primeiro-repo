# Pôr o sistema no Cloudflare

São duas etapas:

1. **Versão de teste**, num endereço próprio (`aguillera-teste.<sua-conta>.workers.dev`),
   já com clientes, processos e cobranças fictícios. Você e os estagiários testam tudo
   **sem mexer no seu domínio**.
2. **Versão oficial** em `area.aguillera.art.br`, só depois da sua aprovação.

Depois de configurado, **o GitHub publica sozinho**. Toda mudança aprovada vai para a
versão de teste. A oficial só vai quando você mandar.

> **Custo.** Para testar, o plano gratuito pode bastar. Se o login começar a falhar com o
> erro **1102** ("Worker exceeded resource limits"), é o limite de processamento do plano
> gratuito: assine o **Workers Paid (US$ 5/mês)**. Para a versão oficial, com clientes de
> verdade, recomendo o plano pago desde o início.

Tempo total: cerca de 20 minutos. Todos os passos são no navegador.

---

## Passo 1 — Conta no Cloudflare

1. Crie a conta em **https://dash.cloudflare.com/sign-up** (pode usar o e-mail do escritório).
2. No menu da esquerda, abra **Workers & Pages** uma vez. Ele pede para escolher o seu
   subdomínio `workers.dev` (ex.: `aguillera`). Escolha e confirme.
3. Na mesma tela, à direita, copie o **Account ID** (o número da conta). Guarde.

## Passo 2 — Chave para o GitHub publicar

1. Canto superior direito → ícone de perfil → **My Profile** → **API Tokens** →
   **Create Token**.
2. No modelo **Edit Cloudflare Workers**, clique em **Use template**.
3. Em *Permissions*, clique em **+ Add more** e acrescente: **Account → D1 → Edit**.
4. Em *Account Resources*, escolha a sua conta. **Continue to summary** → **Create Token**.
5. Copie o token. Ele aparece uma vez só.

## Passo 3 — Guardar as chaves no GitHub

Repositório **meu-primeiro-repo** → **Settings** → **Secrets and variables** → **Actions** →
**New repository secret**. Crie um por um:

| Nome | Valor |
|---|---|
| `CLOUDFLARE_API_TOKEN` | o token do Passo 2 |
| `CLOUDFLARE_ACCOUNT_ID` | o Account ID do Passo 1 |
| `GESTOR_EMAIL` | `advogadoaguillera@gmail.com` |
| `GESTOR_SENHA` | uma senha forte, só sua (troque no primeiro acesso) |
| `ANTHROPIC_API_KEY` | *opcional*: liga o botão "Claude" do painel |
| `DATAJUD_API_KEY` | *opcional*: andamentos automáticos ([chave pública do CNJ](https://datajud-wiki.cnj.jus.br/api-publica/acesso)) |

As chaves ficam guardadas no GitHub e no Cloudflare, nunca no código.

## Passo 4 — Publicar a versão de teste

Aprove e una o pull request do sistema:
https://github.com/advogadoaguillera-hub/meu-primeiro-repo/pull/5
→ **Ready for review** → **Merge pull request**.

O GitHub roda os testes e publica sozinho. Acompanhe em **Actions → Publicar no Cloudflare**
(2 a 3 minutos, ícone verde no fim). Para publicar de novo a qualquer hora: **Actions →
Publicar no Cloudflare → Run workflow → teste**.

## Passo 5 — Testar

Abra **https://aguillera-teste.SEU-SUBDOMINIO.workers.dev** e entre com:

| Quem | E-mail | Senha |
|---|---|---|
| Você (gestor) | o `GESTOR_EMAIL` | a `GESTOR_SENHA` |
| Estagiária fictícia | `ana@demo.br` | `demo-equipe` |
| Cliente fictícia | `maria@demo.br` | `demo-cliente` |

Teste no computador e no celular. Tudo o que quiser mudar, me diga: eu altero, o GitHub
publica de novo no teste, e você confere.

## Passo 6 — Versão oficial em area.aguillera.art.br (depois da aprovação)

1. **Levar o DNS do domínio para o Cloudflare** (o domínio continua seu e registrado no
   registro.br):
   - Cloudflare → **Add a domain** → `aguillera.art.br` → plano **Free**.
   - Ele copia os registros atuais. **Confira** se vieram os do site (4 registros **A**
     `185.199.10x.153` e o **CNAME** `www`) e os do **e-mail da Zoho** (**MX**, **TXT/SPF** e
     outros que existirem). Se faltar algum, compare com o registro.br e acrescente.
   - O Cloudflare mostra **dois nameservers**. No **registro.br** → domínio → **DNS** →
     **Alterar servidores DNS**, troque pelos dois do Cloudflare.
   - Espere o Cloudflare avisar que o domínio está **Active** (minutos a algumas horas).
2. Me avise. Eu ativo o endereço `area.aguillera.art.br` na configuração e o GitHub publica.
3. **Actions → Publicar no Cloudflare → Run workflow → producao.**
4. Una o pull request do site (botão "Área do Cliente"):
   https://github.com/advogadoaguillera-hub/aguillera-art/pull/1

A versão oficial começa **vazia**: sem dados fictícios, só o seu acesso de gestor.

## Passo 7 — Gerenciar pelo seu Claude (sem custo extra)

No sistema: **Minha conta → Chaves do Claude → Nova chave**. Depois siga a seção
"Usar o escritório de dentro do Claude" do [README](../../README.md).

---

## Dia a dia

- **Mudanças:** você me pede, eu altero, aprovo com você e o GitHub publica.
- **Backup:** o banco D1 guarda o histórico dos últimos dias e permite voltar no tempo
  ("Time Travel"). Os documentos ficam no R2.
- **Tribunais:** consulta automática a cada 6 horas, se houver `DATAJUD_API_KEY`.
- **Ver o que aconteceu:** Cloudflare → Workers & Pages → `aguillera` → **Logs**.
