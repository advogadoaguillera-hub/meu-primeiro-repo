# Pôr o sistema no ar no Google Cloud

Tempo: cerca de 30 minutos. Você precisa do computador ou do celular com o
navegador, da conta Google e de um cartão (para verificação).

> **Quanto custa, sem rodeios.** O servidor e2-micro é gratuito nas regiões dos
> EUA. Desde 2024, porém, o Google cobra **cerca de US$ 3,65 por mês** pelo
> endereço de internet (IPv4) de qualquer servidor, inclusive o gratuito. Contas
> novas costumam ganhar **US$ 300 de crédito por 90 dias**, que cobrem esse
> valor durante o teste. Confira em *Faturamento* depois do primeiro dia.

---

## Passo 0 — Aprovar o sistema no GitHub (1 clique)

O instalador baixa o sistema da versão principal do repositório. Antes,
aprove e una o pull request #5:
https://github.com/advogadoaguillera-hub/meu-primeiro-repo/pull/5
→ **Ready for review** → **Merge pull request**.

## Passo 1 — Conta e projeto

1. Acesse **https://console.cloud.google.com** com sua conta Google.
2. Aceite os termos e ative a avaliação gratuita (pede o cartão; não cobra sem
   você autorizar a passar do crédito).
3. No topo, crie um projeto chamado **aguillera**.

## Passo 2 — Criar o servidor

Menu ☰ → **Compute Engine** → **Instâncias de VM** → **Criar instância**
(se pedir para ativar a API do Compute Engine, ative e espere um minuto).

| Campo | O que escolher |
|---|---|
| Nome | `aguillera` |
| Região | **us-central1 (Iowa)** — precisa ser us-central1, us-east1 ou us-west1 para ser gratuito |
| Tipo de máquina | Série **E2** → **e2-micro** |
| Disco de inicialização → Alterar | **Debian GNU/Linux 12**, tipo **Disco permanente padrão** (*Standard persistent disk*), **30 GB**. ⚠️ O padrão "equilibrado" é cobrado: troque para **padrão**. |
| Identidade e acesso à API → Escopos | **Permitir acesso total a todas as APIs do Cloud** (para o backup automático) |
| Firewall | Marque **Permitir tráfego HTTP** e **Permitir tráfego HTTPS** |

Clique em **Criar**.

## Passo 3 — Fixar o endereço do servidor

Sem isso, o endereço muda quando o servidor reinicia e o site para.

Menu ☰ → **Rede VPC** → **Endereços IP** → na linha do servidor `aguillera`,
**⋮** → **Promover para endereço IP estático** → nome `aguillera`.
Anote o número (ex.: `34.123.45.67`).

## Passo 4 — Apontar area.aguillera.art.br para o servidor

No **registro.br** → `aguillera.art.br` → **DNS** → **Editar zona** →
**Nova entrada**:

| Tipo | Nome | Valor |
|---|---|---|
| A | area | o número do Passo 3 |

**Não apague** os registros que já estão lá (site e e-mail da Zoho). Salve.

## Passo 5 — Instalar (um comando)

Volte em **Instâncias de VM** e clique em **SSH** na linha do servidor. Abre
um terminal no navegador. Cole e tecle Enter:

```bash
curl -fsSL https://raw.githubusercontent.com/advogadoaguillera-hub/meu-primeiro-repo/main/app/deploy/servidor/instalar.sh | sudo bash
```

Leva uns 5 minutos. No fim aparece:

```
✔ Sistema instalado e funcionando.
  Seu acesso de gestor:
    E-mail: advogadoaguillera@gmail.com
    Senha:  xxxxxxxxxxxxxx   ← anote e troque no primeiro acesso
```

**Anote a senha.** Ela aparece uma única vez.

## Passo 6 — Entrar

Abra **https://area.aguillera.art.br** (se o registro.br ainda não propagou,
espere de 10 minutos a algumas horas). Entre, vá em **Minha conta** e troque
a senha. Depois, em **Equipe**, cadastre os estagiários.

## Passo 7 — Ligar o Claude e os tribunais (quando quiser)

No terminal SSH:

```bash
sudo nano /var/lib/aguillera/.env
```

Preencha `ANTHROPIC_API_KEY=` (chave em platform.claude.com) e
`DATAJUD_API_KEY=` (chave pública em
https://datajud-wiki.cnj.jus.br/api-publica/acesso). Salve com **Ctrl+O**,
**Enter**, **Ctrl+X** e rode:

```bash
sudo systemctl restart aguillera
```

---

## Dia a dia

| Para… | Comando no SSH |
|---|---|
| Atualizar o sistema para a versão mais nova | `sudo aguillera-atualizar` |
| Fazer um backup agora | `sudo aguillera-backup` |
| Ver se está tudo bem | `sudo systemctl status aguillera` |
| Ver as últimas mensagens do sistema | `sudo journalctl -u aguillera -n 50` |

**Backup:** todo dia às 3h. Fica guardado 14 dias no servidor e vai também
para o Cloud Storage do seu projeto (balde `aguillera-backup-…`, 5 GB grátis).
Cada cópia tem o banco, os arquivos dos clientes e as configurações.

**Atualizações de segurança** do servidor: automáticas.

**Mudar para o Cloudflare depois:** o banco é o mesmo formato (SQLite). A
mudança leva os dados juntos.
