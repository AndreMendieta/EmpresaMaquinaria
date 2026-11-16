/* eslint-env jest */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Platform } from 'react-native';
import Alert from '../src/utils/alert.web';
import ProfileScreen from '../src/screens/ProfileScreen';
import { useAuth } from '../src/auth/useAuth';
import { pickSingleImage } from '../src/utils/pickImage';
import { uploadFile } from '../src/api/filesApi';
import { updateMyPhoto } from '../src/api/authApi';

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../src/auth/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('../src/utils/pickImage', () => ({ pickSingleImage: jest.fn() }));
jest.mock('../src/api/filesApi', () => ({ uploadFile: jest.fn() }));
jest.mock('../src/api/authApi', () => ({
  updateMyPhoto: jest.fn(),
  updateCompanyLogo: jest.fn(),
}));
jest.mock('../src/auth/session', () => ({
  getSession: jest.fn(),
  clearSession: jest.fn(),
}));
jest.mock('../src/components/Icon', () => 'Icon');

describe('compatibilidad web', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOS;
    jest.clearAllMocks();
  });

  test('muestra en el navegador los avisos que usa la aplicación', () => {
    const previousWindow = global.window;
    global.window = { alert: jest.fn() };
    try {
      Alert.alert('Éxito', 'Datos guardados.');
      expect(global.window.alert).toHaveBeenCalledWith('Éxito\n\nDatos guardados.');
    } finally {
      global.window = previousWindow;
    }
  });

  test('permite elegir y guardar la foto de perfil desde la web', async () => {
    Platform.OS = 'web';
    const updateUser = jest.fn();
    useAuth.mockReturnValue({
      user: { nombre_completo: 'Ana', correo: 'ana@example.com' },
      role: 'admin',
      updateUser,
    });
    const file = { uri: 'photo', name: 'photo.jpg', type: 'image/jpeg' };
    pickSingleImage.mockResolvedValue(file);
    uploadFile.mockResolvedValue({ url: '/api/v2/files/123' });
    updateMyPhoto.mockResolvedValue({ usuario: { foto_url: '/api/v2/files/123' } });

    let renderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<ProfileScreen />);
    });
    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: 'Cambiar foto de perfil' }).props.onPress();
    });
    const gallery = renderer.root.findAllByProps({ accessibilityRole: 'button' })
      .find(button => button.props.children?.props?.children === 'Elegir de la galería');
    expect(gallery).toBeDefined();
    await act(async () => {
      await gallery.props.onPress();
    });
    expect(pickSingleImage).toHaveBeenCalledWith('gallery');
    expect(uploadFile).toHaveBeenCalledWith(file);
    expect(updateMyPhoto).toHaveBeenCalledWith('/api/v2/files/123');
    expect(updateUser).toHaveBeenCalledWith({ foto_url: '/api/v2/files/123' });
  });
});
