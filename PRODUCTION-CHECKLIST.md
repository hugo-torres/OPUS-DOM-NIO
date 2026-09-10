# OPUS Corp. — Checklist técnica de publicação (opuscorp.pt)

Documento de apoio à Fase 8 (Production Readiness). Cobre exatamente os itens pedidos em "6. PRODUÇÃO / HTTP". Cada item indica se **já está implementado no projeto** (ficheiro/HTML) ou se **depende da configuração do servidor/hosting** — nada foi inventado ou assumido sobre esse lado.

## Já implementado no projeto (não depende do hosting)

| Item | Estado |
|---|---|
| `robots.txt` | Presente na raiz, `Allow: /`, aponta para o sitemap. |
| `sitemap.xml` | Presente, com `https://www.opuscorp.pt/` (site de uma página). |
| Favicon | `favicon.ico` (16/32/48), `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`, `apple-touch-icon.png` — todos ligados no `<head>`. |
| Manifest | `site.webmanifest` ligado via `<link rel="manifest">`, com `icon-192.png`/`icon-512.png`. |
| Open Graph | `og:type`, `og:site_name`, `og:locale`, `og:url`, `og:title`, `og:description`, `og:image` (+ width/height) presentes. |
| Twitter/X card | `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image` presentes. |
| Canonical | `<link rel="canonical" href="https://www.opuscorp.pt/">`. |
| JSON-LD | `Organization` com nome, url, email, morada (Famalicão/PT) — só dados já aprovados. |
| `Content-Type` dos ficheiros do projeto | `index.html` é servido como `text/html`, `styles.css` como `text/css`, `script.js` como `text/javascript` — comportamento padrão de qualquer servidor estático corretamente configurado; nada de especial a fazer aqui além de confirmar que o hosting não força um MIME type errado (ver abaixo). |

## Depende da configuração do servidor/hosting — **não implementado no projeto**, apenas documentado

Estes itens não podem ser resolvidos dentro do próprio site (são configuração de infraestrutura, não código da página) e dependem de qual hosting/CDN a OPUS vai usar para `opuscorp.pt`. Seguem como checklist para quem configurar o servidor:

- **HTTPS** — certificado TLS válido para `opuscorp.pt` e `www.opuscorp.pt` (a maioria dos hosts modernos, Cloudflare, Netlify, Vercel, cPanel com Let's Encrypt, etc. emite automaticamente; confirmar antes do lançamento).
- **Redirect HTTP → HTTPS** — toda a requisição em `http://` deve responder com **301** para o equivalente `https://`. Configurar no servidor/CDN (ex.: regra de redirect no Nginx/Apache, ou "Always use HTTPS" no Cloudflare).
- **`www` vs `non-www`** — o projeto assume `https://www.opuscorp.pt/` como canónico (é o que está em `canonical`, Open Graph e JSON-LD). É necessário configurar um **redirect 301** de `opuscorp.pt` → `www.opuscorp.pt` (ou o inverso, se a decisão final for usar o domínio nu — nesse caso avisem para eu atualizar `canonical`/OG/JSON-LD/sitemap/manifest para o domínio sem `www`). Só um dos dois deve responder 200; o outro deve redirecionar.
- **Cache headers** — recomendado (valores típicos, ajustar ao hosting escolhido):
  - `index.html`: `Cache-Control: no-cache` ou `max-age` curto (ex. 300s) — para que atualizações futuras cheguem rápido aos visitantes.
  - `styles.css`, `script.js`, `assets/*`: `Cache-Control: public, max-age=31536000, immutable` — desde que o processo de deploy troque o nome do ficheiro (ou adicione um query-string de versão) sempre que o conteúdo mudar; caso contrário usar um `max-age` mais conservador (ex. 1 dia) para não arriscar servir uma versão antiga em cache.
- **Compressão (Brotli/Gzip)** — o servidor/CDN deve comprimir as respostas de texto (`text/html`, `text/css`, `text/javascript`, `application/manifest+json`, `image/svg+xml` se aplicável). A maioria dos hosts modernos já faz isto automaticamente (Cloudflare, Netlify, Vercel); em Nginx/Apache é preciso ativar explicitamente os módulos `gzip`/`brotli`. Não foi possível medir o ganho real neste ambiente (sem acesso ao servidor de produção), mas com `styles.css` (~46 KB) e `script.js` (~13 KB) o ganho esperado com Brotli é de 60–75% nesses dois ficheiros.
- **MIME types** — confirmar que o servidor serve `site.webmanifest` como `application/manifest+json` (ou `application/json`, aceite por todos os browsers) e `.webp`/`.ico`/`.png` com os `Content-Type` corretos — comportamento padrão em qualquer servidor estático atualizado, mas vale confirmar após o deploy (alguns servidores antigos não têm o MIME type de `.webmanifest`/`.webp` configurado por omissão).
- **Página 404** — o projeto é uma página única (site "one-pager"); não existe atualmente uma página 404 dedicada. Recomendo configurar, ao nível do servidor/hosting, um redirect de qualquer rota desconhecida para `/` (comportamento comum em sites de uma página) ou uma página 404 simples reutilizando a identidade visual — decisão que depende de como o site vai ser hospedado (ex. em Netlify/Vercel isto é um ficheiro `_redirects`/`vercel.json`; em Nginx/Apache é uma diretiva `error_page`). Não criei nenhuma página 404 agora para não introduzir um novo componente visual sem aprovação.
- **Security headers** — recomendados para produção (a configurar no servidor/CDN, não no HTML):
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains` (só depois de confirmar que HTTPS está estável em todos os subdomínios).
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `X-Frame-Options: SAMEORIGIN` (ou `Content-Security-Policy: frame-ancestors 'self'`)
  - `Content-Security-Policy` — recomendado, mas exige mapear exatamente as origens usadas hoje (`fonts.googleapis.com`, `fonts.gstatic.com`, e o endpoint do Formspree assim que for definido) para não bloquear o próprio site. Sugiro configurar isto só depois de o formulário ter o ID real do Formspree, para desenhar a política final numa só vez.

Nenhum destes itens foi "resolvido" dentro do código do projeto porque nenhum deles pode ser — são decisões e configuração do ambiente de produção real, que ainda não existe. Assim que houver acesso ao hosting/DNS definitivo, esta lista serve de checklist de configuração.
