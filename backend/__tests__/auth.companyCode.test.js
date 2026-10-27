const http = require('http');
const express = require('express');

process.env.JWT_SECRET = 'unit-test-secret';

const mockQuery = jest.fn();
const mockClientQuery = jest.fn();

jest.mock('../src/db/pool', () => ({
  query: (...args) => mockQuery(...args),
  connect: async () => ({query: (...args) => mockClientQuery(...args), release: jest.fn()}),
}));
jest.mock('../src/v2/utils/mailer', () => ({
  enviarCodigoVerificacion: jest.fn().mockResolvedValue({sent: true}),
  enviarCodigoRecuperacion: jest.fn().mockResolvedValue({sent: true}),
  enviarRecordatorioCuentas: jest.fn().mockResolvedValue({sent: true}),
}));
jest.mock('../src/v2/utils/audit', () => ({registrarAuditoria: jest.fn()}));

const authRoutes = require('../src/v2/routes/auth.routes');

const COMPANY_UUID = '11111111-2222-3333-4444-555555555555';

let server;
let port;

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        port,
        path: `/api/v2/auth${path}`,
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Content-Length': data.length},
      },
      res => {
        let raw = '';
        res.on('data', chunk => (raw += chunk));
        res.on('end', () => resolve({status: res.statusCode, body: raw ? JSON.parse(raw) : {}}));
      }
    );
    req.on('error', reject);
    req.end(data);
  });
}

beforeAll(done => {
  const app = express();
  app.use(express.json());
  app.use('/api/v2/auth', authRoutes);
  server = app.listen(0, () => {
    port = server.address().port;
    done();
  });
});

afterAll(() => {
  server.closeAllConnections();
  server.close();
});

beforeEach(() => {
  mockQuery.mockReset();
  mockClientQuery.mockReset();
});

const validBody = {
  razonSocial: 'Maquinaria S.A.',
  nombre: 'Ana Admin',
  correo: 'ana@example.com',
  password: 'Prueba12345',
  codigoEmpresa: 'maq01',
};

describe('registro con código de empresa', () => {
  test('rechaza un código con formato inválido', async () => {
    const res = await post('/register', {...validBody, codigoEmpresa: 'a b!'});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/código de empresa/i);
  });

  test('rechaza un código ya existente', async () => {
    mockClientQuery.mockResolvedValueOnce({rows: [{}]});
    const res = await post('/register', validBody);
    expect(res.status).toBe(409);
  });

  test('guarda el código en mayúsculas y lo devuelve', async () => {
    mockClientQuery.mockImplementation(async sql => {
      if (/SELECT 1 FROM empresas_prestadoras/.test(sql)) return {rows: []};
      if (/INSERT INTO empresas_prestadoras/.test(sql)) {
        return {rows: [{id: COMPANY_UUID, razon_social: 'Maquinaria S.A.', nombre_comercial: 'MAQ01'}]};
      }
      if (/INSERT INTO usuarios_multiempresa/.test(sql)) {
        return {rows: [{id: 'u1', empresa_prestadora_id: COMPANY_UUID, nombre_completo: 'Ana Admin', correo: 'ana@example.com', rol: 'admin'}]};
      }
      return {rows: []};
    });

    const res = await post('/register', validBody);

    expect(res.status).toBe(201);
    expect(res.body.companyCode).toBe('MAQ01');
    const insert = mockClientQuery.mock.calls.find(c => /INSERT INTO empresas_prestadoras/.test(c[0]));
    expect(insert[1]).toEqual(['Maquinaria S.A.', 'MAQ01']);
  });
});

describe('login con código de empresa', () => {
  test('convierte el código corto en el UUID de la empresa', async () => {
    mockQuery.mockImplementation(async (sql, params) => {
      if (/FROM empresas_prestadoras/.test(sql)) return {rows: [{id: COMPANY_UUID}]};
      if (/FROM usuarios_multiempresa/.test(sql)) {
        expect(params[0]).toBe(COMPANY_UUID);
        return {rows: []};
      }
      return {rows: []};
    });

    const res = await post('/login', {serviceCompanyId: 'MAQ01', correo: 'ana@example.com', password: 'x'});

    expect(res.status).toBe(401);
    const userQuery = mockQuery.mock.calls.find(c => /FROM usuarios_multiempresa/.test(c[0]));
    expect(userQuery[1][0]).toBe(COMPANY_UUID);
  });

  test('un código inexistente no encuentra ninguna empresa', async () => {
    mockQuery.mockImplementation(async sql => {
      if (/FROM empresas_prestadoras/.test(sql)) return {rows: []};
      return {rows: []};
    });

    const res = await post('/login', {serviceCompanyId: 'NOEXISTE', correo: 'a@b.com', password: 'x'});

    expect(res.status).toBe(401);
    const userQuery = mockQuery.mock.calls.find(c => /FROM usuarios_multiempresa/.test(c[0]));
    expect(userQuery[1][0]).toBe('00000000-0000-0000-0000-000000000000');
  });

  test('un UUID se usa tal cual, sin buscar por código', async () => {
    mockQuery.mockResolvedValue({rows: []});

    await post('/login', {serviceCompanyId: COMPANY_UUID, correo: 'a@b.com', password: 'x'});

    const lookups = mockQuery.mock.calls.filter(c => /FROM empresas_prestadoras/.test(c[0]));
    expect(lookups).toHaveLength(0);
  });
});
