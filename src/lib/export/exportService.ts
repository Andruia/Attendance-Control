/**
 * Export service for CSV, Excel, and PDF generation.
 * Uses SheetJS (xlsx) for CSV/Excel and jsPDF for PDF.
 */

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type ExportFormat = "csv" | "xlsx" | "pdf";

export interface ExportOptions {
  format: ExportFormat;
  dateRange: { start: string; end: string };
  employeeFilter?: string[];
  departmentFilter?: string;
  statusFilter?: string;
}

export interface ExportRow {
  date: string;
  employeeName: string;
  employeeEmail?: string;
  department: string;
  clockIn: string;
  clockOut: string;
  breakDuration: string;
  totalHours: string;
  overtimeHours: string;
  status: string;
}

/**
 * Generate and download an attendance report.
 */
export function exportReport(rows: ExportRow[], options: ExportOptions): void {
  const filename = `attendance_${options.dateRange.start}_to_${options.dateRange.end}`;

  switch (options.format) {
    case "csv":
      downloadCSV(rows, filename);
      break;
    case "xlsx":
      downloadExcel(rows, filename);
      break;
    case "pdf":
      downloadPDF(rows, filename);
      break;
  }
}

function downloadCSV(rows: ExportRow[], filename: string): void {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  downloadFile(csv, `${filename}.csv`, "text/csv;charset=utf-8;");
}

function downloadExcel(rows: ExportRow[], filename: string): void {
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Auto-fit column widths
  const colWidths = Object.keys(rows[0] ?? {}).map((key) => ({
    wch: Math.max(key.length, 15),
  }));
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  downloadFile(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${filename}.xlsx`,
  );
}

function downloadPDF(rows: ExportRow[], filename: string): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFontSize(16);
  doc.text("Attendance Report", 14, 20);
  doc.setFontSize(10);
  doc.text(`Period: ${filename.replace("attendance_", "").replace(/_/g, " to ")}`, 14, 28);

  const headers = Object.keys(rows[0] ?? {}).map((key) =>
    key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
  );

  const data = rows.map((row) => Object.values(row));

  autoTable(doc, {
    head: [headers],
    body: data,
    startY: 34,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [109, 40, 217] },
  });

  doc.save(`${filename}.pdf`);
}

function downloadFile(content: Blob | string, filename: string, mimeType?: string): void {
  const blob =
    typeof content === "string"
      ? new Blob([content], { type: mimeType ?? "text/plain;charset=utf-8;" })
      : content;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
