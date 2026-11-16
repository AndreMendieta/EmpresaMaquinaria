/* eslint-env jest */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import MachineDetailScreen from '../src/screens/MachineDetailScreen';
import { useAuth } from '../src/auth/useAuth';
import { updateMachine } from '../src/api/machinesApi';
import { getParts } from '../src/api/partsApi';

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../src/auth/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('../src/api/machinesApi', () => ({ updateMachine: jest.fn() }));
jest.mock('../src/api/partsApi', () => ({ getParts: jest.fn() }));
jest.mock('../src/utils/alert', () => ({ alert: jest.fn() }));
jest.mock('../src/components/HeaderBar', () => 'HeaderBar');
jest.mock('../src/components/Badge', () => 'Badge');

describe('editar maquinaria', () => {
  const machine = { id: 'm1', codigo: 'M1', nombre: 'Máquina original', tipo: 'Excavadora' };

  beforeEach(() => {
    jest.clearAllMocks();
    getParts.mockResolvedValue({ piezas: [] });
  });

  async function render(role, onMachineUpdated = jest.fn()) {
    useAuth.mockReturnValue({ role });
    let renderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <MachineDetailScreen machine={machine} onMachineUpdated={onMachineUpdated} />,
      );
    });
    return renderer;
  }

  function buttonWithText(renderer, text) {
    return renderer.root.findAllByProps({ accessibilityRole: 'button' })
      .find((button) => button.props.children?.props?.children === text);
  }

  test('el administrador guarda y actualiza la ficha con la respuesta del servidor', async () => {
    const updated = { ...machine, nombre: 'Máquina actualizada' };
    const onMachineUpdated = jest.fn();
    updateMachine.mockResolvedValue({ maquinaria: updated });
    const renderer = await render('admin', onMachineUpdated);
    await act(async () => buttonWithText(renderer, 'Editar maquinaria').props.onPress());
    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: 'Nombre o Modelo *' }).props.onChangeText('Máquina actualizada');
    });
    await act(async () => buttonWithText(renderer, 'Guardar cambios').props.onPress());
    expect(updateMachine).toHaveBeenCalledWith('m1', expect.objectContaining({ nombre: 'Máquina actualizada' }));
    expect(onMachineUpdated).toHaveBeenCalledWith(updated);
    expect(renderer.root.findAllByProps({ children: 'Máquina actualizada' }).length).toBeGreaterThan(0);
  });

  test('el técnico no tiene opción de editar', async () => {
    const renderer = await render('tecnico');
    expect(buttonWithText(renderer, 'Editar maquinaria')).toBeUndefined();
  });

  test('mantiene el formulario y muestra el error cuando falla el guardado', async () => {
    updateMachine.mockRejectedValue(new Error('No se pudo guardar.'));
    const renderer = await render('supervisor');
    await act(async () => buttonWithText(renderer, 'Editar maquinaria').props.onPress());
    await act(async () => buttonWithText(renderer, 'Guardar cambios').props.onPress());
    expect(renderer.root.findAllByProps({ children: 'No se pudo guardar.' }).length).toBeGreaterThan(0);
    expect(renderer.root.findByProps({ accessibilityLabel: 'Nombre o Modelo *' })).toBeDefined();
  });
});
