import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

function sanitize(name: string): string {
  return (name || "character").replace(/[^a-z0-9-_]+/gi, "_").toLowerCase();
}

async function renderPng(node: HTMLElement): Promise<string> {
  return toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "#100c09",
    style: { transform: "none" },
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Slice a single oversized image across multiple pages. Used only as a fallback
 * when one section is taller than a full usable page.
 */
function addSlicedImage(
  pdf: jsPDF,
  img: HTMLImageElement,
  x: number,
  startY: number,
  drawW: number,
  scale: number,
  usableH: number,
  margin: number
): void {
  const sliceHpx = usableH / scale;
  let yPx = 0;
  let y = startY;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  while (yPx < img.height) {
    const h = Math.min(sliceHpx, img.height - yPx);
    canvas.width = img.width;
    canvas.height = h;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, yPx, img.width, h, 0, 0, img.width, h);
    const slice = canvas.toDataURL("image/png");
    pdf.addImage(slice, "PNG", x, y, drawW, h * scale);
    yPx += h;
    if (yPx < img.height) {
      pdf.addPage();
      y = margin;
    }
  }
}

export async function exportPdf(node: HTMLElement, name: string): Promise<void> {
  const blocks = Array.from(
    node.querySelectorAll<HTMLElement>("[data-export-block]")
  );
  // Fallback: if the sheet wasn't tagged, capture the whole node as one block.
  const targets = blocks.length > 0 ? blocks : [node];

  const rendered = await Promise.all(
    targets.map(async (el) => loadImage(await renderPng(el)))
  );

  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const gap = 14;
  const usableW = pageW - margin * 2;
  const usableH = pageH - margin * 2;

  let y = margin;
  let firstOnPage = true;

  for (const img of rendered) {
    const scale = usableW / img.width;
    const drawH = img.height * scale;

    // A section taller than a whole page: slice just this section.
    if (drawH > usableH) {
      if (!firstOnPage) {
        pdf.addPage();
        y = margin;
      }
      addSlicedImage(pdf, img, margin, y, usableW, scale, usableH, margin);
      pdf.addPage();
      y = margin;
      firstOnPage = true;
      continue;
    }

    const needed = drawH + (firstOnPage ? 0 : gap);
    // Not enough room left on the current page: start a new one.
    if (!firstOnPage && y + needed > margin + usableH) {
      pdf.addPage();
      y = margin;
      firstOnPage = true;
    }

    if (!firstOnPage) y += gap;
    pdf.addImage(img, "PNG", margin, y, usableW, drawH);
    y += drawH;
    firstOnPage = false;
  }

  pdf.save(`${sanitize(name)}_character_sheet.pdf`);
}
