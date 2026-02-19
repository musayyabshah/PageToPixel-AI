export type PdfRenderedPage = {
  pageIndex: number;
  thumbnailDataUrl: string;
  text: string;
};

export type ParsedPdf = {
  pages: PdfRenderedPage[];
  totalPages: number;
  fullText: string;
};

const PREVIEW_PAGE_LIMIT = 10;

export async function parsePdf(file: File): Promise<ParsedPdf> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;

  const bytes = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const totalPages = pdf.numPages;

  const pages: PdfRenderedPage[] = [];
  const textParts: string[] = [];

  for (let i = 1; i <= totalPages; i += 1) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    textParts.push(`Page ${i}: ${pageText}`);

    if (i <= PREVIEW_PAGE_LIMIT) {
      const viewport = page.getViewport({ scale: 1.2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Canvas not available");
      }

      await page.render({ canvasContext: ctx, viewport }).promise;

      const thumbnailCanvas = document.createElement("canvas");
      const thumbScale = 220 / viewport.width;
      thumbnailCanvas.width = 220;
      thumbnailCanvas.height = Math.max(120, viewport.height * thumbScale);
      const thumbCtx = thumbnailCanvas.getContext("2d");

      if (!thumbCtx) {
        throw new Error("Thumbnail canvas not available");
      }

      thumbCtx.drawImage(canvas, 0, 0, thumbnailCanvas.width, thumbnailCanvas.height);

      pages.push({
        pageIndex: i - 1,
        thumbnailDataUrl: thumbnailCanvas.toDataURL("image/png"),
        text: pageText
      });
    }
  }

  return {
    pages,
    totalPages,
    fullText: textParts.join("\n\n")
  };
}
