/* global Buffer */
const http = require('http');
const express = require('express');

const mockQuery = jest.fn();
let mockRole = 'admin';

jest.mock('../src/db/pool', () => ({query: (...args) => mockQuery(...args)}));
jest.mock('../src/v2/utils/audit', () => ({registrarAuditoria: jest.fn()}));
jest.mock('../src/v2/utils/mailer', () => ({}));
jest.mock('../src/v2/middlewares/auth', () => (req, res, next) => {
  req.user = {id: 'user-1', service_company_id: 'company-1', role: mockRole};
  next();
});

const authRoutes = require('../src/v2/routes/auth.routes');

const VALID_URL = '/api/v2/files/123e4567-e89b-12d3-a456-426614174000';

let server;
let port;

function patch(path, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = http.request(
      {port, path: `/auth${path}`, method: 'PATCH', headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body)}},
      res => {
        let raw = '';
        res.on('data', chunk => (raw += chunk));
        res.on('end', () => resolve({status: res.statusCode, json: JSON.parse(raw || '{}')}));
      }
    );
    req.on('error', reject);
    req.end(body);
  });
}

beforeAll(done => {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRoutes);
  server = app.listen(0, () => {
    port = server.address().port;
    done();
  });
});

afterAll(done => {
  server.close(() => done());
});

beforeEach(() => {
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({rows: [{id: 'user-1', foto_url: VALID_URL, empresa_logo_url: VALID_URL}]});
  mockRole = 'admin';
});

describe('perfil: foto y logo', () => {
  test('guarda la foto de perfil con una URL de archivo subido', async () => {
    const res = await patch('/me/photo', {fotoUrl: VALID_URL});
    expect(res.status).toBe(200);
    expect(res.json.usuario.foto_url).toBe(VALID_URL);
    expect(mockQuery.mock.calls[0][1]).toEqual([VALID_URL, 'user-1', 'company-1']);
  });

  test('rechaza URLs externas como foto de perfil', async () => {
    const res = await patch('/me/photo', {fotoUrl: 'https://evil.example/x.png'});
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('el admin puede cambiar el logo de la empresa', async () => {
    const res = await patch('/company/logo', {logoUrl: VALID_URL});
    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][1]).toEqual([VALID_URL, 'company-1']);
  });

  test('un técnico no puede cambiar el logo de la empresa', async () => {
    mockRole = 'tecnico';
    const res = await patch('/company/logo', {logoUrl: VALID_URL});
    expect(res.status).toBe(403);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
