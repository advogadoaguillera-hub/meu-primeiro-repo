#!/usr/bin/env bash
# Publica o sistema no Cloudflare. Rodado pelo GitHub (.github/workflows/cloudflare.yml).
#   ./publicar.sh teste      → https://aguillera-teste.<conta>.workers.dev (dados fictícios)
#   ./publicar.sh producao   → versão oficial
# Precisa de CLOUDFLARE_API_TOKEN e CLOUDFLARE_ACCOUNT_ID no ambiente.
# Cria sozinho, na primeira vez, o banco (D1) e o depósito de arquivos (R2).
set -euo pipefail

AMBIENTE="${1:-teste}"
cd "$(dirname "$0")/../.."   # pasta app/
export WRANGLER_SEND_METRICS=false CI=1

# Enquanto as chaves do Cloudflare não estiverem no GitHub, não há o que publicar.
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ] || [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
  echo "Cloudflare ainda não configurado no GitHub (CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID): nada publicado."
  exit 0
fi

if [ "$AMBIENTE" = producao ]; then
  BANCO=aguillera; BALDE=aguillera-arquivos; MARCA=ID_PRODUCAO; ENV_ARGS=()
elif [ "$AMBIENTE" = teste ]; then
  BANCO=aguillera-teste; BALDE=aguillera-teste-arquivos; MARCA=ID_TESTE; ENV_ARGS=(--env teste)
else
  echo "Use: publicar.sh teste | producao"; exit 1
fi

idDoBanco() {
  npx wrangler d1 list --json | node -e '
    let t = ""; process.stdin.on("data", (d) => (t += d)).on("end", () => {
      const b = JSON.parse(t).find((x) => x.name === process.argv[1]);
      process.stdout.write(b ? (b.uuid || b.id || "") : "");
    });' "$BANCO"
}

echo "▶ Banco de dados ($BANCO)"
ID="$(idDoBanco)"
if [ -z "$ID" ]; then
  npx wrangler d1 create "$BANCO" >/dev/null
  ID="$(idDoBanco)"
fi
[ -n "$ID" ] || { echo "Não consegui criar nem achar o banco $BANCO."; exit 1; }
sed -i "s/\"$MARCA\"/\"$ID\"/" wrangler.jsonc

echo "▶ Depósito de arquivos ($BALDE)"
npx wrangler r2 bucket create "$BALDE" >/dev/null 2>&1 && echo "  criado" || echo "  já existe"

echo "▶ Publicando"
npx wrangler deploy "${ENV_ARGS[@]}"

# Segredos (só os que estiverem preenchidos no GitHub). Ficam guardados no Cloudflare,
# nunca no código.
echo "▶ Segredos"
# Arquivo temporário só legível por este usuário e apagado mesmo se algo falhar.
SEGREDOS="$(umask 077; mktemp)"
trap 'rm -f "$SEGREDOS"' EXIT
node -e '
  const nomes = ["GESTOR_NOME", "GESTOR_EMAIL", "GESTOR_SENHA", "ANTHROPIC_API_KEY", "DATAJUD_API_KEY"];
  const s = Object.fromEntries(nomes.filter((n) => process.env[n]).map((n) => [n, process.env[n]]));
  require("fs").writeFileSync(process.argv[1], JSON.stringify(s));
  console.log("  " + (Object.keys(s).join(", ") || "nenhum"));' "$SEGREDOS"
if [ "$(cat "$SEGREDOS")" != "{}" ]; then
  npx wrangler secret bulk "$SEGREDOS" "${ENV_ARGS[@]}"
fi
echo "✔ Publicado ($AMBIENTE)."
