# GradeScan — Automated Quiz Scanner & Grading System

Assignment 1 (AI, BSE-4A, SP2026). A web app that scans MCQ quiz sheets: it
decodes the **answer key from the QR**, reads the student's **Name + Reg# via
OCR**, reads the **two-part bubble grid**, **grades**, and supports **batch
processing → CSV**. Built with React + Vite; the JSON "db" lives in the repo
(`public/db.json`) and persists to `localStorage` (no backend).

## Run

```bash
npm install
npm run dev          # http://localhost:5173
```

CLI tools (same detection code as the app):

```bash
npm run make-samples         # render 5 test sheets into samples/
npm run grade <image> [--ocr]   # grade one sheet, print breakdown
npm run batch [dir] [--ocr]     # grade a folder -> output/<title>_<set>_<ts>.csv
npm run build                # production build
```

## Tasks completed

| # | Task | Where | Status |
|---|------|-------|--------|
| 1 | **QR → answer key** (set, Part-I, Part-II; rotation/skew tolerant) | `src/lib/quizQr.js`, `src/lib/qr.js` (jsQR) | ✅ |
| 2 | **Student info via OCR** (Name + Reg#) | `src/lib/ocr.js` (tesseract.js) | ✅ |
| 3 | **Bubble sheet reading** (2 parts × 8, partial/blank/**multi-flag**) | `src/lib/omrCore.js` | ✅ |
| 4 | **Grading** (counts, marks, %, grade, ✓/✗/–, negative marking) | `src/lib/grade.js` | ✅ |
| 5 | **Batch + CSV** (≥5 sheets, all columns, summary row, auto-named) | `Batch` tab + `scripts/batch.mjs`, `src/lib/csv.js` | ✅ |
| Bonus | AR Android app | — | ❌ not attempted (different stack) |

## How it works

1. **Alignment.** Sheets carry four corner registration marks. The detector
   finds them (Otsu threshold → connected components), solves a **homography**
   to undo rotation/scale/**perspective**, then maps every bubble + the OCR
   field boxes into the image. Shared geometry lives in `src/lib/sheetLayout.js`.
2. **QR (Task 1).** jsQR decodes the QR; `quizQr.js` parses the pipe format
   `… Set-C | Part-I: Q1=D … | Part-II: …` (plus optional Class/Subject/Neg).
3. **OCR (Task 2).** The Name/Reg# boxes are cropped *through the homography*
   (so it works on skewed scans), binarized, and read by tesseract.js. OCR
   fails soft — you can always correct the fields in **Review**.
4. **Bubbles (Task 3).** Each bubble's interior darkness is sampled; the darkest
   option wins, blanks = unattempted, two strong marks = **invalid (flagged)**.
5. **Grade (Task 4).** `gradeQuiz()` compares to the key, applies negative
   marking, and produces the per-question ✓/✗/– breakdown + letter grade.
6. **Batch (Task 5).** The **Batch** tab (or `npm run batch`) processes many
   sheets, **auto-creates any student whose Reg# is new**, and exports a CSV
   named `<title>_<set>_<timestamp>.csv` with a class avg/high/low summary row.

### Workflow on paper
Generate a **blank** sheet (Upload → Generate → Blank): it has empty Name/Reg
fields and the answer-key QR. Print, students hand-write their name/reg and fill
bubbles, then scan/photograph and upload (single) or drop a folder (Batch).

## Libraries
`react`, `react-dom`, `jsqr` (QR), `tesseract.js` (OCR), `qrcode` (sheet
generation). Dev/CLI: `vite`, `pngjs`, `jpeg-js`. CSV export and charts are
hand-rolled (no extra deps).

## Project structure
```
src/
  lib/   quizQr, sheetLayout, omrCore (CV), omr (browser), ocr, grade, csv, scan, qr, sampleSheet
  components/  upload, review, results, batch, dashboard, quizzes, students, common
  store/  db.js, AppContext.jsx
public/db.json          seed database (quizzes / students / results)
scripts/  grade.mjs, batch.mjs, makeTestSheet.mjs   (CLI, reuse src/lib)
samples/  test sheet images        output/  sample CSV
```

## Notes & limits
- OCR on **handwriting** is best-effort (tesseract); the Review step lets you
  fix Name/Reg, which keeps the data accurate. First OCR run downloads a model.
- Real OMR is done against **our standardized sheet** (known corner marks). A
  photo must show all four corners; heavy skew/glare/cropping can defeat
  detection → it reports failure rather than inventing answers.
- The CSV from Node fixtures has blank Name/Reg (no rendered text); browser
  "Generate test sheet" produces sheets with printed names for OCR.
