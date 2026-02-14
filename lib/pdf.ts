import { MAX_PAGE_LIMIT } from "./config";

export type PdfRenderedPage = {
  pageIndex: number;
  imageBase64: string;
  thumbnailDataUrl: string;
  width: number;
  height: number;
};

export async function renderPdfPages(file: File, pagesToProcess: number): Promise<{ pages: PdfRenderedPage[]; totalPages: number }> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;

  const bytes = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const totalPages = pdf.numPages;
  const limit = Math.min(Math.max(1, pagesToProcess), MAX_PAGE_LIMIT, totalPages);

  const pages: PdfRenderedPage[] = [];

  for (let i = 1; i <= limit; i += 1) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
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

    const fullDataUrl = canvas.toDataURL("image/png");
    const base64 = fullDataUrl.split(",")[1] ?? "";

    pages.push({
      pageIndex: i - 1,
      imageBase64: base64,
      thumbnailDataUrl: thumbnailCanvas.toDataURL("image/png"),
      width: viewport.width,
      height: viewport.height
    });
  }

  return { pages, totalPages };
}
