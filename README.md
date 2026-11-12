# Site DC Consultoria e Assessoria Contábil

Site estático (HTML/CSS/JS puro) servido com `serve` no Railway.

## Rodar local
npm install
npm start        # http://localhost:3000

## Deploy no Railway
1. Suba esta pasta num repositório no GitHub.
2. Railway → New Project → Deploy from GitHub repo.
3. O Railway detecta o Node e roda `npm start` (usa a variável PORT automaticamente).
4. Settings → Networking → Custom Domain → adicione `dcconsultoriacontabil.com.br` e
   `www.dcconsultoriacontabil.com.br`. O Railway mostra um CNAME para cada um.

## Domínio: registro.br + Cloudflare → Railway
O Registro.br não aceita CNAME no domínio raiz (sem `www`), só em subdomínios.
Por isso o DNS fica no Cloudflare (gratuito), que suporta CNAME flattening na raiz.

1. Registrar `dcconsultoriacontabil.com.br` no Registro.br (titularidade do cliente).
2. Criar conta no Cloudflare → Add a site → `dcconsultoriacontabil.com.br` (plano Free).
3. O Cloudflare vai propor 2 nameservers (ex. `ana.ns.cloudflare.com`,
   `tom.ns.cloudflare.com`). Copiar esses nameservers e trocar no Registro.br
   (registro.br → Meus domínios → dcconsultoriacontabil.com.br → Alterar servidores DNS).
   A propagação pode levar algumas horas.
4. No Railway (Settings → Networking → Custom Domain), pegar o CNAME gerado
   para cada domínio (raiz e www).
5. No Cloudflare → DNS → Records, criar:
   - `dcconsultoriacontabil.com.br` → CNAME → valor que o Railway deu (Cloudflare faz o
     flattening automático mesmo sendo raiz) → Proxy status: **DNS only** (nuvem
     cinza, não laranja — proxy do Cloudflare pode conflitar com o certificado
     SSL que o Railway emite).
   - `www` → CNAME → mesmo valor do Railway → Proxy status: **DNS only**.
6. Aguardar a validação do domínio no Railway (ele emite o certificado SSL
   sozinho depois que o DNS propagar) e testar `https://dcconsultoriacontabil.com.br`
   e `https://www.dcconsultoriacontabil.com.br`.

## Trocar depois
- Foto: substituir `public/img/daniel4.jpeg` (quadrada, ~800x800).
- Fotos dos cards de serviço (`public/img/servico-*.jpg`): baixadas do Pexels
  (Pexels License — uso comercial livre, sem atribuição obrigatória). São
  genéricas; trocar por fotos reais do escritório quando o cliente tiver.
- WhatsApp: número `5592988226908` aparece no index.html e no script.js.
- Domínio: se não for dcconsultoriacontabil.com.br, troque em index.html (canonical,
  og:url, og:image, JSON-LD), robots.txt e sitemap.xml.
