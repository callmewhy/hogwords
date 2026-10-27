# Hogwords — Free Harry Potter English Vocabulary

Public static site for learning English with Hogwarts-inspired vocabulary from all seven Harry Potter books. Dark original UI (no official trademarks).

Live: https://hogwords.pages.dev/

## Features

- Home + book selector with word counts
- Browse: search, filter, A–Z, pagination
- Flashcards with know/learning + English TTS (custom Hogwarts-themed toggle)
- Quiz: multiple choice (listen) or type-the-word
- Download: per-book / all as .txt .csv + zip of txts
- Multi-language UI (en, zh-CN, zh-TW, ja, ko, es, fr, de, pt, ru)
- Path-based locales for SEO: `/`, `/en/`, `/zh-CN/`, … plus hreflang + sitemap
- SEO: meta, Open Graph, Twitter Card, robots.txt, sitemap, JSON-LD

## Locale URLs

| Path | Language |
|------|----------|
| `/` | English (canonical / x-default) |
| `/en/` | English |
| `/zh-CN/` | 简体中文 |
| `/zh-TW/` | 繁體中文 |
| `/ja/` | 日本語 |
| `/ko/` | 한국어 |
| `/es/` | Español |
| `/fr/` | Français |
| `/de/` | Deutsch |
| `/pt/` | Português |
| `/ru/` | Русский |

Shortcuts: `/zh` → `/zh-CN/`, `/cn` → `/zh-CN/`, `/jp` → `/ja/`, `/kr` → `/ko/`.

## Run locally

```bash
python3 -m http.server 8765 --directory /workspace/hogwords
```

Open http://127.0.0.1:8765/

## Rebuild data

```bash
python3 scripts/build_words_json.py
```
