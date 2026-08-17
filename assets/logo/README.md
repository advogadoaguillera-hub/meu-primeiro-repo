# Arquivos de logotipo

## O que já está aqui

| Arquivo | Uso atual |
|---|---|
| `logo-jocsan-aguillera.png` | Rodapé do site (sobre plaqueta clara) |

## O que ainda pode ser adicionado

Coloque os arquivos nesta pasta com **exatamente** estes nomes — o site passa a
usá-los sem necessidade de mexer no código, exceto onde indicado.

| Arquivo | Para que serve | Formato ideal |
|---|---|---|
| `logo-claro.svg` | Cabeçalho, sobre o fundo verde escuro | SVG com traço em dourado e texto em off-white |
| `logo-escuro.svg` | Documentos e fundos claros | SVG, texto em verde/grafite |
| `icone-192.png` | Ícone do app (Android / atalho) | PNG 192×192, fundo verde `#06281F` |
| `icone-512.png` | Ícone do app em alta resolução | PNG 512×512, fundo verde `#06281F` |
| `apple-touch-icon.png` | Ícone no iPhone/iPad | PNG 180×180, sem transparência |

## Como trocar o logo do cabeçalho

Hoje o cabeçalho usa uma reconstrução em vetor + texto, para carregar
instantaneamente. Assim que houver um `logo-claro.svg`, abra `index.html`,
localize o comentário `<!-- LOGO` e substitua o bloco `<a class="marca">` por:

```html
<a class="marca" href="#topo">
  <img src="assets/logo/logo-claro.svg"
       alt="Jocsan Aguillera — Advocacia da Terra"
       width="210" height="48">
</a>
```

Faça a mesma substituição em `conteudo/index.html` e em
`conteudo/_modelo-artigo.html` (ajustando o caminho para `../assets/...`).

## Observação sobre contraste

O logotipo original tem o texto em azul-grafite escuro, que não tem contraste
suficiente sobre o verde `#06281F` do cabeçalho. Por isso é necessária uma
versão clara — não basta reaproveitar o arquivo existente.
