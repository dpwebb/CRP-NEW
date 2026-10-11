"""Make one controlled synthetic PDF variant while retaining its original page layout."""
import json
import pathlib
import sys

import fitz


def main():
    spec = json.load(sys.stdin)
    source = pathlib.Path(spec["template"])
    target = pathlib.Path(spec["output"])
    page_number = int(spec["page"])
    occurrence = int(spec.get("occurrence", 1))
    old = str(spec["old"])
    new = str(spec.get("new", ""))
    if not source.is_file() or not old or occurrence < 1 or page_number < 1:
        raise ValueError("Provide an existing template, a page, a printed value and an occurrence")
    if target.exists():
        raise ValueError("The generated report already exists")
    document = fitz.open(source)
    try:
        if page_number > len(document):
            raise ValueError("Page is outside the template")
        if not any(marker in " ".join(page.get_text() for page in document) for marker in
                   ("SYNTHETIC TEST FIXTURE", "SYNTHETIC TRAINING DATA - NOT A CREDIT REPORT")):
            raise ValueError("Template must be a marked synthetic fixture")
        page = document[page_number - 1]
        hits = page.search_for(old)
        if len(hits) < occurrence:
            raise ValueError(f"Printed value has only {len(hits)} occurrence(s) on that page")
        rect = hits[occurrence - 1]
        width = max(rect.width, fitz.get_text_length(new, fontname="helv", fontsize=9) + 4)
        if rect.x0 + width > page.rect.width - 20:
            raise ValueError("Replacement does not fit on the page")
        place = fitz.Rect(rect.x0, rect.y0, rect.x0 + width, rect.y1)
        page.add_redact_annot(rect, fill=(1, 1, 1))
        page.apply_redactions(images=0)
        if new:
            # The clean-room source uses simple dark text on white. Keep text native and parseable.
            baseline = rect.y1 - max(0.5, (rect.height - 9) / 2)
            page.insert_text((rect.x0, baseline), new, fontname="helv", fontsize=9, color=(0.1, 0.16, 0.22))
        document.set_metadata({**document.metadata, "creator": "crp-private-creator-seed-console-2026-10-10"})
        target.parent.mkdir(parents=True, exist_ok=True)
        document.save(target, garbage=4, deflate=True)
    finally:
        document.close()
    check = fitz.open(target)
    try:
        if new and new not in check[page_number - 1].get_text():
            target.unlink(missing_ok=True)
            raise ValueError("Generated value is not extractable in the saved report")
    finally:
        check.close()
    print(json.dumps({"output": str(target), "page": page_number, "replaced": old, "with": new}))


if __name__ == "__main__":
    main()
