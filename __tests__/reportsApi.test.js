/* eslint-env jest */
import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { downloadCompanyReport } from '../src/api/reportsApi';
import { handleUnauthorizedResponse } from '../src/api/client';

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: {},
  ApiError: class ApiError extends Error {
    constructor(message, status, data) {
      super(message);
      this.status = status;
      this.data = data;
    }
  },
  getDownloadRequest: jest.fn(async () => ({ url: 'https://example.test/report', headers: {} })),
  handleUnauthorizedResponse: jest.fn(),
}));
jest.mock('react-native-blob-util', () => ({
  __esModule: true,
  default: {
    config: jest.fn(),
    fs: { dirs: { DownloadDir: '/downloads', DocumentDir: '/documents' } },
  },
}));

describe('descarga de reportes en Android', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOS;
    jest.clearAllMocks();
  });

  test('conserva el estado y mensaje de error devueltos por la biblioteca nativa', async () => {
    Platform.OS = 'android';
    const response = {
      info: () => ({ status: 403 }),
      json: () => ({ error: 'Sin permisos para descargar.' }),
    };
    ReactNativeBlobUtil.config.mockReturnValue({ fetch: jest.fn().mockResolvedValue(response) });

    await expect(downloadCompanyReport()).rejects.toMatchObject({
      message: 'Sin permisos para descargar.',
      status: 403,
    });
  });

  test('cierra la sesión cuando la descarga nativa responde 401', async () => {
    Platform.OS = 'android';
    const response = {
      info: () => ({ status: 401 }),
      json: () => Promise.resolve({ error: 'Sesión expirada.' }),
    };
    ReactNativeBlobUtil.config.mockReturnValue({ fetch: jest.fn().mockResolvedValue(response) });

    await expect(downloadCompanyReport()).rejects.toMatchObject({ status: 401 });
    expect(handleUnauthorizedResponse).toHaveBeenCalledTimes(1);
  });
});
