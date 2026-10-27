import client from '../src/api/client';
import {getMachines, createMachine} from '../src/api/machinesApi';

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: {get: jest.fn(), post: jest.fn(), patch: jest.fn()},
}));

describe('machinesApi', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getMachines expone la lista como "maquinas" aunque el backend envíe "maquinarias"', async () => {
    client.get.mockResolvedValue({ok: true, maquinarias: [{id: '1', codigo: 'EXC-1'}]});

    const res = await getMachines();

    expect(client.get).toHaveBeenCalledWith('/machines');
    expect(res.maquinas).toEqual([{id: '1', codigo: 'EXC-1'}]);
  });

  test('getMachines devuelve lista vacía si no hay datos', async () => {
    client.get.mockResolvedValue({ok: true});

    const res = await getMachines();

    expect(res.maquinas).toEqual([]);
  });

  test('createMachine normaliza el código y limpia los campos', async () => {
    client.post.mockResolvedValue({ok: true, maquinaria: {id: '1'}});

    await createMachine({codigo: ' exc-1 ', nombre: ' Excavadora ', tipo: ' Pesada ', numeroSerie: ' ', urlManual: '', descripcion: null});

    expect(client.post).toHaveBeenCalledWith('/machines', {
      empresaClienteId: null,
      codigo: 'EXC-1',
      nombre: 'Excavadora',
      tipo: 'Pesada',
      numeroSerie: null,
      urlManual: null,
      descripcion: null,
    });
  });
});
