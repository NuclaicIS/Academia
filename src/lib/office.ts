// Browser-side document conversion helpers for the Document Keeper.
// Everything runs in the user's browser — no server, no LibreOffice. Heavy
// libraries are imported dynamically so they only load when actually needed.

// ---------- Spreadsheets (.xlsx) via SheetJS ----------

export interface Grid {
  name: string;       // sheet name
  rows: string[][];   // 2D array of cell text
}

// Parse an .xlsx (base64) into editable grids — one per worksheet.
export async function xlsxToGrids(base64: string): Promise<Grid[]> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(base64, { type: 'base64' });
  return wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<string[]>(ws, {
      header: 1,
      blankrows: false,
      defval: '',
      raw: false,
    });
    return { name, rows: rows.map((r) => r.map((c) => (c == null ? '' : String(c)))) };
  });
}

// Build an .xlsx (base64) from edited grids.
export async function gridsToXlsx(grids: Grid[]): Promise<string> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  grids.forEach((g, i) => {
    const ws = XLSX.utils.aoa_to_sheet(g.rows.length ? g.rows : [['']]);
    XLSX.utils.book_append_sheet(wb, ws, g.name || `Sheet${i + 1}`);
  });
  return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
}

// A blank 12x6 spreadsheet for the "new spreadsheet" maker.
export async function blankXlsx(): Promise<string> {
  const rows = Array.from({ length: 12 }, () => Array.from({ length: 6 }, () => ''));
  return gridsToXlsx([{ name: 'Sheet1', rows }]);
}

// ---------- Word documents (.docx) ----------

// Render a .docx (base64) into HTML inside the given container element.
export async function renderDocx(base64: string, container: HTMLElement): Promise<void> {
  const { renderAsync } = await import('docx-preview');
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  container.innerHTML = '';
  await renderAsync(new Blob([bytes]), container, undefined, {
    className: 'docx',
    inWrapper: false,
    ignoreWidth: true,
    ignoreHeight: true,
  });
}

// Build a .docx (base64) from plain text — each line becomes a paragraph.
export async function textToDocx(text: string): Promise<string> {
  const { Document, Packer, Paragraph, TextRun } = await import('docx');
  const lines = text.split('\n');
  const doc = new Document({
    sections: [{
      children: lines.map(
        (line) => new Paragraph({ children: [new TextRun(line)] }),
      ),
    }],
  });
  const blob = await Packer.toBlob(doc);
  return blobToBase64(blob);
}

// ---------- shared helpers ----------

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',').pop() || '');
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export function textToBase64(text: string): string {
  // Handle Unicode safely (btoa alone breaks on non-Latin1 chars).
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin);
}

export function base64ToText(base64: string): string {
  const bin = atob(base64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
