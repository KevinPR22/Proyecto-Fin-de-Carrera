import type { jsPDF } from 'jspdf';

// Plantilla común de los reportes en PDF: encabezado, fecha y pie de página.

export function addReportHeader(doc: jsPDF, title: string, subtitle?: string) {
  const width = doc.internal.pageSize.getWidth();
  doc.setFillColor(20, 20, 20);
  doc.rect(0, 0, width, 72, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text(title, 40, 32);
  if (subtitle) {
    doc.setFontSize(10);
    doc.text(subtitle, 40, 52);
  }
  doc.setFontSize(9);
  doc.text(`Generado: ${new Date().toLocaleString('es-PE')}`, width - 40, 52, { align: 'right' });
  doc.setTextColor(0, 0, 0);
}

export function addReportFooter(doc: jsPDF, pageNumber: number) {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  doc.setDrawColor(200, 200, 200);
  doc.line(40, height - 30, width - 40, height - 30);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Página ${pageNumber}`, width - 40, height - 16, { align: 'right' });
  doc.text('Sistema de Gestión de Inventario Multialmacén', 40, height - 16);
  doc.setTextColor(0, 0, 0);
}
