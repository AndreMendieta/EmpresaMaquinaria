/* eslint-env jest */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import HeaderBar from '../src/components/HeaderBar';
import { NavigationContext } from '../src/navigation/NavigationContext';
import confirmHome from '../src/utils/confirmHome';
import confirmHomeWeb from '../src/utils/confirmHome.web';

jest.mock('../src/auth/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));
jest.mock('../src/components/Avatar', () => 'Avatar');
jest.mock('../src/utils/confirmHome', () => jest.fn());

describe('menú principal', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('muestra la acción de inicio y conserva la acción de volver', async () => {
    const goHome = jest.fn();
    const goBack = jest.fn();
    let renderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <NavigationContext.Provider value={goHome}>
          <HeaderBar title="Reportes" onBack={goBack} />
        </NavigationContext.Provider>,
      );
    });
    const home = renderer.root.findByProps({ accessibilityLabel: 'Ir al menú principal' });
    await act(async () => home.props.onPress());
    expect(confirmHome).toHaveBeenCalledWith(goHome);
    expect(renderer.root.findAllByProps({ onPress: goBack }).length).toBeGreaterThan(0);
  });

  test('no muestra la acción de inicio en el panel principal', async () => {
    let renderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <NavigationContext.Provider value={jest.fn()}>
          <HeaderBar title="Panel Principal" />
        </NavigationContext.Provider>,
      );
    });
    expect(renderer.root.findAllByProps({ accessibilityLabel: 'Ir al menú principal' })).toHaveLength(0);
  });

  test('en web no sale de la pantalla cuando se cancela la confirmación', () => {
    const previousWindow = global.window;
    const goHome = jest.fn();
    global.window = { confirm: jest.fn().mockReturnValue(false) };
    try {
      confirmHomeWeb(goHome);
      expect(goHome).not.toHaveBeenCalled();
      global.window.confirm.mockReturnValue(true);
      confirmHomeWeb(goHome);
      expect(goHome).toHaveBeenCalledTimes(1);
    } finally {
      global.window = previousWindow;
    }
  });
});
