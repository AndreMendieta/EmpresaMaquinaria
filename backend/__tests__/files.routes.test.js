/* global Buffer */
const http = require('http');
const express = require('express');

const mockQuery = jest.fn();

jest.mock('../src/db/pool', () => ({query: (...args) => mockQuery(...args)}));
jest.mock('../src/v2/utils/audit', () => ({registrarAuditoria: jest.fn()}));
jest.mock('../src/v2/middlewares/auth', () => (req, res, next) => {
  req.user = {id: 'user-1', service_company_id: 'company-1'};
  next();
});

const filesRoutes = require('../src/v2/routes/files.routes');

let server;
let port;

function request(method, path, {headers = {}, body} = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({port, path: `/files${path}`, method, headers}, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({status: res.statusCode, headers: res.headers, raw: Buffer.concat(chunks)}));
    });
    req.on('error', reject);
    req.end(body);
  });
}

function multipart(filename, content) {
  const boundary = '----testboundary';
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="archivo"; filename="${filename}"\r\n` +
        'Content-Type: application/octet-stream\r\n\r\n'
    ),
    Buffer.from(content),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return {headers: {'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length}, body};
}

beforeAll(done => {
  const app = express();
  app.use('/files', filesRoutes);
  server = app.listen(0, () => {
    port = server.address().port;
    done();
  });
});

afterAll(() => {
  server.closeAllConnections();
  server.close();
});

beforeEach(() => mockQuery.mockReset());

describe('files routes', () => {
  test('sube una foto y devuelve su URL relativa', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{id: 'abc-123', nombre: 'foto.jpg', tipo_mime: 'image/jpeg', tamano: 4}],
    });
    const res = await request('POST', '/', multipart('foto.jpg', 'data'));
    const json = JSON.parse(res.raw.toString());
    expect(res.status).toBe(201);
    expect(json.archivo).toMatchObject({id: 'abc-123', tipo: 'image/jpeg', url: '/api/v2/files/abc-123'});
    expect(mockQuery.mock.calls[0][1]).toEqual(['company-1', 'foto.jpg', 'image/jpeg', 4, expect.anything(), 'user-1']);
  });

  test('rechaza extensiones no permitidas (415) sin tocar la base de datos', async () => {
    const res = await request('POST', '/', multipart('virus.exe', 'data'));
    expect(res.status).toBe(415);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('rechaza una petición sin archivo (400)', async () => {
    const res = await request('POST', '/', {
      headers: {'Content-Type': 'application/json', 'Content-Length': 2},
      body: '{}',
    });
    expect(res.status).toBe(400);
  });

  test('descarga una imagen en línea con el tipo correcto', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{nombre: 'foto.jpg', tipo_mime: 'image/jpeg', contenido: Buffer.from('img')}],
    });
    const res = await request('GET', '/abc-123');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('image/jpeg');
    expect(res.headers['content-disposition']).toContain('inline');
    expect(res.raw.toString()).toBe('img');
  });

  test('devuelve 404 si el archivo no existe', async () => {
    mockQuery.mockResolvedValueOnce({rows: []});
    const res = await request('GET', '/no-existe');
    expect(res.status).toBe(404);
  });
});
