import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

const OPTIONS = {
  mediaType: 'photo',
  quality: 0.8,
  maxWidth: 800,
  maxHeight: 800,
  saveToPhotos: false,
  selectionLimit: 1,
};

// Devuelve { uri, name, type } o null si el usuario cancela. Lanza Error con mensaje legible.
export async function pickSingleImage(source) {
  const launch = source === 'camera' ? launchCamera : launchImageLibrary;
  const result = await launch(OPTIONS);
  if (result.didCancel) return null;
  if (result.errorCode) {
    throw new Error(
      result.errorCode === 'camera_unavailable'
        ? 'No se encontró una cámara disponible en este dispositivo.'
        : result.errorMessage || 'No se pudo abrir la cámara o la galería.'
    );
  }
  const asset = (result.assets || [])[0];
  return asset ? { uri: asset.uri, name: asset.fileName, type: asset.type } : null;
}
