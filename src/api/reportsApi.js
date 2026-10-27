import { Platform, Share } from 'react-native';
import client, { ApiError, getDownloadRequest, handleUnauthorizedResponse } from './client';

export async function getReportsSummary() {
  return client.get('/reports/summary');
}

async function throwDownloadError(response) {
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) await handleUnauthorizedResponse();
  throw new ApiError(data.error || 'No se pudo descargar el reporte PDF.', response.status, data);
}

export async function downloadCompanyReport() {
  const filename = `hydrotech-reporte-${new Date().toISOString().slice(0, 10)}.pdf`;
  const { url, headers } = await getDownloadRequest('/reports/export.pdf');

  if (Platform.OS === 'web') {
    const response = await fetch(url, { headers });
    if (!response.ok) await throwDownloadError(response);

    const pdfUrl = window.URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(pdfUrl), 1000);
    return { message: 'El reporte PDF se descargó.' };
  }

  const blobModule = require('react-native-blob-util');
  const ReactNativeBlobUtil = blobModule.default || blobModule;

  if (Platform.OS === 'android') {
    const download = await ReactNativeBlobUtil.config({
      addAndroidDownloads: {
        useDownloadManager: true,
        notification: true,
        title: filename,
        description: 'Reporte de máquinas, piezas y órdenes de trabajo',
        mime: 'application/pdf',
        mediaScannable: true,
        path: `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${filename}`,
      },
    }).fetch('GET', url, headers);
    if (download.info().status < 200 || download.info().status >= 300) {
      await throwDownloadError(download);
    }
    return { message: 'El PDF se guardó en Descargas.' };
  }

  const download = await ReactNativeBlobUtil.config({
    path: `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/${filename}`,
  }).fetch('GET', url, headers);
  if (download.info().status < 200 || download.info().status >= 300) {
    await throwDownloadError(download);
  }
  await Share.share({
    title: 'Reporte de máquinas, piezas y órdenes',
    url: `file://${download.path()}`,
  });
  return { message: 'El reporte está listo. Puedes guardarlo en Archivos desde las opciones para compartir.' };
}