import { Injectable, inject } from '@angular/core';
import { ConfigService } from './config.service';

export interface ExportTableData {
  title: string;
  headers: string[];
  rows: string[][];
}

@Injectable({
  providedIn: 'root',
})
export class FileExportService {
  private readonly configService = inject(ConfigService);

  private fileStamp(): string {
    return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  }

  private getFilenamePrefix(overridePrefix?: string): string {
    return overridePrefix ?? this.configService.config.table?.exportFileName ?? 'pmo-portfolio';
  }

  private escapeHtml(s: string): string {
    return (s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  exportToCsv(table: ExportTableData, filenamePrefix?: string): void {
    const prefix = this.getFilenamePrefix(filenamePrefix);
    const lines = [
      table.headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
      ...table.rows.map((row) =>
        row.map((cell) => `"${(cell || '').replace(/"/g, '""')}"`).join(','),
      ),
    ];
    const csvContent = '\ufeff' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, `${prefix}-${this.fileStamp()}.csv`);
  }

  async exportToExcel(table: ExportTableData, filenamePrefix?: string): Promise<void> {
    const prefix = this.getFilenamePrefix(filenamePrefix);
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      const wsData = [table.headers, ...table.rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, (table.title || 'Export').slice(0, 31));
      const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([out], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      this.downloadBlob(blob, `${prefix}-${this.fileStamp()}.xlsx`);
    } catch {
      // Fallback HTML table
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
      this.downloadBlob(blob, `${prefix}-${this.fileStamp()}.xls`);
    }
  }

  async exportToWord(table: ExportTableData, filenamePrefix?: string): Promise<void> {
    const prefix = this.getFilenamePrefix(filenamePrefix);
    try {
      const docx = await import('docx');
      const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, WidthType } = docx;

      const headerRow = new TableRow({
        tableHeader: true,
        children: table.headers.map(
          (h) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF' })] })],
              shading: { fill: '0078D4' },
            }),
        ),
      });

      const bodyRows = table.rows.map(
        (row) =>
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: cell })] })],
                }),
            ),
          }),
      );

      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                text: table.title,
                heading: HeadingLevel.HEADING_1,
              }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [headerRow, ...bodyRows],
              }),
            ],
          },
        ],
      });

      const buffer = await Packer.toBlob(doc);
      this.downloadBlob(buffer, `${prefix}-${this.fileStamp()}.docx`);
    } catch {
      // Fallback HTML doc
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
      const html =
        `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head>` +
        `<body style="font-family:Segoe UI,Arial,sans-serif;">` +
        `<h1 style="color:#102644;">${esc(table.title)}</h1>` +
        `<table style="border-collapse:collapse;width:100%;font-family:Segoe UI,Arial,sans-serif;font-size:12px;"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>` +
        `</body></html>`;
      const blob = new Blob(['\ufeff' + html], { type: 'application/msword;charset=utf-8;' });
      this.downloadBlob(blob, `${prefix}-${this.fileStamp()}.doc`);
    }
  }

  async exportToPowerPoint(table: ExportTableData, filenamePrefix?: string): Promise<void> {
    const prefix = this.getFilenamePrefix(filenamePrefix);
    try {
      const pptxgen = (await import('pptxgenjs')).default;
      const pptx = new pptxgen();
      pptx.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 });
      pptx.layout = 'WIDE';

      const slide = pptx.addSlide();
      slide.addText(table.title, {
        x: 0.5,
        y: 0.4,
        w: 12.3,
        h: 0.6,
        fontSize: 22,
        bold: true,
        color: '0078D4',
      });

      const tableRows = [
        table.headers.slice(0, 8).map((h) => ({
          text: h,
          options: { bold: true, color: 'FFFFFF', fill: { color: '0078D4' } },
        })),
        ...table.rows.slice(0, 20).map((r) => r.slice(0, 8).map((c) => ({ text: c, options: {} }))),
      ];

      slide.addTable(tableRows as unknown as Parameters<typeof slide.addTable>[0], {
        x: 0.5,
        y: 1.2,
        w: 12.3,
        fontSize: 9,
        border: { type: 'solid', color: 'DCE1E6', pt: 1 },
      });

      const blob = (await pptx.write({ outputType: 'blob' })) as Blob;
      this.downloadBlob(blob, `${prefix}-${this.fileStamp()}.pptx`);
    } catch {
      // Fallback HTML ppt
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
      this.downloadBlob(blob, `${prefix}-${this.fileStamp()}.ppt`);
    }
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
