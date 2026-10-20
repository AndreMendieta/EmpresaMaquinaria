const PDFDocument = require('pdfkit');

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

function printableValue(value) {
  if (value === null || value === undefined || value === '') return '';
  if (Array.isArray(value)) return value.map(printableValue).filter(Boolean).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value).replace(/\s+/g, ' ').trim();
}

function displayLabel(key) {
  return TECHNICAL_FIELD_LABELS[key] || key.replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase());
}

function addField(doc, label, value) {
  const formatted = printableValue(value);
  if (!formatted) return;

  const text = `${label}: ${formatted}`;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc.font('Helvetica').fontSize(9);
  const height = doc.heightOfString(text, { width, lineGap: 2 });
  if (doc.y + height + 4 > doc.page.height - doc.page.margins.bottom) doc.addPage();
  doc.text(text, { width, lineGap: 2 });
  doc.moveDown(0.2);
}

function addHeading(doc, text, level = 'section') {
  const sizes = { title: 19, machine: 14, section: 11, item: 10 };
  const size = sizes[level] || sizes.section;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc.font('Helvetica-Bold').fontSize(size);
  const height = doc.heightOfString(text, { width });
  if (doc.y + height + 8 > doc.page.height - doc.page.margins.bottom) doc.addPage();
  doc.moveDown(level === 'title' ? 0 : 0.5);
  doc.text(text, { width });
  doc.moveDown(level === 'title' ? 0.7 : 0.25);
}

function addTechnicalSpecifications(doc, specifications) {
  Object.entries(specifications || {}).forEach(([key, value]) => {
    if (!HIDDEN_SUBTYPE_FIELDS.has(key)) addField(doc, displayLabel(key), value);
  });
}

function addOrder(doc, order) {
  addHeading(doc, `[${order.numero_orden}] ${order.titulo}`, 'item');
  addField(doc, 'Estado', order.estado);
  addField(doc, 'Prioridad', order.prioridad);
  addField(doc, 'Cliente', order.cliente_nombre);
  addField(doc, 'Técnico asignado', order.tecnico_nombre);
  addField(doc, 'Descripción', order.descripcion);
  addField(doc, 'Programada', order.programada_en);
  addField(doc, 'Completada', order.completada_en);
}

function createCompanyReport({ machines = [], pieces = [], orders = [], generatedAt = new Date() }) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 48, right: 48, bottom: 48, left: 48 },
    info: { Title: 'Reporte de maquinaria, piezas y órdenes', Author: 'HydroTech' },
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

  addHeading(doc, 'HydroTech — Reporte de operaciones', 'title');
  addField(doc, 'Generado', generatedAt.toLocaleString('es-MX'));
  addField(doc, 'Totales', `${machines.length} máquinas, ${pieces.length} piezas y ${orders.length} órdenes`);

  if (machines.length === 0) addField(doc, 'Maquinaria', 'No hay máquinas registradas.');

  machines.forEach((machine) => {
    addHeading(doc, `[${machine.codigo}] ${machine.nombre}`, 'machine');
    addField(doc, 'Tipo', machine.tipo);
    addField(doc, 'Número de serie', machine.numero_serie);
    addField(doc, 'Estado', machine.estado);
    addField(doc, 'Cliente', machine.cliente_nombre);
    addField(doc, 'Descripción', machine.descripcion);

    const machinePieces = piecesByMachine.get(machine.id) || [];
    addHeading(doc, `Piezas registradas (${machinePieces.length})`);
    if (!machinePieces.length) addField(doc, 'Piezas', 'No hay piezas registradas para esta máquina.');
    machinePieces.forEach((piece) => {
      addHeading(doc, `[${piece.codigo}] ${piece.nombre} — ${piece.tipo}`, 'item');
      addField(doc, 'Validación', piece.estado_validacion);
      addField(doc, 'Descripción', piece.descripcion);
      addTechnicalSpecifications(doc, piece.especificaciones);
    });

    const machineOrders = ordersByMachine.get(machine.id) || [];
    addHeading(doc, `Órdenes de trabajo (${machineOrders.length})`);
    if (!machineOrders.length) addField(doc, 'Órdenes', 'No hay órdenes asociadas a esta máquina.');
    machineOrders.forEach((order) => addOrder(doc, order));
  });

  const unassignedOrders = orders.filter((order) => !order.maquinaria_id);
  addHeading(doc, `Órdenes sin máquina asociada (${unassignedOrders.length})`);
  if (!unassignedOrders.length) addField(doc, 'Órdenes', 'No hay órdenes sin máquina asociada.');
  unassignedOrders.forEach((order) => addOrder(doc, order));

  doc.end();
  return doc;
}

module.exports = { createCompanyReport };