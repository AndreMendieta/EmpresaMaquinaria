/* global Buffer */
const http = require('http');
const express = require('express');
const staticAssets = require('../src/middlewares/staticAssets');

let server;
let port;

function request(path) {
  return new Promise((resolve, reject) => {
    http.get({port, path: `/assets/${path}`}, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        resolve({
          status: response.statusCode,
          headers: response.headers,
          body: Buffer.concat(chunks),
        });
      });
    }).on('error', reject);
  });
}

beforeAll(done => {
  const app = express();
  app.use('/assets', staticAssets);
  server = app.listen(0, () => {
    port = server.address().port;
    done();
  });
});

afterAll(done => {
  server.close(done);
});

describe('static assets route', () => {
  test.each([
    ['brand/logo-full.png', 'image/png'],
    ['brand/logo-icon.png', 'image/png'],
    ['brand/app-icon-512.png', 'image/png'],
  ])('serves %s as %s', async (assetPath, contentType) => {
    const response = await request(assetPath);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain(contentType);
    expect(response.body.length).toBeGreaterThan(0);
  });

  test('returns 404 for a missing asset', async () => {
    const response = await request('brand/missing.png');

    expect(response.status).toBe(404);
  });
});
