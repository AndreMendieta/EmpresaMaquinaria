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

  test.each(CONSULTATION_EXAMPLES.map(item => item.question))('reconoce el ejemplo %s', question => {
    expect(recognizeQuestion(question)).not.toBeNull();
  });

  test.each([
    'mostrar piezas por código P-001',
    'máquinas activas de la empresa Nombre',
    'piezas creadas hoy',
    'piezas desde 2026-11-01',
    '¿Qué órdenes están canceladas?',
    '¿Cuántas órdenes hay?',
    '¿Qué maquinaria está inactiva?',
  ])('reconoce variante o filtro %s', question => {
    expect(recognizeQuestion(question)).not.toBeNull();
  });

  test.each([
    '¿Qué órdenes abiertas tiene Juan?',
    '¿Qué piezas se han creado en marzo?',
    '¿Qué máquinas activas no están disponibles?',
    '¿Cuántas órdenes pendientes y completadas hay?',
  ])('rechaza condiciones desconocidas de %s', async question => {
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

  test('filtra maquinaria por estado y permite contar', async () => {
    getMachines.mockResolvedValue({ maquinas: [
      { codigo: 'M1', nombre: 'Activa', estado: 'activa' },
      { codigo: 'M2', nombre: 'Inactiva', estado: 'inactiva' },
    ] });
    const result = await runBasicConsultation('¿Cuántas máquinas están activas?', 'tecnico');
    expect(result.total).toBe(1);
    expect(result.results).toEqual(['[M1] Activa — activa']);
    expect(getMachines).toHaveBeenCalledWith({ strict: true });
  });

  test('filtra piezas por estado y conserva el orden del servidor', async () => {
    getParts.mockResolvedValue({ piezas: [
      { codigo: 'P2', nombre: 'Nueva', estado_validacion: 'pendiente' },
      { codigo: 'P1', nombre: 'Anterior', estado_validacion: 'validada' },
    ] });
    const result = await runBasicConsultation('¿Qué piezas están pendientes?', 'supervisor');
    expect(result.results).toEqual(['[P2] Nueva — pendiente']);
  });

  test('busca en el campo solicitado y no en otros', async () => {
    getParts.mockResolvedValue({ piezas: [
      { codigo: 'P-001', nombre: 'Manguera', estado_validacion: 'pendiente' },
      { codigo: 'P-002', nombre: 'P-001', estado_validacion: 'validada' },
    ] });
    expect((await runBasicConsultation('mostrar piezas por código P-001', 'admin')).results)
      .toEqual(['[P-001] Manguera — pendiente']);
    expect((await runBasicConsultation('buscar piezas por nombre P-001', 'admin')).results)
      .toEqual(['[P-002] P-001 — validada']);
  });

  test('filtra órdenes por estado', async () => {
    getOrders.mockResolvedValue({ ordenes: [
      { numero_orden: 'OT1', titulo: 'Servicio', estado: 'en_progreso' },
      { numero_orden: 'OT2', titulo: 'Otro', estado: 'completada' },
    ] });
    const result = await runBasicConsultation('¿Qué órdenes están en progreso?', 'admin');
    expect(result.total).toBe(1);
    expect(result.results).toEqual(['OT1 — Servicio — en progreso']);
  });

  test('asocia piezas a la empresa mediante la máquina', async () => {
    getClientCompanies.mockResolvedValue({ empresas_clientes: [
      { id: 'c1', razon_social: 'Acme' }, { id: 'c2', razon_social: 'Otra' },
    ] });
    getMachines.mockResolvedValue({ maquinas: [
      { id: 'm1', empresa_cliente_id: 'c1' }, { id: 'm2', empresa_cliente_id: 'c2' },
    ] });
    getParts.mockResolvedValue({ piezas: [
      { codigo: 'P1', nombre: 'Una', maquinaria_id: 'm1' },
      { codigo: 'P2', nombre: 'Otra', maquinaria_id: 'm2' },
    ] });
    const result = await runBasicConsultation('piezas de la empresa Acme', 'tecnico');
    expect(result.results).toEqual(['[P1] Una — Sin estado']);
    expect(result.filters).toContain('Empresa: Acme');
  });

  test('rechaza nombres de empresa ambiguos o inexistentes', async () => {
    getClientCompanies.mockResolvedValue({ empresas_clientes: [
      { id: 'c1', razon_social: 'Acme Norte' }, { id: 'c2', razon_social: 'Acme Sur' },
    ] });
    await expect(runBasicConsultation('órdenes de la empresa Acme', 'admin')).rejects.toThrow('varias empresas');
    await expect(runBasicConsultation('órdenes de la empresa Nadie', 'admin')).rejects.toThrow('No encontré');
    expect(getOrders).not.toHaveBeenCalled();
  });

  test.each([
    ['máquinas de la empresa Acme', 'maquinas', getMachines],
    ['órdenes de la empresa Acme', 'ordenes', getOrders],
    ['personal de la empresa Acme', 'usuarios', getUsers],
  ])('filtra %s por cliente', async (question, key, getData) => {
    getClientCompanies.mockResolvedValue({ empresas_clientes: [{ id: 'c1', razon_social: 'Acme' }] });
    getData.mockResolvedValue({ [key]: [
      { nombre: 'Uno', titulo: 'Uno', nombre_completo: 'Uno', empresa_cliente_id: 'c1' },
      { nombre: 'Dos', titulo: 'Dos', nombre_completo: 'Dos', empresa_cliente_id: 'c2' },
    ] });
    expect((await runBasicConsultation(question, 'admin')).total).toBe(1);
  });

  test('filtra fechas de piezas en hora local y valida los límites', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 10, 16, 12));
    try {
      getParts.mockResolvedValue({ piezas: [
        { codigo: 'P1', nombre: 'Hoy', creado_en: new Date(2026, 10, 16, 0).toISOString() },
        { codigo: 'P2', nombre: 'Ayer', creado_en: new Date(2026, 10, 15, 23).toISOString() },
        { codigo: 'P3', nombre: 'Antigua', creado_en: new Date(2026, 10, 9, 23).toISOString() },
      ] });
      expect((await runBasicConsultation('piezas creadas hoy', 'admin')).total).toBe(1);
      expect((await runBasicConsultation('piezas creadas ayer', 'admin')).total).toBe(1);
      expect((await runBasicConsultation('piezas en los últimos 7 días', 'admin')).total).toBe(2);
      expect((await runBasicConsultation('piezas desde 2026-11-15', 'admin')).total).toBe(2);
      await expect(runBasicConsultation('piezas desde 2026-02-30', 'admin')).rejects.toThrow('fecha no es válida');
      await expect(runBasicConsultation('piezas últimos 0 días', 'admin')).rejects.toThrow('entre 1 y 3650');
    } finally {
      jest.useRealTimers();
    }
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
