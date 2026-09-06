#!/usr/bin/env python3
"""
OPUS Corp. site — single-file bundler.

Source of truth for the site is the split files at the repo root:
  index.html   — markup, references styles.css / script.js / assets/logo.webp
  styles.css   — all CSS
  script.js    — all interactive JS
  assets/logo.webp — the OPUS mark, embedded as a CSS mask/background image

This script re-inlines those into two single-file outputs that behave
identically to the split source, for the two contexts that need a
self-contained file instead of a folder of assets:

  dist/site.html   full standalone HTML (doctype/html/head/body included) —
                    open directly in a browser, or drop as-is on hosting
                    that can't serve separate CSS/JS files.
  artifact.html     the same content WITHOUT <!DOCTYPE>/<html>/<head>/<body>
                    wrapper tags, ready to hand to the Artifact tool, which
                    supplies that wrapper itself at publish time.

Run after any change to index.html / styles.css / script.js / assets/logo.webp:
  python3 build/bundle.py
"""
import base64
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(relpath):
    with open(os.path.join(ROOT, relpath), "r", encoding="utf-8") as f:
        return f.read()


def build():
    html = read("index.html")
    css = read("styles.css").rstrip("\n")
    js = read("script.js").rstrip("\n")

    with open(os.path.join(ROOT, "assets", "logo.webp"), "rb") as f:
        logo_b64 = base64.b64encode(f.read()).decode("ascii")
    logo_data_uri = f"data:image/webp;base64,{logo_b64}"

    # inline the logo back into the CSS custom property
    css_inlined = css.replace(
        'url("assets/logo.webp")',
        f'url("{logo_data_uri}")',
        1,
    )
    if css_inlined == css:
        print("ERROR: logo reference not found in styles.css", file=sys.stderr)
        sys.exit(1)

    style_block = f"<style>\n{css_inlined}\n</style>"
    script_block = f"<script>\n{js}\n</script>"

    # ---- split the ORIGINAL (un-inlined) source into head / body first,
    # so line-based filtering of <head> never touches CSS/JS content ----
    head_match = re.search(r"<head>\n?(.*?)</head>", html, re.DOTALL)
    body_match = re.search(r"<body[^>]*>(.*)</body>\s*</html>\s*$", html, re.DOTALL)
    if not head_match or not body_match:
        print("ERROR: could not locate <head>/<body> in index.html", file=sys.stderr)
        sys.exit(1)
    head_content = head_match.group(1)
    body_content = body_match.group(1)

    # keep everything from <head> except the charset/viewport <meta> tags —
    # the Artifact skeleton supplies those two itself, but not the page
    # <title>, description, or the font preconnect/stylesheet links. The
    # <link rel="stylesheet"> placeholder line becomes the real <style> block.
    head_lines = []
    for line in head_content.splitlines():
        if not line.strip():
            continue
        if "charset=" in line or "viewport" in line:
            continue
        if 'rel="stylesheet" href="styles.css"' in line:
            head_lines.append(style_block)
            continue
        head_lines.append(line)
    artifact_head = "\n".join(head_lines)

    # inline script.js into the body, in place of the <script src> placeholder
    script_pattern = r'<script src="script\.js"></script>'
    body_inlined, n = re.subn(script_pattern, lambda m: script_block, body_content, count=1)
    if n != 1:
        print("ERROR: script.js <script src> not found in index.html body", file=sys.stderr)
        sys.exit(1)

    artifact_html = f"{artifact_head}\n{body_inlined.strip(chr(10))}\n"
    with open(os.path.join(ROOT, "artifact.html"), "w", encoding="utf-8") as f:
        f.write(artifact_html)

    # ---- dist/site.html: full standalone document (doctype/html/head/body) ----
    full_head = head_content.replace(
        '<link rel="stylesheet" href="styles.css">', style_block, 1
    )
    full_html = html.replace(head_match.group(1), full_head, 1)
    full_html = re.sub(script_pattern, lambda m: script_block, full_html, count=1)
    os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)
    with open(os.path.join(ROOT, "dist", "site.html"), "w", encoding="utf-8") as f:
        f.write(full_html)

    print(f"dist/site.html   {len(full_html):,} chars")
    print(f"artifact.html    {len(artifact_html):,} chars")


if __name__ == "__main__":
    build()
