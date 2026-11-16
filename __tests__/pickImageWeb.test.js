/* eslint-env jest */
import { pickSingleImage } from '../src/utils/pickImage.web';

describe('selector de imágenes web', () => {
  const originalDocument = global.document;

  afterEach(() => {
    global.document = originalDocument;
  });

  test('permite cancelar sin dejar pendiente la selección', async () => {
    const input = {
      click() {
        this.oncancel();
      },
    };
    global.document = { createElement: jest.fn(() => input) };
    await expect(pickSingleImage('gallery')).resolves.toBeNull();
  });

  test('devuelve el archivo seleccionado para la cámara', async () => {
    const file = { name: 'foto.jpg', type: 'image/jpeg' };
    const input = {
      files: [file],
      click() {
        this.onchange();
      },
    };
    global.document = { createElement: jest.fn(() => input) };
    await expect(pickSingleImage('camera')).resolves.toEqual({
      uri: file,
      name: 'foto.jpg',
      type: 'image/jpeg',
    });
    expect(input.capture).toBe('environment');
  });
});
