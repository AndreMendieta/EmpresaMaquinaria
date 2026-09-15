/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from '../App';
import {saveSession, getSession} from '../src/services/session';

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
