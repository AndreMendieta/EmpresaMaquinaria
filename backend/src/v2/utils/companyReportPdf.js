const PDFDocument = require('pdfkit');

const COLORS = {
  navy: '#0F172A',
  orange: '#FF6A00',
  text: '#1E293B',
  muted: '#64748B',
  panel: '#F1F5F9',
  line: '#E2E8F0',
  white: '#FFFFFF',
};

const STATUS_COLORS = {
  validada: '#10B981',
  aprobada: '#10B981',
  completada: '#10B981',
  activa: '#10B981',
  pendiente: '#F59E0B',
  abierta: '#F59E0B',
  en_proceso: '#0EA5E9',
  rechazada: '#EF4444',
  cancelada: '#EF4444',
  borrador: '#64748B',
};

const TECHNICAL_FIELD_LABELS = {
  diametro: 'Diámetro',
  diametro_interior: 'Diámetro interior',
  diametro_exterior: 'Diámetro exterior',
  longitud: 'Longitud',
  presion: 'Presión',
  presion_trabajo: 'Presión de trabajo',
  tipo_conexion: 'Tipo de conexión',
  terminales: 'Terminales',
  material: 'Material',
  rosca: 'Rosca',
  tolerancia: 'Tolerancia',
  planos: 'Planos',
  evidencia: 'Evidencia',
  adicionales: 'Adicionales',
  diametro_camisa: 'Diámetro de camisa',
  diametro_vastago: 'Diámetro de vástago',
  carrera: 'Carrera',
  tipo_sello: 'Tipo de sello',
  camisa: 'Camisa',
  vastago: 'Vástago',
  medida_tapa: 'Medida de tapa',
  medida_piston: 'Medida de pistón',
  empaques: 'Empaques',
  ojo: 'Ojo',
  pasadores: 'Pasadores',
  recorrido_salida: 'Recorrido de salida',
  racores_llenado: 'Racores de llenado',
};

const HIDDEN_SUBTYPE_FIELDS = new Set([
  'id',
  'pieza_id',
  'empresa_prestadora_id',
  'creado_en',
  'actualizado_en',
]);

const ATTACHMENT_FIELDS = new Set(['planos', 'evidencia']);

function attachmentSummary(value) {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      const names = parsed.map((item) => item && item.name).filter(Boolean);
      return names.length ? `${names.length} archivo(s): ${names.join(', ')}` : '';
    }
  } catch {
    // Valor antiguo en texto plano
  }
  return String(value);
}

function printableValue(value, key) {
  if (value === null || value === undefined || value === '') return '';
  if (ATTACHMENT_FIELDS.has(key) && typeof value === 'string') return attachmentSummary(value);
  if (Array.isArray(value)) return value.map((item) => printableValue(item)).filter(Boolean).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value).replace(/\s+/g, ' ').trim();
}

function displayLabel(key) {
  return TECHNICAL_FIELD_LABELS[key] || key.replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase());
}

function contentWidth(doc) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function ensureSpace(doc, height) {
  if (doc.y + height > doc.page.height - doc.page.margins.bottom - 24) doc.addPage();
}

function formatStatus(status) {
  return String(status || '').replace(/_/g, ' ').toUpperCase();
}

function statusColor(status) {
  return STATUS_COLORS[String(status || '').toLowerCase()] || COLORS.muted;
}

function drawChip(doc, text, x, y, color) {
  const label = formatStatus(text);
  if (!label) return 0;
  doc.font('Helvetica-Bold').fontSize(7);
  const width = doc.widthOfString(label) + 14;
  doc.roundedRect(x, y, width, 14, 7).fill(color);
  doc.fillColor(COLORS.white).text(label, x, y + 3.5, { width, align: 'center', lineBreak: false });
  return width;
}

function drawHeader(doc, { companyName, logo, generatedAt }) {
  const { left } = doc.page.margins;
  const width = contentWidth(doc);
  const bandHeight = 92;

  doc.rect(0, 0, doc.page.width, bandHeight).fill(COLORS.navy);
  doc.rect(0, bandHeight, doc.page.width, 4).fill(COLORS.orange);

  let textX = left;
  if (logo) {
    try {
      doc.roundedRect(left, 18, 56, 56, 8).fill(COLORS.white);
      doc.image(logo, left + 4, 22, { fit: [48, 48], align: 'center', valign: 'center' });
      textX = left + 72;
    } catch {
      // Formato de imagen no soportado: se omite el logo
    }
  }

  doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(20)
    .text(companyName || 'HydroTech', textX, 24, { width: width - (textX - left), lineBreak: false });
  doc.fillColor(COLORS.orange).font('Helvetica-Bold').fontSize(11)
    .text('REPORTE DE OPERACIONES', textX, 50, { lineBreak: false });
  doc.fillColor('#CBD5E1').font('Helvetica').fontSize(9)
    .text(`Generado: ${generatedAt.toLocaleString('es-MX')}`, textX, 67, { lineBreak: false });

  doc.y = bandHeight + 22;
  doc.x = left;
}

function drawSummary(doc, totals) {
  const { left } = doc.page.margins;
  const gap = 10;
  const boxWidth = (contentWidth(doc) - gap * (totals.length - 1)) / totals.length;
  const top = doc.y;

  totals.forEach((item, index) => {
    const x = left + index * (boxWidth + gap);
    doc.roundedRect(x, top, boxWidth, 52, 8).fill(COLORS.panel);
    doc.rect(x, top + 10, 3, 32).fill(COLORS.orange);
    doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(20)
      .text(String(item.value), x + 14, top + 8, { width: boxWidth - 20, lineBreak: false });
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(9)
      .text(item.label, x + 14, top + 33, { width: boxWidth - 20, lineBreak: false });
  });

  doc.y = top + 52 + 18;
  doc.x = left;
}

function drawSectionTitle(doc, text) {
  ensureSpace(doc, 30);
  const { left } = doc.page.margins;
  doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(9)
    .text(text.toUpperCase(), left, doc.y + 4, { width: contentWidth(doc), characterSpacing: 0.8 });
  doc.moveTo(left, doc.y + 2).lineTo(left + contentWidth(doc), doc.y + 2).strokeColor(COLORS.line).lineWidth(1).stroke();
  doc.y += 8;
  doc.x = left;
}

function drawMachine(doc, machine) {
  ensureSpace(doc, 80);
  const { left } = doc.page.margins;
  const width = contentWidth(doc);
  const top = doc.y + 6;

  const meta = [
    machine.tipo && `Tipo: ${machine.tipo}`,
    machine.numero_serie && `Serie: ${machine.numero_serie}`,
    machine.cliente_nombre && `Cliente: ${machine.cliente_nombre}`,
  ].filter(Boolean).join('   •   ');

  doc.roundedRect(left, top, width, 46, 8).fill(COLORS.navy);
  doc.rect(left, top, 5, 46).fill(COLORS.orange);
  doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(13)
    .text(`[${machine.codigo}] ${machine.nombre}`, left + 16, top + 8, { width: width - 130, lineBreak: false, ellipsis: true });
  doc.fillColor('#CBD5E1').font('Helvetica').fontSize(8.5)
    .text(meta || ' ', left + 16, top + 28, { width: width - 130, lineBreak: false, ellipsis: true });
  if (machine.estado) drawChip(doc, machine.estado, left + width - 94, top + 16, statusColor(machine.estado));

  doc.y = top + 46 + 8;
  doc.x = left;
  if (machine.descripcion) {
    doc.fillColor(COLORS.muted).font('Helvetica-Oblique').fontSize(9)
      .text(machine.descripcion, left, doc.y, { width, lineGap: 2 });
    doc.moveDown(0.4);
  }
}

function drawCard(doc, { title, status, lines }) {
  const { left } = doc.page.margins;
  const width = contentWidth(doc) - 12;
  const x = left + 12;
  const innerWidth = width - 20;

  doc.font('Helvetica').fontSize(8.5);
  const bodyHeights = lines.map((line) => doc.heightOfString(line, { width: innerWidth, lineGap: 1.5 }) + 2);
  const bodyHeight = bodyHeights.reduce((sum, h) => sum + h, 0);
  const height = 28 + bodyHeight + 6;

  ensureSpace(doc, Math.min(height, 160));
  const top = doc.y + 4;

  doc.roundedRect(x, top, width, height, 6).fillAndStroke(COLORS.white, COLORS.line);
  doc.rect(x, top + 6, 3, height - 12).fill(statusColor(status));
  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(10)
    .text(title, x + 12, top + 8, { width: innerWidth - 90, lineBreak: false, ellipsis: true });
  if (status) drawChip(doc, status, x + width - 82, top + 8, statusColor(status));

  let cursor = top + 28;
  doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.text);
  lines.forEach((line, index) => {
    doc.text(line, x + 12, cursor, { width: innerWidth, lineGap: 1.5 });
    cursor += bodyHeights[index];
  });

  doc.y = top + height + 2;
  doc.x = left;
}

function pieceLines(piece) {
  const lines = [];
  if (piece.descripcion) lines.push(`Descripción: ${printableValue(piece.descripcion)}`);
  Object.entries(piece.especificaciones || {}).forEach(([key, value]) => {
    if (HIDDEN_SUBTYPE_FIELDS.has(key)) return;
    const formatted = printableValue(value, key);
    if (formatted) lines.push(`${displayLabel(key)}: ${formatted}`);
  });
  return lines.length ? lines : ['Sin especificaciones registradas.'];
}

function orderLines(order) {
  return [
    order.cliente_nombre && `Cliente: ${order.cliente_nombre}`,
    order.tecnico_nombre && `Técnico asignado: ${order.tecnico_nombre}`,
    order.prioridad && `Prioridad: ${order.prioridad}`,
    order.descripcion && `Descripción: ${printableValue(order.descripcion)}`,
    order.programada_en && `Programada: ${new Date(order.programada_en).toLocaleString('es-MX')}`,
    order.completada_en && `Completada: ${new Date(order.completada_en).toLocaleString('es-MX')}`,
  ].filter(Boolean);
}

function drawOrder(doc, order) {
  drawCard(doc, {
    title: `[${order.numero_orden}] ${order.titulo}`,
    status: order.estado,
    lines: orderLines(order).length ? orderLines(order) : ['Sin detalles adicionales.'],
  });
}

function drawEmpty(doc, text) {
  doc.fillColor(COLORS.muted).font('Helvetica-Oblique').fontSize(9)
    .text(text, doc.page.margins.left + 12, doc.y + 4, { width: contentWidth(doc) - 12 });
  doc.moveDown(0.5);
  doc.x = doc.page.margins.left;
}

function drawFooters(doc, companyName) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const { left, right } = doc.page.margins;
    const y = doc.page.height - 30;
    const width = doc.page.width - left - right;
    doc.page.margins.bottom = 0;
    doc.moveTo(left, y - 6).lineTo(left + width, y - 6).strokeColor(COLORS.line).lineWidth(1).stroke();
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8)
      .text(`${companyName || 'HydroTech'} • Reporte de operaciones`, left, y, { width: width / 2, lineBreak: false });
    doc.text(`Página ${i - range.start + 1} de ${range.count}`, left + width / 2, y, {
      width: width / 2,
      align: 'right',
      lineBreak: false,
    });
  }
}

function createCompanyReport({
  machines = [],
  pieces = [],
  orders = [],
  company = {},
  logo = null,
  generatedAt = new Date(),
}) {
  const companyName = company.nombre || 'HydroTech';
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 48, right: 40, bottom: 48, left: 40 },
    bufferPages: true,
    info: { Title: `Reporte de operaciones — ${companyName}`, Author: companyName },
  });
  const piecesByMachine = new Map();
  const ordersByMachine = new Map();

  pieces.forEach((piece) => {
    if (!piecesByMachine.has(piece.maquinaria_id)) piecesByMachine.set(piece.maquinaria_id, []);
    piecesByMachine.get(piece.maquinaria_id).push(piece);
  });
  orders.forEach((order) => {
    if (order.maquinaria_id) {
      if (!ordersByMachine.has(order.maquinaria_id)) ordersByMachine.set(order.maquinaria_id, []);
      ordersByMachine.get(order.maquinaria_id).push(order);
    }
  });

  drawHeader(doc, { companyName, logo, generatedAt });
  drawSummary(doc, [
    { label: 'Máquinas', value: machines.length },
    { label: 'Piezas', value: pieces.length },
    { label: 'Órdenes de trabajo', value: orders.length },
  ]);

  if (machines.length === 0) drawEmpty(doc, 'No hay máquinas registradas.');

  machines.forEach((machine) => {
    drawMachine(doc, machine);

    const machinePieces = piecesByMachine.get(machine.id) || [];
    drawSectionTitle(doc, `Piezas registradas (${machinePieces.length})`);
    if (!machinePieces.length) drawEmpty(doc, 'No hay piezas registradas para esta máquina.');
    machinePieces.forEach((piece) => drawCard(doc, {
      title: `[${piece.codigo}] ${piece.nombre} — ${piece.tipo}`,
      status: piece.estado_validacion,
      lines: pieceLines(piece),
    }));

    const machineOrders = ordersByMachine.get(machine.id) || [];
    drawSectionTitle(doc, `Órdenes de trabajo (${machineOrders.length})`);
    if (!machineOrders.length) drawEmpty(doc, 'No hay órdenes asociadas a esta máquina.');
    machineOrders.forEach((order) => drawOrder(doc, order));
    doc.moveDown(0.8);
  });

  const unassignedOrders = orders.filter((order) => !order.maquinaria_id);
  drawSectionTitle(doc, `Órdenes sin máquina asociada (${unassignedOrders.length})`);
  if (!unassignedOrders.length) drawEmpty(doc, 'No hay órdenes sin máquina asociada.');
  unassignedOrders.forEach((order) => drawOrder(doc, order));

  drawFooters(doc, companyName);
  doc.end();
  return doc;
}

module.exports = { createCompanyReport };
