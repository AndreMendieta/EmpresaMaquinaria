const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Buffer } = require('node:buffer');
const { createCompanyReport } = require('../src/v2/utils/companyReportPdf');

function collectPdf(document) {
  return new Promise(function (resolve, reject) {
    const chunks = [];
    document.on('data', function (chunk) { chunks.push(chunk); });
    document.on('end', function () { resolve(Buffer.concat(chunks)); });
    document.on('error', reject);
  });
}

test('creates a valid PDF containing grouped machine, part, and order data', function () {
  const document = createCompanyReport({
    machines: [{ id: 'machine-1', codigo: 'EX-01', nombre: 'Excavadora', tipo: 'Pesada', estado: 'activa' }],
    pieces: [{
      maquinaria_id: 'machine-1',
      codigo: 'P-01',
      nombre: 'Manguera hidráulica',
      tipo: 'manguera',
      estado_validacion: 'validada',
      especificaciones: { diametro: '20 mm', longitud: '2 m' },
    }],
    orders: [{
      numero_orden: 'OT-01',
      maquinaria_id: 'machine-1',
      titulo: 'Mantenimiento preventivo',
      estado: 'abierta',
      prioridad: 'normal',
    }],
  });

  return collectPdf(document).then(function (pdf) {
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    assert.equal(pdf.includes(Buffer.from('%%EOF')), true);
    assert.ok(pdf.length > 1000);
  });
});