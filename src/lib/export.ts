/** Shared export helpers for the admin reports. */

export type Cell = string | number | null | undefined;

function escapeCsv(value: Cell): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** UTF-8 BOM + CRLF so Excel opens the file with ₹ intact. */
export function downloadCsv(filename: string, headers: string[], rows: Cell[][]) {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsv).join(','));
  const blob = new Blob([`﻿${lines.join('\r\n')}`], {
    type: 'text/csv;charset=utf-8;',
  });
  triggerDownload(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

function escapeHtml(value: Cell): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * An HTML-table workbook that Excel and LibreOffice open natively — keeps the
 * column headers bold and the ₹ amounts readable without a parser step.
 */
export function downloadExcel(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: Cell[][],
) {
  const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
  const body = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
    .join('');
  const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head>
<meta charset="utf-8" />
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>${escapeHtml(sheetName)}</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>th{background:#E4D3A9;text-align:left;font-weight:bold}td,th{border:1px solid #B4B1A9;padding:4px 6px}</style>
</head><body><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
  const blob = new Blob([`﻿${html}`], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  triggerDownload(blob, filename.endsWith('.xls') ? filename : `${filename}.xls`);
}

/**
 * PDF via the browser's own print-to-PDF. Avoids shipping a rendering engine
 * to every phone that opens the dashboard.
 */
export function printReport() {
  window.print();
}
