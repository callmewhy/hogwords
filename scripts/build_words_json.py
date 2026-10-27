#!/usr/bin/env python3
"""Convert book word lists into data/words.json for the static site."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

BOOKS = [
    {"id": 1, "en": "Philosopher's Stone", "zh": "魔法石", "file": "book1.txt"},
    {"id": 2, "en": "Chamber of Secrets", "zh": "密室", "file": "book2.txt"},
    {"id": 3, "en": "Prisoner of Azkaban", "zh": "阿兹卡班", "file": "book3.txt"},
    {"id": 4, "en": "Goblet of Fire", "zh": "火焰杯", "file": "book4.txt"},
    {"id": 5, "en": "Order of the Phoenix", "zh": "凤凰社", "file": "book5.txt"},
    {"id": 6, "en": "Half-Blood Prince", "zh": "混血王子", "file": "book6.txt"},
    {"id": 7, "en": "Deathly Hallows", "zh": "死亡圣器", "file": "book7.txt"},
]

def load_words(path: Path):
    words = []
    seen = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        w = line.strip()
        if not w:
            continue
        key = w.lower()
        if key in seen:
            continue
        seen.add(key)
        words.append(w)
    return words

def main():
    books_out = []
    all_unique = set()
    total_words = 0
    for meta in BOOKS:
        words = load_words(DATA / meta["file"])
        total_words += len(words)
        for w in words:
            all_unique.add(w.lower())
        books_out.append({
            "id": meta["id"],
            "titleEn": meta["en"],
            "titleZh": meta["zh"],
            "shortEn": f"Book {meta['id']}",
            "wordCount": len(words),
            "words": words,
        })
    out = {
        # public site — no personalization
    "site": "Hogwords",
        "books": books_out,
        "stats": {
            "bookCount": len(books_out),
            "totalWordOccurrences": total_words,
            "uniqueWords": len(all_unique),
        },
    }
    out_path = DATA / "words.json"
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {out_path}")
    for b in books_out:
        print(f"  Book {b['id']}: {b['wordCount']} words — {b['titleEn']} ({b['titleZh']})")
    print(f"Total (sum): {total_words}")
    print(f"Unique across all books: {len(all_unique)}")

if __name__ == "__main__":
    main()
