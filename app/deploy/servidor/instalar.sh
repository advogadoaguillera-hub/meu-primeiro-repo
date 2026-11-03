#!/usr/bin/env bash
# =============================================================================
# Instalação do sistema Aguillera num servidor Linux (Debian 12 ou Ubuntu 24).
# Feito para o servidor gratuito do Google Cloud (e2-micro), mas serve em
# qualquer servidor com Debian/Ubuntu.
#
# Uso, no terminal do servidor (botão "SSH" no Google Cloud):
#   curl -fsSL https://raw.githubusercontent.com/advogadoaguillera-hub/meu-primeiro-repo/main/app/deploy/servidor/instalar.sh | sudo bash
#
# Pode rodar de novo quantas vezes quiser: ele atualiza sem apagar dados.
# =============================================================================
set -euo pipefail

DOMINIO="${DOMINIO:-area.aguillera.art.br}"
REPO="${REPO:-https://github.com/advogadoaguillera-hub/meu-primeiro-repo.git}"
RAMO="${RAMO:-main}"
PASTA=/opt/aguillera
DADOS=/var/lib/aguillera
USUARIO=aguillera

passo() { printf '\n\033[1;33m▶ %s\033[0m\n' "$*"; }
[ "$(id -u)" = 0 ] || { echo "Rode com sudo."; exit 1; }

# -----------------------------------------------------------------------------
passo "1/8 Memória extra (o servidor gratuito tem só 1 GB)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q /swapfile /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# -----------------------------------------------------------------------------
passo "2/8 Programas do sistema e atualizações de segurança automáticas"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git ca-certificates gnupg sqlite3 unattended-upgrades debian-keyring debian-archive-keyring apt-transport-https >/dev/null
dpkg-reconfigure -f noninteractive unattended-upgrades
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF

# -----------------------------------------------------------------------------
passo "3/8 Node.js 22"
if ! node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=5)?0:1)' 2>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
node --version

# -----------------------------------------------------------------------------
passo "4/8 Caddy (cadeado HTTPS automático)"
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq && apt-get install -y -qq caddy >/dev/null
fi

# -----------------------------------------------------------------------------
passo "5/8 Código do sistema"
id "$USUARIO" >/dev/null 2>&1 || useradd --system --home "$PASTA" --shell /usr/sbin/nologin "$USUARIO"
mkdir -p "$DADOS/arquivos" "$DADOS/backups"
if [ -d "$PASTA/.git" ]; then
  git -C "$PASTA" fetch -q --depth 1 origin "$RAMO" && git -C "$PASTA" reset -q --hard "origin/$RAMO"
else
  git clone -q --depth 1 --branch "$RAMO" "$REPO" "$PASTA"
fi
cd "$PASTA/app" && npm ci --omit=dev --no-audit --no-fund --loglevel=error

# -----------------------------------------------------------------------------
passo "6/8 Configuração (.env)"
ENV="$PASTA/app/.env"
SENHA_NOVA=""
if [ ! -f "$DADOS/.env" ]; then
  SENHA_NOVA="$(tr -dc 'abcdefghjkmnpqrstuvwxyz23456789' </dev/urandom | head -c 14)"
  cat > "$DADOS/.env" <<EOF
PORT=3000
NODE_ENV=production
TRUST_PROXY=1
DB_PATH=$DADOS/aguillera.db
UPLOADS_DIR=$DADOS/arquivos
GESTOR_NOME=Jocsan Aguillera
GESTOR_EMAIL=advogadoaguillera@gmail.com
GESTOR_SENHA=$SENHA_NOVA
# Preencha depois (veja o GUIA) e rode: sudo systemctl restart aguillera
ANTHROPIC_API_KEY=
DATAJUD_API_KEY=
DATAJUD_INTERVALO_HORAS=6
EOF
fi
# O .env mora junto dos dados (fora do código), e o app o lê por um atalho.
ln -sf "$DADOS/.env" "$ENV"
chown -R "$USUARIO:$USUARIO" "$DADOS" "$PASTA"
chmod 600 "$DADOS/.env"

# -----------------------------------------------------------------------------
passo "7/8 Serviço que mantém o sistema ligado e o endereço $DOMINIO"
cat > /etc/systemd/system/aguillera.service <<EOF
[Unit]
Description=Sistema do escritório Aguillera
After=network-online.target
Wants=network-online.target

[Service]
User=$USUARIO
WorkingDirectory=$PASTA/app
ExecStart=/usr/bin/node --no-warnings server/index.js
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=$DADOS

[Install]
WantedBy=multi-user.target
EOF
cat > /etc/caddy/Caddyfile <<EOF
$DOMINIO {
  encode gzip
  request_body {
    max_size 20MB
  }
  reverse_proxy 127.0.0.1:3000
}
EOF
systemctl daemon-reload
systemctl enable --now aguillera >/dev/null
systemctl restart aguillera caddy

# Atalho para atualizar o sistema depois: sudo aguillera-atualizar
cat > /usr/local/bin/aguillera-atualizar <<EOF
#!/usr/bin/env bash
set -e
curl -fsSL https://raw.githubusercontent.com/advogadoaguillera-hub/meu-primeiro-repo/$RAMO/app/deploy/servidor/instalar.sh | bash
EOF
chmod +x /usr/local/bin/aguillera-atualizar

# -----------------------------------------------------------------------------
passo "8/8 Cópia de segurança diária (3h da manhã)"
cat > /usr/local/bin/aguillera-backup <<'EOF'
#!/usr/bin/env bash
# Copia o banco e os arquivos dos clientes. Guarda 14 dias no servidor e,
# se houver um "balde" do Google Cloud Storage configurado, envia para lá também.
set -euo pipefail
DADOS=/var/lib/aguillera
DIA=$(date +%F)
TMP=$(mktemp -d)
sqlite3 "$DADOS/aguillera.db" ".backup '$TMP/aguillera.db'"
tar -czf "$DADOS/backups/aguillera-$DIA.tar.gz" -C "$TMP" aguillera.db -C "$DADOS" arquivos .env
rm -rf "$TMP"
find "$DADOS/backups" -name 'aguillera-*.tar.gz' -mtime +14 -delete
BALDE=$(cat "$DADOS/balde-backup" 2>/dev/null || true)
if [ -n "$BALDE" ] && command -v gcloud >/dev/null; then
  gcloud storage cp -q "$DADOS/backups/aguillera-$DIA.tar.gz" "gs://$BALDE/" && echo "Backup enviado para gs://$BALDE"
fi
EOF
chmod +x /usr/local/bin/aguillera-backup
echo '0 3 * * * root /usr/local/bin/aguillera-backup >> /var/log/aguillera-backup.log 2>&1' > /etc/cron.d/aguillera-backup

# No Google Cloud, cria o balde de backup (5 GB grátis nas regiões dos EUA).
if [ ! -f "$DADOS/balde-backup" ] && command -v gcloud >/dev/null; then
  PROJETO=$(curl -fs -H 'Metadata-Flavor: Google' http://metadata.google.internal/computeMetadata/v1/project/project-id || true)
  if [ -n "$PROJETO" ]; then
    BALDE="aguillera-backup-$PROJETO"
    if gcloud storage buckets create "gs://$BALDE" --location=us-central1 --default-storage-class=STANDARD -q 2>/dev/null \
       || gcloud storage ls "gs://$BALDE" >/dev/null 2>&1; then
      echo "$BALDE" > "$DADOS/balde-backup"
      echo "Balde de backup: gs://$BALDE"
    else
      echo "Não consegui criar o balde de backup (o servidor precisa de 'Permitir acesso total a todas as APIs'). O backup local continua funcionando."
    fi
  fi
fi

# -----------------------------------------------------------------------------
sleep 2
if curl -fs http://127.0.0.1:3000/api/marca >/dev/null; then
  # O gestor já foi criado: a senha inicial não precisa ficar guardada no arquivo.
  sed -i 's/^GESTOR_SENHA=.*/GESTOR_SENHA=/' "$DADOS/.env"
  printf '\n\033[1;32m✔ Sistema instalado e funcionando.\033[0m\n'
else
  printf '\n\033[1;31m✘ O sistema não respondeu. Veja: sudo journalctl -u aguillera -n 50\033[0m\n'
fi
IP=$(curl -fs -4 https://api.ipify.org || echo "?")
cat <<EOF

  Endereço:        https://$DOMINIO
  IP do servidor:  $IP   ← use no registro.br (registro A "area")
EOF
if [ -n "$SENHA_NOVA" ]; then
cat <<EOF

  Seu acesso de gestor:
    E-mail: advogadoaguillera@gmail.com
    Senha:  $SENHA_NOVA     ← anote e troque no primeiro acesso

EOF
fi
