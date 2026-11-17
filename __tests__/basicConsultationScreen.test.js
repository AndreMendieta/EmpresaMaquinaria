/* eslint-env jest */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import BasicConsultationScreen from '../src/screens/BasicConsultationScreen';
import CustomInput from '../src/components/CustomInput';
import PrimaryButton from '../src/components/PrimaryButton';
import { runBasicConsultation } from '../src/utils/basicConsultation';

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../src/auth/useAuth', () => ({ useAuth: () => ({ role: 'tecnico' }) }));
jest.mock('../src/components/HeaderBar', () => 'HeaderBar');
jest.mock('../src/utils/basicConsultation', () => ({
  CONSULTATION_EXAMPLES: ['¿Qué órdenes hay?', '¿Qué personal hay?'],
  runBasicConsultation: jest.fn(),
}));

test('consulta, muestra el resultado y lo limpia cuando cambia la pregunta', async () => {
  runBasicConsultation.mockResolvedValue({ title: 'Órdenes', total: 1, results: ['OT1 — Servicio'] });
  let renderer;
  await act(async () => { renderer = ReactTestRenderer.create(<BasicConsultationScreen onBack={jest.fn()} />); });
  expect(renderer.root.findAllByProps({ children: '¿Qué personal hay?' })).toHaveLength(0);
  await act(async () => renderer.root.findByType(CustomInput).props.onChangeText('¿Qué órdenes hay?'));
  await act(async () => { await renderer.root.findByType(PrimaryButton).props.onPress(); });
  expect(runBasicConsultation).toHaveBeenCalledWith('¿Qué órdenes hay?', 'tecnico');
  expect(renderer.root.findAllByProps({ children: 'Total: 1. Mostrando 1 de 1.' }).length).toBeGreaterThan(0);
  await act(async () => renderer.root.findByType(CustomInput).props.onChangeText('Otra pregunta'));
  expect(renderer.root.findAllByProps({ children: 'Total: 1. Mostrando 1 de 1.' })).toHaveLength(0);
});

test('muestra el error de consulta', async () => {
  runBasicConsultation.mockRejectedValue(new Error('Sin conexión'));
  let renderer;
  await act(async () => { renderer = ReactTestRenderer.create(<BasicConsultationScreen onBack={jest.fn()} />); });
  await act(async () => renderer.root.findByType(CustomInput).props.onChangeText('¿Qué órdenes hay?'));
  await act(async () => { await renderer.root.findByType(PrimaryButton).props.onPress(); });
  expect(renderer.root.findAllByProps({ children: 'Sin conexión' }).length).toBeGreaterThan(0);
});
