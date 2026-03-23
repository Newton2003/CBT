"""
Quick extractor for Use of English PDFs filtered by the official area of concentration.

Requirements:
  pip install pypdf

Usage (run from project root):
  python scripts/extract_use_english.py ^
    --area "C:/Users/USER/Downloads/use of english_Area of concentration.pdf" ^
    --pdf "C:/Users/USER/Downloads/use of english_1978-2020.pdf" ^
    --pdf "C:/Users/USER/Downloads/use of english_1983-2002.pdf" ^
    --out data/questions_use_english_filtered.json

Notes:
  - The parsing is heuristic; PDF text quality varies. Open the output JSON and spot-check.
  - The script keeps only questions whose text matches any area keyword extracted from the syllabus.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Iterable, List, Dict, Any

from pypdf import PdfReader


def extract_text(pdf_path: Path) -> str:
    reader = PdfReader(str(pdf_path))
    return "\n".join((page.extract_text() or "") for page in reader.pages)


def extract_area_keywords(area_text: str) -> List[str]:
    # pull bullets and topic headings as keywords
    lines = [ln.strip() for ln in area_text.splitlines()]
    tokens: List[str] = []
    for ln in lines:
        if not ln:
            continue
        # headings like "SECTION A:  Comprehension and Summary"
        if ":" in ln:
            part = ln.split(":", 1)[1].strip()
            tokens.extend(re.findall(r"[A-Za-z']+", part))
        # bullet items
        if ln.startswith("(") or ln[0].isalpha():
            tokens.extend(re.findall(r"[A-Za-z']+", ln))
    # de-duplicate and lower
    uniq = []
    for tok in tokens:
        low = tok.lower()
        if len(low) < 3:
            continue
        if low not in uniq:
            uniq.append(low)
    return uniq


QUESTION_SPLIT_RE = re.compile(r"\n(?=\d{1,3}[).])")


def parse_questions(text: str) -> List[Dict[str, Any]]:
    blocks = QUESTION_SPLIT_RE.split(text)
    parsed = []
    for block in blocks:
        block = block.strip()
        if not block or not re.match(r"^\d", block):
            continue
        lines = [ln.strip() for ln in block.splitlines() if ln.strip()]
        if not lines:
            continue
        # first line is question number and stem
        stem_line = lines[0]
        stem = re.sub(r"^\d+[).]\s*", "", stem_line)
        opts: Dict[str, str] = {}
        for ln in lines[1:]:
            m = re.match(r"([A-D])\.\s*(.*)", ln)
            if m:
                opts[m.group(1)] = m.group(2).strip()
        # simple answer detection like "(C)" at end of block
        ans = ""
        m_ans = re.search(r"\(([A-D])\)\s*$", block)
        if m_ans:
            ans = m_ans.group(1)
        parsed.append(
            {
                "subject": "Use of English",
                "topic": "Unknown",
                "year": None,
                "question": stem,
                "options": {k: opts.get(k, "") for k in ["A", "B", "C", "D"]},
                "answer": ans,
                "explanation": "",
            }
        )
    return parsed


def filter_by_area(items: Iterable[Dict[str, Any]], keywords: List[str]) -> List[Dict[str, Any]]:
    out = []
    for q in items:
        text = f"{q['question']} {' '.join(q['options'].values())}".lower()
        if any(k in text for k in keywords):
            out.append(q)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--area", required=True, help="Area of concentration PDF path")
    ap.add_argument("--pdf", action="append", required=True, help="Past questions PDF path(s)")
    ap.add_argument("--out", required=True, help="Output JSON path")
    args = ap.parse_args()

    area_text = extract_text(Path(args.area))
    keywords = extract_area_keywords(area_text)
    print(f"[info] extracted {len(keywords)} keywords from area of concentration")

    all_questions: List[Dict[str, Any]] = []
    for pdf in args.pdf:
        print(f"[info] reading {pdf}")
        q_text = extract_text(Path(pdf))
        qs = parse_questions(q_text)
        all_questions.extend(qs)
        print(f"  parsed {len(qs)} questions")

    filtered = filter_by_area(all_questions, keywords)
    print(f"[info] kept {len(filtered)} / {len(all_questions)} questions after keyword filter")

    out_path = Path(args.out)
    out_path.write_text(json.dumps(filtered, indent=2))
    print(f"[done] wrote {out_path}")


if __name__ == "__main__":
    main()
