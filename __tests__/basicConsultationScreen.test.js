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
  CONSULTATION_EXAMPLES: [
    { category: 'Órdenes', question: '¿Qué órdenes hay?' },
    { category: 'Personal', question: '¿Qué personal hay?', adminOnly: true },
  ],
  runBasicConsultation: jest.fn(),
}));

test('muestra la pregunta y la respuesta como conversación', async () => {
  runBasicConsultation.mockResolvedValue({ title: 'Órdenes', filters: [], total: 1, results: ['OT1 — Servicio'] });
  let renderer;
  await act(async () => { renderer = ReactTestRenderer.create(<BasicConsultationScreen onBack={jest.fn()} />); });
  expect(renderer.root.findAllByProps({ accessibilityLabel: 'Usar ejemplo: ¿Qué personal hay?' })).toHaveLength(0);
  await act(async () => renderer.root.findByProps({ accessibilityLabel: 'Usar ejemplo: ¿Qué órdenes hay?' }).props.onPress());
  expect(renderer.root.findByType(CustomInput).props.value).toBe('¿Qué órdenes hay?');
  await act(async () => { await renderer.root.findByType(PrimaryButton).props.onPress(); });
  expect(runBasicConsultation).toHaveBeenCalledWith('¿Qué órdenes hay?', 'tecnico');
  expect(renderer.root.findAllByProps({ children: 'Total: 1. Mostrando 1 de 1.' }).length).toBeGreaterThan(0);
  expect(renderer.root.findByType(CustomInput).props.value).toBe('');
  await act(async () => renderer.root.findByType(CustomInput).props.onChangeText('Otra pregunta'));
  expect(renderer.root.findAllByProps({ children: 'Total: 1. Mostrando 1 de 1.' }).length).toBeGreaterThan(0);
});

test('muestra el error en la respuesta de la conversación', async () => {
  runBasicConsultation.mockRejectedValue(new Error('Sin conexión'));
  let renderer;
  await act(async () => { renderer = ReactTestRenderer.create(<BasicConsultationScreen onBack={jest.fn()} />); });
  await act(async () => renderer.root.findByType(CustomInput).props.onChangeText('¿Qué órdenes hay?'));
  await act(async () => { await renderer.root.findByType(PrimaryButton).props.onPress(); });
  expect(renderer.root.findAllByProps({ children: 'Sin conexión' }).length).toBeGreaterThan(0);
});
