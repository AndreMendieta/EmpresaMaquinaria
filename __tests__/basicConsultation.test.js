/* eslint-env jest */
import { CONSULTATION_EXAMPLES, recognizeQuestion, runBasicConsultation } from '../src/utils/basicConsultation';
import { getClientCompanies } from '../src/api/clientCompaniesApi';
import { getMachines } from '../src/api/machinesApi';
import { getParts } from '../src/api/partsApi';
import { getOrders } from '../src/api/ordersApi';
import { getUsers } from '../src/api/usersApi';

jest.mock('../src/api/clientCompaniesApi', () => ({ getClientCompanies: jest.fn() }));
jest.mock('../src/api/machinesApi', () => ({ getMachines: jest.fn() }));
jest.mock('../src/api/partsApi', () => ({ getParts: jest.fn() }));
jest.mock('../src/api/ordersApi', () => ({ getOrders: jest.fn() }));
jest.mock('../src/api/usersApi', () => ({ getUsers: jest.fn() }));

describe('consulta básica', () => {
  beforeEach(() => jest.clearAllMocks());

  test.each(CONSULTATION_EXAMPLES)('reconoce el ejemplo %s', question => {
    expect(recognizeQuestion(question)).not.toBeNull();
  });

  test.each([
    '¿Qué maquinaria está inactiva?',
    '¿Qué piezas se han creado últimamente para la empresa ACME?',
    '¿Qué órdenes abiertas tiene Juan?',
    '¿Cuántas órdenes hay?',
  ])('no responde con resultados engañosos a %s', async question => {
    await expect(runBasicConsultation(question, 'admin')).rejects.toThrow('No entendí');
    expect(getMachines).not.toHaveBeenCalled();
    expect(getParts).not.toHaveBeenCalled();
    expect(getOrders).not.toHaveBeenCalled();
  });

  test('consulta empresas y muestra el total sin truncar', async () => {
    getClientCompanies.mockResolvedValue({
      empresas_clientes: Array.from({ length: 12 }, (_, i) => ({ razon_social: `Empresa ${i}` })),
    });
    const result = await runBasicConsultation('¿Qué empresas clientes hay?', 'tecnico');
    expect(result.total).toBe(12);
    expect(result.results).toHaveLength(10);
    expect(result.results[0]).toBe('Empresa 0');
  });

  test('solo incluye maquinaria activa', async () => {
    getMachines.mockResolvedValue({ maquinas: [
      { codigo: 'M1', nombre: 'Activa', estado: 'activa' },
      { codigo: 'M2', nombre: 'Inactiva', estado: 'inactiva' },
    ] });
    const result = await runBasicConsultation('¿Qué maquinaria está activa?', 'tecnico');
    expect(result.total).toBe(1);
    expect(result.results).toEqual(['[M1] Activa']);
  });

  test('muestra las piezas más recientes en el orden entregado por el servidor', async () => {
    getParts.mockResolvedValue({ piezas: [
      { codigo: 'P2', nombre: 'Nueva', estado_validacion: 'pendiente' },
      { codigo: 'P1', nombre: 'Anterior', estado_validacion: 'validada' },
    ] });
    const result = await runBasicConsultation('¿Qué piezas se han creado últimamente?', 'supervisor');
    expect(result.results).toEqual(['[P2] Nueva — pendiente', '[P1] Anterior — validada']);
  });

  test('filtra órdenes por estado sin incluir las otras', async () => {
    getOrders.mockResolvedValue({ ordenes: [
      { numero_orden: 'OT1', titulo: 'Servicio', estado: 'en_progreso' },
      { numero_orden: 'OT2', titulo: 'Otro', estado: 'completada' },
    ] });
    const result = await runBasicConsultation('¿Qué órdenes están en progreso?', 'admin');
    expect(result.total).toBe(1);
    expect(result.results).toEqual(['OT1 — Servicio — en progreso']);
  });

  test('restringe personal al administrador antes de llamar la API', async () => {
    await expect(runBasicConsultation('¿Qué personal hay?', 'supervisor')).rejects.toThrow('solo para administradores');
    expect(getUsers).not.toHaveBeenCalled();
    getUsers.mockResolvedValue({ usuarios: [{ nombre_completo: 'Ejemplo', rol: 'tecnico', activo: true }] });
    const result = await runBasicConsultation('¿Qué personal hay?', 'admin');
    expect(result.results).toEqual(['Ejemplo — tecnico — activo']);
  });

  test('informa errores del servidor y respuestas inválidas', async () => {
    getOrders.mockRejectedValueOnce(new Error('Sin conexión'));
    await expect(runBasicConsultation('¿Qué órdenes hay?', 'admin')).rejects.toThrow('Sin conexión');
    getOrders.mockResolvedValueOnce({});
    await expect(runBasicConsultation('¿Qué órdenes hay?', 'admin')).rejects.toThrow('datos de consulta inválidos');
  });
});
