# Fotografias do site

O site funciona hoje **sem nenhuma fotografia** — a primeira tela usa uma
ilustração vetorial do Pantanal, criada para este projeto, que pesa poucos
kilobytes e é nítida em qualquer tela. Nenhuma imagem de banco de imagens foi
utilizada.

Quando houver fotografia própria ou devidamente licenciada, coloque os arquivos
aqui com os nomes abaixo.

## Arquivos previstos

| Arquivo | Onde aparece | Dimensão sugerida |
|---|---|---|
| `hero-pantanal.webp` | Primeira tela, ao fundo | 2400 × 1350 px |
| `jocsan-aguillera.webp` | Seção "Sobre" | 960 × 1200 px (retrato) |
| `og-capa.png` | Miniatura ao compartilhar em redes e WhatsApp | 1200 × 630 px |

## Como ativar a fotografia da primeira tela

1. Salve o arquivo como `assets/img/hero-pantanal.webp`.
2. Em `css/style.css`, acrescente ao final:

```css
.hero__cenario { display: none; }
.hero {
  background-image: url('../assets/img/hero-pantanal.webp');
  background-size: cover;
  background-position: center;
}
```

O véu escuro sobre a imagem (`.hero::after`) já existe e continua garantindo a
legibilidade do texto.

## Como ativar o retrato na seção "Sobre"

Em `index.html`, localize o comentário `ESPAÇO PARA FOTOGRAFIA PROFISSIONAL` e
troque o bloco `<div class="retrato-vazio">` por:

```html
<img src="assets/img/jocsan-aguillera.webp"
     alt="Jocsan Aguillera, advogado"
     width="480" height="600" loading="lazy" decoding="async">
```

## Orientação visual

**Priorizar:** Pantanal, fazendas, gado, cercas, estradas rurais, mapas e
topografia, documentos e matrículas, detalhes arquitetônicos de propriedades,
escritório sóbrio.

**Evitar:** martelo de juiz, estátua ou balança da Justiça como elemento
principal, aperto de mãos, pilha de códigos, tribunal genérico.

A identidade é territorial — a terra é a protagonista, não o advogado.

## Antes de publicar qualquer imagem

- Converta para **WebP** ou **AVIF** (peso muito menor que JPG/PNG).
- Mantenha cada arquivo abaixo de ~250 KB.
- Confirme que você tem direito de uso da fotografia.
- Preencha sempre o atributo `alt` descrevendo a cena.
