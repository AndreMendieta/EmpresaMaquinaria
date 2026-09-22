/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from '../App';
import {saveSession, getSession} from '../src/auth/session';
import {getMe} from '../src/api/authApi';

const storage = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(async (key, value) => {
    storage[key] = value;
    return value;
  }),
  getItem: jest.fn(async (key) => storage[key] ?? null),
  removeItem: jest.fn(async (key) => {
    delete storage[key];
    return true;
  }),
}));

jest.mock('../src/api/authApi', () => ({
  getMe: jest.fn(),
  login: jest.fn(),
  register: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(storage).forEach((key) => delete storage[key]);
});

test('renders correctly', async () => {
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<App />);
    await Promise.resolve();
  });

  expect(renderer).toBeTruthy();
});

test('persists and restores the session', async () => {
  await saveSession({token: 'abc', user: {id: 1, nombre: 'Ana'}});
  const session = await getSession();

  expect(AsyncStorage.setItem).toHaveBeenCalled();
  expect(session).toEqual({token: 'abc', user: {id: 1, nombre: 'Ana'}});
});

test('restores a valid session after refreshing the user', async () => {
  const session = {token: 'valid-token', user: {id: 2, nombre_completo: 'Luis', rol: 'admin'}};
  await saveSession(session);
  getMe.mockResolvedValue({ok: true, usuario: session.user});

  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<App />);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(getMe).toHaveBeenCalledTimes(1);
  expect(renderer).toBeTruthy();
});
