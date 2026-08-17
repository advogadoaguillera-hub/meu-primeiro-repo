# Advocacia da Terra — Jocsan Aguillera

Site institucional de **Jocsan Aguillera** (OAB/MS nº 18.115), com atuação em
direito imobiliário, fundiário e patrimonial em Corumbá, no Pantanal e em Mato
Grosso do Sul.

Site estático em HTML, CSS e JavaScript — **sem framework, sem build, sem
servidor**. Abre direto no navegador e publica em qualquer hospedagem.

---

## 1. O essencial em um minuto

Quase tudo o que você vai querer mudar está em **um único arquivo**:
[`config.js`](config.js).

Telefone, e-mail, endereço, horário, Instagram, LinkedIn, domínio e códigos de
analytics ficam todos lá. **Campos deixados em branco somem automaticamente do
site** — não é preciso mexer no HTML para esconder o que ainda não existe.

```js
contato: {
  whatsapp: '5567998325997',          // 55 + DDD + número, só dígitos
  whatsappExibicao: '(67) 99832-5997',
  email: 'advogadoaguillera@gmail.com',

  telefoneFixo: '',   // preencha e aparece sozinho
  endereco: '',       // idem
  horarioAtendimento: '',
},

redes: {
  instagram: '',      // ex.: 'https://instagram.com/seuperfil'
  linkedin: '',
},
```

Salvou o arquivo? Recarregue a página. Pronto.

---

## 2. Como ver o site no seu computador

Basta **abrir o arquivo `index.html`** com um duplo clique. Tudo funciona,
exceto os endereços de pasta como `/conteudo/` — que só funcionam com um
servidor.

Para ver o site exatamente como ficará publicado, rode um servidor local. Se
tiver Python instalado:

```bash
python -m http.server 8080
```

Depois acesse `http://localhost:8080`.

Com Node.js instalado, uma alternativa:

```bash
npx serve .
```

---

## 3. Como publicar

O site é estático, então funciona em qualquer hospedagem. Nenhuma opção abaixo
exige backend, banco de dados ou etapa de compilação.

### Opção A — Netlify ou Vercel (mais simples)

1. Acesse [netlify.com](https://www.netlify.com) ou [vercel.com](https://vercel.com) e crie uma conta.
2. Conecte o repositório do GitHub.
3. Na configuração do projeto:
   - **Build command:** deixe em branco
   - **Publish directory:** `.` (a raiz)
4. Publique.

### Opção B — GitHub Pages (gratuito, direto do repositório)

1. No repositório do GitHub, vá em **Settings → Pages**.
2. Em *Source*, escolha a branch `main` e a pasta `/ (root)`.
3. Salve. O endereço aparece na própria página em cerca de um minuto.

### Opção C — Cloudflare Pages

Conecte o repositório, deixe o *build command* vazio e informe `.` como diretório
de saída.

### Opção D — Hospedagem tradicional (cPanel, FTP)

Envie **todos os arquivos e pastas** deste projeto para a pasta pública do
servidor (normalmente `public_html`).

### Depois de publicar — 3 ajustes

1. Em `config.js`, preencha `site.url` com o endereço definitivo.
2. Em `robots.txt`, descomente a linha `Sitemap:` e troque pelo domínio real.
3. Em `sitemap.xml`, substitua `https://SEU-DOMINIO.com.br` pelo domínio real.

---

## 4. Estrutura dos arquivos

```
.
├── index.html              Página principal (todas as seções)
├── config.js               ← EDITE AQUI: contato, redes, domínio, analytics
├── favicon.svg             Ícone da aba do navegador
├── site.webmanifest        Dados do site para instalação como app
├── robots.txt              Instruções para buscadores
├── sitemap.xml             Mapa do site para buscadores
│
├── css/
│   └── style.css           Todo o estilo visual
│
├── js/
│   └── main.js             Menu, formulário e aplicação do config.js
│
├── conteudo/
│   ├── index.html          Índice de publicações
│   └── _modelo-artigo.html Modelo para criar novos artigos
│
└── assets/
    ├── logo/               Logotipos (ver README interno)
    └── img/                Fotografias (ver README interno)
```

---

## 5. Como o formulário funciona

Por padrão, o formulário **monta uma mensagem organizada e abre o WhatsApp** com
tudo preenchido. Não exige servidor nem serviço pago.

Para mudar isso, edite `formulario.destino` em `config.js`:

| Valor | O que acontece |
|---|---|
| `'whatsapp'` | *(padrão)* Abre o WhatsApp com a mensagem pronta |
| `'email'` | Abre o programa de e-mail do visitante |
| `'endpoint'` | Envia para um serviço externo (exige preencher `formulario.endpoint`) |

Para receber os contatos por e-mail automaticamente, crie um formulário gratuito
no [Formspree](https://formspree.io) ou no [Basin](https://usebasin.com), cole o
endereço em `formulario.endpoint` e troque `destino` para `'endpoint'`.

---

## 6. Como publicar um artigo

1. Copie `conteudo/_modelo-artigo.html`.
2. Renomeie com o endereço desejado, em minúsculas e com hífens.
   Ex.: `como-funciona-a-auditoria-dominial.html`
3. Substitua tudo o que estiver marcado com `[SUBSTITUIR]`.
4. Acrescente o link do novo artigo em `conteudo/index.html`.
5. Acrescente o endereço em `sitemap.xml`.

---

## 7. Desempenho

O site foi construído para carregar rápido, e não apenas para parecer rápido:

- **4 arquivos** carregados na primeira visita (HTML, CSS, config, JS)
- **Nenhuma fonte externa** — usa as fontes já instaladas no aparelho, o que
  elimina o atraso de carregamento e o "pulo" do texto
- **Nenhuma biblioteca** — sem jQuery, sem Bootstrap, sem framework
- **Nenhuma fotografia na primeira tela** — a paisagem do Pantanal é um desenho
  vetorial de poucos kilobytes
- **Scripts de terceiros só carregam se você configurar** — sem ID de analytics
  preenchido, nada externo é chamado e nenhum cookie é instalado

---

## 8. Verificações já realizadas

| Item | Resultado |
|---|---|
| Erros no console | Nenhum |
| Links internos quebrados | Nenhum |
| Rolagem horizontal indevida | Nenhuma |
| Contraste de texto (WCAG AA) | Todos os itens aprovados |
| Estrutura de títulos | Um `<h1>`, hierarquia sem saltos |
| Textos alternativos em imagens | Todos preenchidos |
| Menu no celular | Abre, fecha e responde ao teclado |
| Formulário | Valida campos e monta a mensagem corretamente |
| Layout | Testado em celular, tablet e desktop |

---

## 9. Conformidade com as regras da OAB

A comunicação do site foi redigida em tom informativo e institucional,
observando o Provimento 205/2021 e o Código de Ética e Disciplina da OAB:

- Sem promessa ou garantia de resultado
- Sem menção a valores de honorários
- Sem comparação com outros profissionais
- Sem nome, caso ou depoimento de cliente
- Chamadas voltadas a **contato e análise**, nunca a "resolver" ou "ganhar"

Ao acrescentar conteúdo novo, mantenha esse padrão.

---

## 10. O que ainda depende de você

- [ ] Fotografia profissional para a seção "Sobre"
- [ ] Texto de formação, especializações e experiência (seção "Sobre")
- [ ] Versão clara do logotipo para o cabeçalho — ver [`assets/logo/README.md`](assets/logo/README.md)
- [ ] Fotografia do Pantanal para a primeira tela *(opcional)* — ver [`assets/img/README.md`](assets/img/README.md)
- [ ] Endereço, telefone fixo e horário, se houver — em `config.js`
- [ ] Instagram e LinkedIn, quando existirem — em `config.js`
- [ ] Registro do domínio definitivo
- [ ] Redação dos artigos da seção "Conteúdo"

---

## 11. Base estratégica

O posicionamento, a arquitetura das seções e os dados territoriais têm origem no
*Relatório Estratégico de Mercado — A Advocacia da Terra* (Corumbá/MS, agosto de
2026), que apurou, a partir de fontes públicas (IBGE, INCRA, Embrapa Pantanal),
a concentração de valor em ativos fundiários na região e a ausência de oferta
jurídica especializada e dedicada ao tema no mercado local.

Nenhum dado, número ou afirmação foi inventado: o que não estava documentado
ficou como campo a preencher.
