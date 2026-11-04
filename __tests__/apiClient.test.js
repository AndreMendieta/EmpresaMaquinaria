jest.mock('../src/auth/session', () => ({
  getSession: jest.fn(),
  clearSession: jest.fn(),
}));

import client from '../src/api/client';
import {getSession} from '../src/auth/session';

describe('API client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('wraps session storage errors and skips the request', async () => {
    jest.useFakeTimers();
    getSession.mockRejectedValue(new Error('Storage unavailable'));

    await expect(client.get('/machines')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Storage unavailable',
      status: 500,
    });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });
});
