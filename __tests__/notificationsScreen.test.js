/* eslint-env jest */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import NotificationsScreen from '../src/screens/NotificationsScreen';
import { getNotifications, markNotificationRead } from '../src/api/notificationsApi';
import { getParts } from '../src/api/partsApi';
import { getOrderById } from '../src/api/ordersApi';

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../src/auth/useAuth', () => ({
  useAuth: () => ({ role: 'admin', user: { id: 'user' } }),
}));
jest.mock('../src/api/notificationsApi', () => ({
  getNotifications: jest.fn(),
  markNotificationRead: jest.fn(),
}));
jest.mock('../src/api/partsApi', () => ({ getParts: jest.fn() }));
jest.mock('../src/api/ordersApi', () => ({ getOrderById: jest.fn() }));
jest.mock('../src/components/HeaderBar', () => 'HeaderBar');

describe('centro de notificaciones', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function renderNotification(item, props = {}) {
    getNotifications.mockResolvedValue({ notificaciones: [item] });
    let renderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<NotificationsScreen {...props} />);
    });
    return renderer;
  }

  test('abre la pieza completa y guarda la lectura', async () => {
    const item = { id: 'n1', titulo: 'Pieza aprobada', pieza_id: 'p1', leida_en: null };
    const part = { id: 'p1', nombre: 'Manguera', tipo: 'manguera', estado_validacion: 'validada' };
    const onNavigatePart = jest.fn();
    getParts.mockResolvedValue({ piezas: [part] });
    markNotificationRead.mockResolvedValue({ notificacion: { ...item, leida_en: '2026-01-01' } });
    const renderer = await renderNotification(item, { onNavigatePart });
    await act(async () => {
      await renderer.root.findByProps({ accessibilityRole: 'button' }).props.onPress();
    });
    expect(markNotificationRead).toHaveBeenCalledWith('n1');
    expect(onNavigatePart).toHaveBeenCalledWith(part);
  });

  test('abre la orden completa, incluso si ya está leída', async () => {
    const item = { id: 'n2', titulo: 'Orden asignada', orden_id: 'o1', leida_en: '2026-01-01' };
    const order = { id: 'o1', titulo: 'Reparación' };
    const onNavigateOrder = jest.fn();
    getOrderById.mockResolvedValue({ orden: order });
    const renderer = await renderNotification(item, { onNavigateOrder });
    await act(async () => {
      await renderer.root.findByProps({ accessibilityRole: 'button' }).props.onPress();
    });
    expect(onNavigateOrder).toHaveBeenCalledWith(order);
    expect(markNotificationRead).not.toHaveBeenCalled();
  });

  test('informa el error y no navega si no se guardó la lectura', async () => {
    const item = { id: 'n3', titulo: 'Pieza', pieza_id: 'p1', leida_en: null };
    const onNavigatePart = jest.fn();
    getParts.mockResolvedValue({ piezas: [{ id: 'p1', nombre: 'Pieza' }] });
    markNotificationRead.mockRejectedValue(new Error('No se pudo guardar la lectura.'));
    const renderer = await renderNotification(item, { onNavigatePart });
    await act(async () => {
      await renderer.root.findByProps({ accessibilityRole: 'button' }).props.onPress();
    });
    expect(onNavigatePart).not.toHaveBeenCalled();
    expect(renderer.root.findAllByProps({ children: 'No se pudo guardar la lectura.' }).length).toBeGreaterThan(0);
  });

  test('informa si la pieza ya no existe sin marcar la alerta como leída', async () => {
    const item = { id: 'n4', titulo: 'Pieza', pieza_id: 'p1', leida_en: null };
    getParts.mockResolvedValue({ piezas: [] });
    const renderer = await renderNotification(item, { onNavigatePart: jest.fn() });
    await act(async () => {
      await renderer.root.findByProps({ accessibilityRole: 'button' }).props.onPress();
    });
    expect(markNotificationRead).not.toHaveBeenCalled();
    expect(renderer.root.findAllByProps({ children: 'No se encontró la pieza de esta notificación.' }).length).toBeGreaterThan(0);
  });
});
