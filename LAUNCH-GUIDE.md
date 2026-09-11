# OPUS Corp. — Guia de Lançamento (opuscorp.pt)

Guia prático, passo a passo, para colocar o site atual (baseline `phase-8-production-readiness`, commit `694983c`) em produção em `https://www.opuscorp.pt/`, sem tocar no design, layout ou conteúdo aprovados.

Ficheiros que compõem o site a publicar (e só estes — ver nota no fim sobre ficheiros do repositório que **não** devem ir para produção):

```
index.html
styles.css
script.js
robots.txt
sitemap.xml
site.webmanifest
assets/logo.webp
assets/icons/  (favicon.ico, favicon-16x16.png, favicon-32x32.png, favicon-48x48.png,
                apple-touch-icon.png, icon-192.png, icon-512.png, og-image.jpg)
```

## 0. Antes de começar — o que precisa de estar decidido

Sem estes três pontos, não é possível avançar com os passos seguintes:

1. **Hosting escolhido** (ex.: Cloudflare Pages, Netlify, Vercel, cPanel/servidor próprio com Nginx ou Apache). Os passos abaixo dão instruções para os casos mais comuns.
2. **Domínio confirmado** — o projeto assume `https://www.opuscorp.pt/` como definitivo (é o que está em `canonical`, Open Graph, JSON-LD, `robots.txt` e `sitemap.xml`). Se o domínio real for outro, ou se decidirem usar o domínio sem `www`, isso precisa de ser corrigido no código **antes** do deploy — avisem antes de publicar.
3. **Form ID real do Formspree** — sem isto o formulário de avaliação técnica mostra uma mensagem de fallback em vez de enviar (ver secção 8).

## 1. Publicar os ficheiros no hosting

Copiar exatamente os ficheiros listados no topo deste documento para a raiz do hosting (o `index.html` deve ficar acessível em `https://www.opuscorp.pt/`, não em `https://www.opuscorp.pt/index.html/algo`). Não copiar `artifact.html`, `dist/`, `build/`, `audit/`, `redesign-concept.html` nem os `index.backup-*.html` — ver a nota final sobre isto.

## 2. HTTPS

- **Cloudflare Pages / Netlify / Vercel**: certificado TLS é emitido e renovado automaticamente ao ligar o domínio — não é preciso fazer nada além de confirmar, no painel, que o domínio está "Active"/"Secured".
- **cPanel / servidor próprio**: ativar Let's Encrypt (a maioria dos cPanel tem "AutoSSL" — ativar para `opuscorp.pt` e `www.opuscorp.pt`). Em Nginx/Apache manual, usar `certbot` para ambos os domínios.
- **Confirmar no fim**: abrir `https://www.opuscorp.pt/` e `https://opuscorp.pt/` num browser e verificar o cadeado, sem avisos de certificado.

## 3. Redirect HTTP → HTTPS (301)

- **Cloudflare**: SSL/TLS → Edge Certificates → "Always Use HTTPS" = ON.
- **Netlify/Vercel**: já é automático por omissão.
- **Nginx** (exemplo mínimo):
  ```nginx
  server {
    listen 80;
    server_name opuscorp.pt www.opuscorp.pt;
    return 301 https://www.opuscorp.pt$request_uri;
  }
  ```
- **Apache** (`.htaccess`):
  ```apache
  RewriteEngine On
  RewriteCond %{HTTPS} off
  RewriteRule ^ https://www.opuscorp.pt%{REQUEST_URI} [L,R=301]
  ```

## 4. Canonical `www` vs `non-www`

O código já assume `www.opuscorp.pt` como o domínio canónico. É preciso garantir que **só** essa versão responde 200 — a versão sem `www` deve redirecionar (301) para ela.

- **Nginx** (juntar ao bloco acima, ou separado):
  ```nginx
  server {
    listen 443 ssl;
    server_name opuscorp.pt;
    return 301 https://www.opuscorp.pt$request_uri;
  }
  ```
- **Apache** (`.htaccess`, depois do redirect HTTPS):
  ```apache
  RewriteCond %{HTTP_HOST} ^opuscorp\.pt [NC]
  RewriteRule ^ https://www.opuscorp.pt%{REQUEST_URI} [L,R=301]
  ```
- **Cloudflare/Netlify/Vercel**: configurar uma regra de redirect do domínio "apex" (`opuscorp.pt`) para `www.opuscorp.pt` no painel (todos têm esta opção nas definições de domínio).

Se decidirem, afinal, usar o domínio **sem** `www` como definitivo: avisem antes de publicar — preciso de trocar `canonical`, `og:url`, `twitter`, o JSON-LD, `robots.txt` (linha do Sitemap) e `sitemap.xml` para o domínio sem `www`, e inverter este redirect.

## 5. Compressão (Brotli/Gzip)

- **Cloudflare/Netlify/Vercel**: ativo automaticamente, nada a fazer.
- **Nginx**: confirmar que o módulo `gzip` (ou `brotli`, se compilado) está ativo:
  ```nginx
  gzip on;
  gzip_types text/html text/css text/javascript application/javascript application/manifest+json image/svg+xml;
  gzip_min_length 256;
  ```
- **Apache**: `mod_deflate` ativo, com `AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript application/manifest+json`.

## 6. Cache headers

- `index.html`: cache curto ou nenhum — `Cache-Control: no-cache` (garante que atualizações futuras aparecem imediatamente).
- `styles.css`, `script.js`, `assets/*`, `site.webmanifest`: cache longo — `Cache-Control: public, max-age=31536000, immutable`, **desde que** o processo de deploy troque o nome do ficheiro ou adicione um parâmetro de versão sempre que o conteúdo mudar. Caso o deploy simplesmente sobrescreva os ficheiros com o mesmo nome, usar um valor mais conservador (ex. `max-age=86400`, 1 dia) para não arriscar visitantes ficarem presos numa versão antiga em cache.
- Exemplo Nginx:
  ```nginx
  location = /index.html { add_header Cache-Control "no-cache"; }
  location ~* \.(css|js|png|jpg|jpeg|webp|ico|webmanifest)$ { add_header Cache-Control "public, max-age=86400"; }
  ```
- Netlify/Vercel/Cloudflare Pages: configurável num ficheiro `_headers` (Netlify) ou `vercel.json` (Vercel) na raiz do projeto — digam qual destes vão usar que eu preparo esse ficheiro exato.

## 7. MIME types

Confirmar, depois do deploy, que o servidor devolve os `Content-Type` corretos (a maioria dos hostings modernos já sabe todos estes por omissão; servidores mais antigos podem não reconhecer `.webmanifest` ou `.webp`):

| Ficheiro | Content-Type esperado |
|---|---|
| `*.html` | `text/html; charset=utf-8` |
| `*.css` | `text/css` |
| `*.js` | `text/javascript` |
| `*.webmanifest` | `application/manifest+json` (aceite também `application/json`) |
| `*.webp` | `image/webp` |
| `*.ico` | `image/x-icon` |
| `*.png` / `*.jpg` | `image/png` / `image/jpeg` |
| `*.xml` | `application/xml` |
| `robots.txt` | `text/plain` |

Verificação rápida depois do deploy: `curl -I https://www.opuscorp.pt/site.webmanifest` e confirmar o cabeçalho `Content-Type`.

## 8. Formulário (Formspree)

Assim que tiverem o Form ID real do Formspree, substituir na linha do `index.html`:

```html
<form id="assessForm" class="assess-form" action="https://formspree.io/f/YOUR_FORM_ID" method="POST" novalidate>
```

`YOUR_FORM_ID` pelo ID real (ex. `https://formspree.io/f/xyzabcde`). Até lá, o formulário mostra uma mensagem a informar que o envio ainda não está configurado, em vez de falhar silenciosamente — comportamento intencional, já testado.

## 9. Página 404

O projeto é uma página única; não existe hoje uma página 404 dedicada. Duas opções, dependendo do hosting:

- **Redirect simples para `/`** (sem alterar código): configurar no hosting. Ex. Netlify (`_redirects`): `/*  /  200`. Vercel (`vercel.json`): uma rota `rewrites` para `/`. Nginx: `error_page 404 /index.html;`.
- **Página 404 dedicada com a identidade visual**: é uma peça nova — precisa da vossa aprovação antes de eu a criar (o design está congelado).

## 10. HSTS

Só ativar **depois** de confirmar que HTTPS está estável em `opuscorp.pt` e `www.opuscorp.pt` (o HSTS diz ao browser para nunca mais tentar HTTP nesse domínio — reverter depois é lento, porque os browsers guardam isto por muito tempo).

- **Cloudflare**: SSL/TLS → Edge Certificates → HSTS → ativar com `max-age` de 6 a 12 meses para começar (não usar `preload` já no primeiro dia).
- **Nginx**: `add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;`
- **Apache**: `Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"`

## 11. X-Content-Type-Options

- **Nginx**: `add_header X-Content-Type-Options "nosniff" always;`
- **Apache**: `Header always set X-Content-Type-Options "nosniff"`
- **Cloudflare/Netlify/Vercel**: configurável num "Transform Rule" (Cloudflare) ou ficheiro `_headers`/`vercel.json`.

## 12. Referrer-Policy

- **Nginx**: `add_header Referrer-Policy "strict-origin-when-cross-origin" always;`
- **Apache**: `Header always set Referrer-Policy "strict-origin-when-cross-origin"`

## 13. X-Frame-Options

- **Nginx**: `add_header X-Frame-Options "SAMEORIGIN" always;`
- **Apache**: `Header always set X-Frame-Options "SAMEORIGIN"`

## 14. Content-Security-Policy (CSP)

Configurar **depois** de terem o Form ID do Formspree definitivo (a política precisa de incluir o domínio exato para onde o formulário envia). Uma política de partida, com as origens que o site realmente usa hoje:

```
Content-Security-Policy:
  default-src 'self';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src https://fonts.gstatic.com;
  img-src 'self' data:;
  script-src 'self';
  connect-src 'self' https://formspree.io;
  form-action 'self' https://formspree.io;
  frame-ancestors 'self';
```

Testar sempre em modo `Content-Security-Policy-Report-Only` primeiro, para confirmar que nada é bloqueado por engano, antes de aplicar a política real.

## 15. `robots.txt` e `sitemap.xml`

Já prontos no projeto, nada a fazer além do deploy. Confirmar depois:
- `https://www.opuscorp.pt/robots.txt` responde 200 e mostra o conteúdo esperado.
- `https://www.opuscorp.pt/sitemap.xml` responde 200 e é XML válido.

## 16. Favicon / manifest

Já prontos e ligados no `<head>`. Confirmar depois do deploy:
- O separador do browser mostra o ícone da OPUS.
- Em telemóvel, "Adicionar ao ecrã principal" usa o ícone e o nome corretos (vem do `site.webmanifest`).

## 17. Validar o domínio no Google Search Console

1. Aceder a [search.google.com/search-console](https://search.google.com/search-console).
2. Adicionar propriedade — recomendo o tipo **"Domínio"** (cobre `www` e `non-www` e todos os subdomínios de uma vez), que pede verificação por registo DNS (TXT) junto do registrador do domínio.
3. Se preferirem verificação só do prefixo `https://www.opuscorp.pt/`, o Search Console oferece um ficheiro HTML para colocar na raiz, ou uma tag `<meta>` para colocar no `<head>` — avisem se preferirem este método, que preciso de adicionar essa tag ao `index.html`.
4. Confirmar a verificação.

## 18. Submeter o sitemap

Já dentro da propriedade verificada no Search Console: Sitemaps (menu lateral) → introduzir `sitemap.xml` → Enviar. O Search Console vai buscar `https://www.opuscorp.pt/sitemap.xml` automaticamente.

## 19. QA final em produção

Depois do site estar no ar no domínio real, repetir a verificação feita nas Fases 7/8 mas **no domínio de produção**, porque este ambiente de trabalho não tem acesso à internet real para testar o carregamento das Google Fonts:
- `https://www.opuscorp.pt/` carrega sem erros de consola.
- As fontes Inter/JetBrains Mono carregam (aqui nunca foi possível confirmar isto por falta de rede).
- Formulário submete corretamente com o Form ID real.
- `robots.txt`, `sitemap.xml`, favicons, manifest todos acessíveis.
- Redirects (`http→https`, `non-www→www`) funcionam.

## Nota sobre ficheiros do repositório que não são para produção

O repositório contém, além dos ficheiros do site, material de outras fases que **não deve ser publicado**: `artifact.html`, `dist/site.html`, `build/bundle.py`, `audit/` (documentos de auditoria e propostas internas), `redesign-concept.html`, e dois backups (`index.backup-*.html`). Nenhum destes é referenciado pelo site nem é necessário para ele funcionar — servem para histórico do projeto e para gerar versões alternativas (ver `PROBLEMAS ENCONTRADOS` no relatório desta fase para detalhe sobre o estado destes ficheiros). Ao configurar o deploy, garantir que só a lista do topo deste documento é publicada — não o repositório inteiro.
