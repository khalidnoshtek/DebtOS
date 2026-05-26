"use client";

export type ExtractedFile = {
  filename: string;
  kind: "text" | "csv" | "xlsx" | "pdf" | "image" | "code";
  text: string;
  bytes: number;
};

const TEXT_EXTS = new Set([".txt", ".md", ".log"]);
const CODE_EXTS = new Set([".js", ".ts", ".tsx", ".jsx", ".py", ".rb", ".go", ".rs", ".java", ".cs", ".php", ".sh", ".sql", ".yaml", ".yml", ".json", ".html", ".css"]);
const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"]);

function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

export function classify(file: File): ExtractedFile["kind"] {
  const ext = extOf(file.name);
  if (ext === ".xlsx" || ext === ".xls" || file.type.includes("spreadsheet")) return "xlsx";
  if (ext === ".pdf" || file.type === "application/pdf") return "pdf";
  if (ext === ".csv" || file.type === "text/csv") return "csv";
  if (IMAGE_EXTS.has(ext) || file.type.startsWith("image/")) return "image";
  if (CODE_EXTS.has(ext)) return "code";
  if (TEXT_EXTS.has(ext) || file.type.startsWith("text/")) return "text";
  return "text";
}

export async function extractFile(file: File, onProgress?: (msg: string) => void): Promise<ExtractedFile> {
  const kind = classify(file);
  onProgress?.(`Reading ${file.name}…`);

  switch (kind) {
    case "xlsx": {
      onProgress?.("Parsing spreadsheet…");
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const parts: string[] = [];
      for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        if (csv.trim()) {
          parts.push(`### Sheet: ${sheetName}\n${csv}`);
        }
      }
      return { filename: file.name, kind, text: parts.join("\n\n"), bytes: file.size };
    }

    case "pdf": {
      onProgress?.("Extracting PDF text…");
      const pdfjs = await import("pdfjs-dist");
      // Use unpkg-hosted worker — works in static GH Pages
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
      const buf = await file.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: buf }).promise;
      const pages: string[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        onProgress?.(`Extracting page ${i}/${doc.numPages}…`);
        const page = await doc.getPage(i);
        const tc = await page.getTextContent();
        const text = tc.items.map((it) => ("str" in it ? (it as { str: string }).str : "")).join(" ");
        if (text.trim()) pages.push(`### Page ${i}\n${text}`);
      }
      return { filename: file.name, kind, text: pages.join("\n\n"), bytes: file.size };
    }

    case "image": {
      onProgress?.("Loading OCR engine (one-time ~3MB)…");
      const Tesseract = (await import("tesseract.js")).default;
      onProgress?.("Reading text from image…");
      const url = URL.createObjectURL(file);
      try {
        const result = await Tesseract.recognize(url, "eng", {
          logger: (m) => {
            if (m.status === "recognizing text") {
              onProgress?.(`OCR ${Math.round(m.progress * 100)}%`);
            }
          },
        });
        return { filename: file.name, kind, text: result.data.text.trim(), bytes: file.size };
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    case "text":
    case "code":
    case "csv":
    default: {
      const text = await file.text();
      return { filename: file.name, kind, text, bytes: file.size };
    }
  }
}

export function attachmentsToPrompt(items: ExtractedFile[]): string {
  if (items.length === 0) return "";
  const blocks = items.map((it) => {
    const fence = it.kind === "code" ? "```" : "";
    return `--- Attachment: ${it.filename} (${it.kind}) ---\n${fence}\n${it.text}\n${fence}`.trim();
  });
  return blocks.join("\n\n") + "\n\n";
}
