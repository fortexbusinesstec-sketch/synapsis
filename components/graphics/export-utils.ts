import { toBlob, toSvg, toCanvas } from "html-to-image";

export interface ExportOptions {
  filename?: string;
  pixelRatio?: number;
  backgroundColor?: string;
}

const SHARED_OPTS = {
  cacheBust: true,
  fontEmbedCSS: "",
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ── PNG pHYs chunk helpers ── */

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function setPngDpi(blob: Blob, dpi: number): Promise<Blob> {
  return blob.arrayBuffer().then((buf) => {
    const bytes = new Uint8Array(buf);
    const dpm = Math.round(dpi / 0.0254);

    const physData = new Uint8Array(9);
    physData[0] = (dpm >> 24) & 0xff;
    physData[1] = (dpm >> 16) & 0xff;
    physData[2] = (dpm >> 8) & 0xff;
    physData[3] = dpm & 0xff;
    physData[4] = (dpm >> 24) & 0xff;
    physData[5] = (dpm >> 16) & 0xff;
    physData[6] = (dpm >> 8) & 0xff;
    physData[7] = dpm & 0xff;
    physData[8] = 1;

    const type = new TextEncoder().encode("pHYs");
    const chunk = new Uint8Array(4 + type.length + physData.length + 4);
    const lenView = new DataView(chunk.buffer);
    lenView.setUint32(0, physData.length);
    chunk.set(type, 4);
    chunk.set(physData, 8);
    const crcVal = crc32(chunk.subarray(4, 8 + physData.length));
    lenView.setUint32(8 + physData.length, crcVal);

    let pos = 8;
    while (pos < bytes.length) {
      const view = new DataView(bytes.buffer, pos);
      const len = view.getUint32(0);
      const typeStr = String.fromCharCode(bytes[pos + 4], bytes[pos + 5], bytes[pos + 6], bytes[pos + 7]);
      if (typeStr === "IDAT") break;
      pos += 12 + len;
    }

    const result = new Uint8Array(bytes.length + chunk.length);
    result.set(bytes.subarray(0, pos));
    result.set(chunk, pos);
    result.set(bytes.subarray(pos), pos + chunk.length);
    return new Blob([result], { type: "image/png" });
  });
}

/* ── Exports ── */

export async function exportToPng(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<void> {
  const blob = await toBlob(element, {
    ...SHARED_OPTS,
    pixelRatio: options.pixelRatio ?? 2,
    backgroundColor: options.backgroundColor ?? "#ffffff",
  });
  if (!blob) throw new Error("toBlob returned null");
  downloadBlob(blob, `${options.filename || "graphic"}.png`);
}

export async function exportToSvg(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<void> {
  const dataUrl = await toSvg(element, {
    ...SHARED_OPTS,
    backgroundColor: options.backgroundColor ?? "#ffffff",
  });
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  downloadBlob(blob, `${options.filename || "graphic"}.svg`);
}

export async function exportToPng300dpi(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<void> {
  const canvas = await toCanvas(element, {
    ...SHARED_OPTS,
    pixelRatio: 1,
    backgroundColor: options.backgroundColor ?? "#ffffff",
  });
  const raw: Blob | null = await new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
  if (!raw) throw new Error("canvas.toBlob returned null");
  const blob = await setPngDpi(raw, 300);
  downloadBlob(blob, `${options.filename || "graphic"}-300dpi.png`);
}
