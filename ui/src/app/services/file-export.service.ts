import { Injectable } from '@angular/core';

export interface ExportTableData {
  title: string;
  headers: string[];
  rows: string[][];
}

@Injectable({
  providedIn: 'root',
})
export class FileExportService {
  private fileStamp(): string {
    return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  }

  private escapeHtml(s: string): string {
    return (s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  exportToCsv(table: ExportTableData, filenamePrefix = 'pmo-portfolio'): void {
    const lines = [
      table.headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
      ...table.rows.map((row) =>
        row.map((cell) => `"${(cell || '').replace(/"/g, '""')}"`).join(','),
      ),
    ];
    const csvContent = '\ufeff' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, `${filenamePrefix}-${this.fileStamp()}.csv`);
  }

  async exportToExcel(table: ExportTableData, filenamePrefix = 'pmo-portfolio'): Promise<void> {
    const esc = this.escapeHtml;
    const head = table.headers
      .map(
        (h) =>
          `<th style="background-color:#102644;color:#ffffff;font-weight:bold;border:1px solid #dce1e6;padding:6px 10px;">${esc(h)}</th>`,
      )
      .join('');
    const body = table.rows
      .map(
        (r) =>
          `<tr>${r.map((c) => `<td style="border:1px solid #dce1e6;padding:4px 8px;">${esc(c)}</td>`).join('')}</tr>`,
      )
      .join('');
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="utf-8"/></head>
        <body>
          <h2>${esc(table.title)}</h2>
          <table border="1">${head}${body}</table>
        </body>
      </html>`;
    const blob = new Blob(['\ufeff' + html], {
      type: 'application/vnd.ms-excel;charset=utf-8;',
    });
    this.downloadBlob(blob, `${filenamePrefix}-${this.fileStamp()}.xls`);
  }

  async exportToWord(table: ExportTableData, filenamePrefix = 'pmo-portfolio'): Promise<void> {
    const esc = this.escapeHtml;
    const head = table.headers
      .map(
        (h) =>
          `<th style="background:#102644;color:#fff;padding:6px 10px;border:1px solid #dce1e6;text-align:left;">${esc(h)}</th>`,
      )
      .join('');
    const body = table.rows
      .map(
        (r) =>
          `<tr>${r.map((c) => `<td style="padding:6px 10px;border:1px solid #dce1e6;">${esc(c)}</td>`).join('')}</tr>`,
      )
      .join('');
    const html = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head>`
      + `<body style="font-family:Segoe UI,Arial,sans-serif;">`
      + `<h1 style="color:#102644;">${esc(table.title)}</h1>`
      + `<table style="border-collapse:collapse;width:100%;font-family:Segoe UI,Arial,sans-serif;font-size:12px;"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
      + `</body></html>`;
    const blob = new Blob(['\ufeff' + html], { type: 'application/msword;charset=utf-8;' });
    this.downloadBlob(blob, `${filenamePrefix}-${this.fileStamp()}.doc`);
  }

  async exportToPowerPoint(table: ExportTableData, filenamePrefix = 'pmo-portfolio'): Promise<void> {
    const esc = this.escapeHtml;
    const rowsHtml = table.rows
      .slice(0, 15)
      .map(
        (r) =>
          `<tr>${r.slice(0, 6).map((c) => `<td style="border:1px solid #ccc;padding:4px;">${esc(c)}</td>`).join('')}</tr>`,
      )
      .join('');
    const headHtml = table.headers
      .slice(0, 6)
      .map((h) => `<th style="background:#0078D4;color:#fff;padding:4px;">${esc(h)}</th>`)
      .join('');

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:p="urn:schemas-microsoft-com:office:powerpoint">
        <head><meta charset="utf-8"/></head>
        <body style="font-family:Segoe UI,sans-serif;padding:24px;">
          <h1 style="color:#0078D4;">${esc(table.title)}</h1>
          <table border="1" style="border-collapse:collapse;width:100%;font-size:11px;">
            <thead><tr>${headHtml}</tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>`;
    const blob = new Blob(['\ufeff' + html], {
      type: 'application/vnd.ms-powerpoint;charset=utf-8;',
    });
    this.downloadBlob(blob, `${filenamePrefix}-${this.fileStamp()}.ppt`);
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
