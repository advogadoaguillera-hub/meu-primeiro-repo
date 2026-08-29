# Jocsan Aguillera — Advocacia Criminal em Drogas

Site institucional concentrado na **Lei nº 11.343/2006**. HTML, CSS e JavaScript
puros — sem framework, sem dependências externas, sem fontes remotas, sem build
obrigatório para publicar.

**Posicionamento:** advocacia criminal especializada em drogas, organizada em
dois eixos que compartilham a mesma lei e a mesma pergunta central — *qual era a
finalidade, e como ela se prova*.

| Eixo | Conteúdo |
|---|---|
| **I — Defesa em crimes de drogas** | Tráfico, transporte ("mula"), associação, organização criminosa, posse e porte, perdimento de bens |
| **II — Cannabis medicinal** | Habeas corpus para cultivo, salvo-conduto, documentação, associações de pacientes, importação |

O Direito Civil e o Processo Civil aparecem como capacidade técnica de tratar a
frente patrimonial (bens apreendidos, terceiros de boa-fé) — nunca como lista de
áreas. O Direito Médico aparece como capacidade de transformar documentação
clínica em prova.

---

## 1. Começar por aqui

Todo o essencial fica em **um único arquivo: `config.js`**.

Abra, preencha e salve. Campos deixados vazios **desaparecem automaticamente**
do site — nada quebra.

| O que atualizar | Onde |
|---|---|
| WhatsApp, e-mail, telefone, endereço, horário | `contato` |
| Número da OAB, tempo de experiência | `advogado` |
| Instituições e anos das formações | `formacao` |
| Idiomas efetivamente atendidos | `idiomas` |
| Redes sociais | `redes` |
| Fotografias | `imagens` |
| Domínio definitivo | `site.url` |
| Google Analytics / Meta Pixel | `analytics` |

> **Nunca** coloque tokens, senhas ou chaves em `config.js` — o arquivo é
> público.

---

## 2. Estrutura

```
defesa-criminal/
├── index.html                              HOME
│
│  ── EIXO I · DEFESA EM CRIMES DE DROGAS ──
├── trafico-de-drogas.html                  01 · Tráfico (art. 33) — hub
├── mula-do-trafico.html                    02 · Transporte / "mula"
├── associacao-para-o-trafico.html          03 · Associação (art. 35)
├── organizacao-criminosa.html              04 · Lei 12.850/2013
├── porte-para-consumo.html                 05 · Posse e porte (art. 28)
├── perdimento-de-bens.html                 06 · Bens e defesa patrimonial
├── defesa-criminal.html                    ·  · O processo, etapa por etapa
│
│  ── EIXO II · CANNABIS MEDICINAL ──
├── habeas-corpus.html                      07 · Habeas corpus (transversal)
├── cannabis-medicinal.html                 08 · Direito, medicina e cannabis
├── cultivo-medicinal-salvo-conduto.html    ·  · Cultivo e salvo-conduto
├── documentos-habeas-corpus-cultivo.html   ·  · Documentos para o HC
├── associacoes-e-cultivo-coletivo.html     09 · Associações de pacientes
├── importacao-sementes-e-medicamento.html  ·  · Importação
│
├── artigos/
│   ├── index.html                          Índice + pauta (29 temas)
│   ├── o-que-e-mula-no-trafico-de-drogas.html
│   ├── habeas-corpus-para-plantar-cannabis-como-funciona.html
│   ├── usuario-ou-traficante-a-linha-que-a-lei-nao-desenhou.html
│   ├── marco-regulatorio-cannabis-2026-o-que-muda.html
│   └── _modelo-artigo.html                 Modelo para novos artigos
├── videos.html                             Cards de vídeo + roteiros
├── jurisprudencia.html                     Jurisprudência em foco
├── sobre.html                              Perfil profissional
├── contato.html                            Formulário + canais
│
├── config.js                               ← ÚNICO ARQUIVO DO DIA A DIA
├── css/style.css · js/main.js
├── assets/logo/ · assets/img/
├── favicon.svg · site.webmanifest · robots.txt · sitemap.xml
│
├── _partes/                                Cabeçalho e rodapé compartilhados
└── tools/                                  montar.ps1 · remarcar.ps1 · servidor-local.ps1
```

**23 páginas publicadas** (mais o modelo de artigo, que não é indexado).

---

## 3. Publicar

O site é estático. Basta enviar a pasta.

- **Vercel / Netlify / Cloudflare Pages** — arraste a pasta ou aponte o
  repositório. Sem comando de build, sem diretório de saída.
- **GitHub Pages** — funciona em subpasta: todos os caminhos são relativos.
- **Hospedagem tradicional (FTP)** — envie o conteúdo para a raiz do domínio.

### Depois de registrar o domínio

1. `config.js` → `site.url`
2. `robots.txt` → descomente e preencha a linha `Sitemap:`
3. `sitemap.xml` → substitua `https://SEU-DOMINIO` em todas as linhas
4. Em cada `.html`, o bloco comentado no `<head>`: `canonical`, `og:url`, `og:image`

> `canonical` e `og:url` foram deixadas **comentadas** de propósito. Uma URL
> canônica errada prejudica mais que a ausência dela.

---

## 4. Manutenção do menu e do rodapé

O menu e o rodapé estão escritos por extenso em cada página — é o que garante
velocidade e indexação sem JavaScript. Para não editar 23 arquivos à mão,
existem dois scripts.

**Para alterar o menu ou o rodapé de todo o site:**

```bash
# 1. edite _partes/cabecalho.html e/ou _partes/rodape.html

# 2. reinsira os marcadores em todas as páginas
powershell -ExecutionPolicy Bypass -File tools\remarcar.ps1

# 3. expanda o conteúdo novo
powershell -ExecutionPolicy Bypass -File tools\montar.ps1
```

O `montar.ps1` também troca `{{B}}` pelo prefixo de caminho correto (`` na raiz,
`../` dentro de `artigos/`). O resultado é HTML completo — **a hospedagem nunca
precisa desses scripts**.

---

## 5. Publicar um novo artigo

1. Duplique `artigos/_modelo-artigo.html` com nome descritivo, sem acentos,
   separado por hífens — esse nome vira a URL.
2. Preencha os campos marcados com `[[ ]]`.
3. Remova a linha `<meta name="robots" content="noindex, nofollow">`.
4. Em `artigos/index.html`, transforme o cartão "Em preparação" correspondente
   em link.
5. Acrescente a `<url>` em `sitemap.xml`.

O modelo já traz schema `Article` + `FAQPage`, sumário, caixa de legislação,
citação, FAQ acessível, aviso de atualização, fontes e bio do autor.

**Regras editoriais** (comentadas dentro do modelo): nunca prometer resultado,
nunca comparar-se a outros profissionais, citar a fonte de toda afirmação
jurídica, incluir aviso de atualização em temas sujeitos a mudança.

---

## 6. Publicar um vídeo

Em `videos.html`, cada cartão já está pronto:

1. Troque `href="#"` pelo link do vídeo.
2. Substitua o bloco `<div class="card__thumb">` por uma imagem:
   `<div class="card__thumb"><img src="assets/img/thumb.webp" alt="" loading="lazy" width="640" height="360"></div>`
3. Preencha `<time datetime="AAAA-MM-DD">`.

Nenhum player é carregado automaticamente — a página permanece leve.

---

## 7. Design

**Conceito: "O Dossiê".** Arquivo, investigação, documento.

| Elemento | Decisão |
|---|---|
| Fundo | Grafite profundo `#0A0C0B` / `#101413` |
| Profundidade | Verde-espruce muito escuro `#08150F` / `#0C2018` |
| Papel | Off-white frio `#EFECE5` |
| Acento | Bronze oxidado `#A9885A` |
| Títulos | Grotesca em caixa-alta espaçada |
| Leitura | Serifa — conforto em textos longos |
| Separadores | Fios de 1px, sem sombras |
| Navegação | Índice numerado, sem ícones |

**Componente-assinatura:** a linha do tempo (`.linha`), usada para o processo
penal, o percurso do bem apreendido e o acervo documental do habeas corpus.

**Evitado por decisão de posicionamento:** algemas, caveiras, armas, martelo de
juiz, balança da justiça, grades, viaturas, folha de maconha como elemento
gráfico, vermelho de alerta. Todas as imagens conceituais são geradas em CSS.

**Responsividade:** menu compacto até 999px; barra horizontal com 8 itens a
partir de 1000px (abaixo disso os 8 itens não cabem em uma linha). Verificado em
375, 768, 900, 999, 1000, 1100, 1280 e 1600px.

---

## 8. Desempenho e acessibilidade

- **Zero requisições externas.** Nenhuma fonte remota, biblioteca ou CDN.
- **3 requisições por página**: HTML, CSS e JS.
- **Sem vídeo na primeira tela.**
- **JavaScript progressivo** — o conteúdo é legível e navegável sem ele.
- **Analytics só carrega se houver ID** em `config.js`.
- Alvos de toque ≥ 48px, foco visível, link "pular para o conteúdo",
  `prefers-reduced-motion`, contraste AA conferido, HTML semântico, acordeões
  com `aria-expanded` / `aria-controls`.

---

## 9. SEO implementado

- `title` (≤ 62 caracteres) e `meta description` (≤ 160) próprios por página
- Um `H1` por página, hierarquia consistente
- **Schema.org**: `LegalService`, `Person`, `WebSite` (home), `FAQPage` em nove
  páginas, `Article` nos quatro artigos
- Open Graph e Twitter Card
- URLs descritivas em português com termos de busca reais
  (`trafico-de-drogas`, `mula-do-trafico`, `perdimento-de-bens`,
  `documentos-habeas-corpus-cultivo`, `importacao-sementes-e-medicamento`)
- `sitemap.xml` e `robots.txt`
- Sinais locais: Corumbá — MS, 4ª Subseção Judiciária de MS (TRF3), fronteira

---

## 10. Conformidade — OAB

Conteúdo redigido sob o Código de Ética e Disciplina da OAB, o Estatuto da
Advocacia e o **Provimento nº 205/2021**.

Verificações aplicadas em todas as páginas:

- ✅ Nenhuma promessa ou garantia de resultado
- ✅ Nenhum superlativo ou comparação com outros profissionais
- ✅ Nenhum depoimento de cliente
- ✅ Nenhum caso concreto identificável; roteiros de vídeo explicitamente hipotéticos
- ✅ **Nenhuma orientação sobre como cultivar, produzir ou obter substâncias** —
  o conteúdo é exclusivamente jurídico
- ✅ Ressalva de caráter informativo no rodapé de todas as páginas

### ⚠️ Ponto que exige sua decisão: "Especialista em Direito Médico"

O site usa **"Formação em Direito Médico"**, e não "Especialista".

O Provimento 205/2021 restringe o anúncio de especialidade a quem possui título
de **pós-graduação** ou **certificação reconhecida pela OAB**. O material que
você forneceu indica um **curso** de direito médico com certificado — o que não
é automaticamente equivalente.

- Se houver pós-graduação ou certificação OAB → troque o texto em
  `config.js` → `formacao` e em `sobre.html`, e preencha instituição e ano.
- Se for curso livre → mantenha "Formação em Direito Médico" como está.

O mesmo vale para o curso de Agronomia, já descrito como "curso" e não como
graduação.

---

## 11. Conteúdo jurídico que depende de atualização

Verificado em **agosto de 2026**. Cada item traz aviso de atualização na própria
página.

| Tema | Situação registrada | Onde |
|---|---|---|
| Posse de cannabis para consumo | STF, RE 635.659 (Tema 506): não é crime; presunção de até 40 g ou 6 plantas fêmeas, **relativa** | `porte-para-consumo.html` |
| PEC 45/2023 | Aprovada no Senado (2024), pendente na Câmara | `porte-para-consumo.html` |
| Tráfico privilegiado | Súmula Vinculante 63 do STF: não é hediondo | `trafico-de-drogas.html` |
| "Mula" e o § 4º | STJ, HC 387.077/SP (2017) e AgRg no AREsp 1.052.075/SP (2017) | `mula-do-trafico.html` |
| Cadeia de custódia | STJ: quebra não gera nulidade automática | `trafico-de-drogas.html` |
| Confisco alargado | Art. 63-F da Lei 11.343, incluído pela Lei 13.886/2019 | `perdimento-de-bens.html` |
| Expropriação | Art. 243 da CF — cultivo ilegal, sem indenização | `perdimento-de-bens.html` |
| Salvo-conduto para cultivo | STJ: RHC 147.169/SP e REsp 1.972.092 (Info 742); HC 779.289/DF (Info 758) | `cultivo-medicinal-salvo-conduto.html` |
| Marco regulatório da cannabis | RDCs 1.012 a 1.015/2026 (Anvisa), publicadas 03/02/2026, vigência 04/08/2026 | `cannabis-medicinal.html` |
| Cultivo domiciliar individual | **Não** regulamentado pelas RDCs; segue na via judicial | `cultivo-medicinal-salvo-conduto.html` |
| Importação de sementes | STJ, Terceira Seção (2020): atípica em pequena quantidade | `importacao-sementes-e-medicamento.html` |

Os cartões marcados **"Espaço editável"** em `jurisprudencia.html` estão vazios
de propósito: preencha apenas com decisões conferidas na fonte oficial, com
número do processo, relator, órgão julgador, data e link.

---

## 12. Campos que dependem de informação a fornecer

| Campo | Onde | Situação |
|---|---|---|
| Instituição e ano das pós-graduações | `config.js` → `formacao` | vazio |
| Instituição e ano da formação em Direito Médico | `config.js` → `formacao` | vazio |
| Instituição e ano do curso de Agronomia | `config.js` → `formacao` | vazio |
| Endereço, CEP, complemento | `config.js` → `contato` | vazio |
| Telefone fixo | `config.js` → `contato.telefoneFixo` | vazio |
| Horário de atendimento | `config.js` → `contato.horarioAtendimento` | vazio |
| Disponibilidade para urgências | `config.js` → `contato.urgencia` | vazio |
| Redes sociais | `config.js` → `redes` | vazio |
| Retrato, foto do escritório, imagem de compartilhamento | `config.js` → `imagens` | placeholder |
| Domínio | `config.js` → `site.url` | vazio |
| Certificados e currículo completo | `sobre.html` | espaço reservado |

Preenchidos a partir do material fornecido: **nome**, **OAB/MS nº 18.115**,
**WhatsApp**, **e-mail**, **Corumbá — MS**, **pós-graduação em Direito Civil e
Processo Civil**, **~12 anos**, **idiomas**, **logotipo**.

Nada além disso foi inventado.

---

## 13. Formulário

Em `config.js` → `formulario.destino`:

- `'whatsapp'` *(padrão)* — monta a mensagem e abre o WhatsApp. Sem servidor.
- `'email'` — abre o programa de e-mail do visitante.
- `'endpoint'` — envia para serviço externo (Formspree, Basin). Preencha
  `formulario.endpoint`.

As opções de situação estão agrupadas em **Defesa em crimes de drogas** e
**Cannabis medicinal**. O formulário orienta expressamente a **não** enviar
dados sensíveis na primeira etapa.

---

## 14. Desenvolvimento local

```bash
powershell -ExecutionPolicy Bypass -File tools\servidor-local.ps1
```

Depois acesse `http://localhost:8099/`. Encerre com `Ctrl + C`.

O site também abre direto pelo `index.html`, mas o servidor local reproduz o
comportamento real de caminhos, manifest e favicon.
