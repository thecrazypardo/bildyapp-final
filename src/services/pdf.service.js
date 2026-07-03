// Generación de albaranes en PDF con pdfkit (T13).

import PDFDocument from 'pdfkit';

const streamToBuffer = (doc) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

export const generateDeliveryNotePdf = async ({ deliveryNote, user, client, project, company }) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const bufferPromise = streamToBuffer(doc);

  doc.fontSize(20).text('ALBARÁN', { align: 'right' });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#555').text(`Nº ${deliveryNote._id}`, { align: 'right' });
  doc.moveDown(1.5);

  // Datos de la compañía / usuario
  doc.fillColor('#000').fontSize(12).text(company?.name || 'Compañía');
  doc.fontSize(9).fillColor('#555');
  if (company?.cif) doc.text(`CIF: ${company.cif}`);
  doc.text(`Emitido por: ${user.fullName || user.email}`);
  doc.moveDown(1);

  // Datos del cliente
  doc.fillColor('#000').fontSize(12).text('Cliente');
  doc.fontSize(9).fillColor('#555');
  doc.text(client?.name || '-');
  if (client?.cif) doc.text(`CIF: ${client.cif}`);
  if (client?.email) doc.text(client.email);
  doc.moveDown(1);

  // Datos del proyecto
  doc.fillColor('#000').fontSize(12).text('Proyecto');
  doc.fontSize(9).fillColor('#555');
  doc.text(`${project?.name || '-'} (${project?.projectCode || '-'})`);
  doc.moveDown(1);

  // Detalle del albarán
  doc.fillColor('#000').fontSize(12).text('Detalle');
  doc.fontSize(9).fillColor('#555');
  doc.text(`Fecha de trabajo: ${new Date(deliveryNote.workDate).toLocaleDateString('es-ES')}`);
  doc.text(`Tipo: ${deliveryNote.format === 'hours' ? 'Horas trabajadas' : 'Materiales'}`);
  if (deliveryNote.description) doc.text(`Descripción: ${deliveryNote.description}`);
  doc.moveDown(0.5);

  if (deliveryNote.format === 'material') {
    doc.text(`Material: ${deliveryNote.material}`);
    doc.text(`Cantidad: ${deliveryNote.quantity} ${deliveryNote.unit}`);
  } else {
    if (deliveryNote.hours) doc.text(`Horas: ${deliveryNote.hours}`);
    if (deliveryNote.workers?.length) {
      doc.moveDown(0.3);
      doc.text('Trabajadores:');
      deliveryNote.workers.forEach((w) => doc.text(`  • ${w.name} — ${w.hours}h`));
    }
  }

  doc.moveDown(2);

  // Firma
  doc.fillColor('#000').fontSize(12).text('Firma');
  if (deliveryNote.signed && deliveryNote.signatureUrl) {
    doc.fontSize(9).fillColor('#555').text(`Firmado el ${new Date(deliveryNote.signedAt).toLocaleString('es-ES')}`);
    doc.text(`Imagen de firma: ${deliveryNote.signatureUrl}`);
  } else {
    doc.fontSize(9).fillColor('#999').text('Pendiente de firma');
  }

  doc.end();
  return bufferPromise;
};
