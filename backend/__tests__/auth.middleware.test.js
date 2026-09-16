const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'unit-test-secret';

const {verifyToken, requireRoles} = require('../src/middlewares/auth.middleware');

function responseDouble() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe('auth.middleware', () => {
  test('acepta un token válido e inyecta req.user', () => {
    const token = jwt.sign({userId: 7, empresaId: 3, rol: 'tecnico'}, process.env.JWT_SECRET);
    const req = {headers: {authorization: `Bearer ${token}`}};
    const res = responseDouble();
    const next = jest.fn();

    verifyToken(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual({userId: 7, empresaId: 3, rol: 'tecnico'});
    expect(res.statusCode).toBe(200);
  });

  test('rechaza un token inválido', () => {
    const req = {headers: {authorization: 'Bearer token-invalido'}};
    const res = responseDouble();
    const next = jest.fn();

    verifyToken(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  test('rechaza un token expirado', () => {
    const token = jwt.sign({userId: 7}, process.env.JWT_SECRET, {expiresIn: -1});
    const req = {headers: {authorization: `Bearer ${token}`}};
    const res = responseDouble();
    const next = jest.fn();

    verifyToken(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  test('requireRoles permite y bloquea según el rol', () => {
    const allowedReq = {user: {rol: 'admin'}};
    const allowedNext = jest.fn();
    requireRoles('admin')(allowedReq, responseDouble(), allowedNext);

    const deniedReq = {user: {rol: 'tecnico'}};
    const deniedRes = responseDouble();
    const deniedNext = jest.fn();
    requireRoles('admin')(deniedReq, deniedRes, deniedNext);

    expect(allowedNext).toHaveBeenCalledTimes(1);
    expect(deniedNext).not.toHaveBeenCalled();
    expect(deniedRes.statusCode).toBe(403);
  });
});
