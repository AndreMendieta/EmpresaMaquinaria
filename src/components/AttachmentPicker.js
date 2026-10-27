import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { pick, types, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import { uploadFile } from '../api/filesApi';
import { resolveFileUrl } from '../api/client';
import { isImageItem } from '../utils/attachments';
import Icon from './Icon';
import { COLORS } from '../constants/colors';

const IMAGE_OPTIONS = {
  mediaType: 'photo',
  quality: 0.8,
  maxWidth: 1600,
  maxHeight: 1600,
  saveToPhotos: false,
};

const AttachmentPicker = ({ label, items, onChange, allowFiles = false, max = 10 }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const list = items || [];
  const full = list.length >= max;

  const uploadAll = async (files) => {
    setUploading(true);
    setError('');
    const added = [];
    try {
      for (const file of files) {
        if (list.length + added.length >= max) break;
        const archivo = await uploadFile(file);
        added.push({ url: archivo.url, name: archivo.nombre, type: archivo.tipo });
      }
    } catch (err) {
      setError(err.message || 'No se pudo subir el archivo.');
    } finally {
      if (added.length > 0) onChange([...list, ...added]);
      setUploading(false);
    }
  };

  const fromPickerResult = (result) => {
    if (result.didCancel) return [];
    if (result.errorCode) {
      setError(
        result.errorCode === 'camera_unavailable'
          ? 'No se encontró una cámara disponible en este dispositivo.'
          : result.errorMessage || 'No se pudo abrir la cámara o la galería.'
      );
      return [];
    }
    return (result.assets || []).map((asset) => ({
      uri: asset.uri,
      name: asset.fileName,
      type: asset.type,
    }));
  };

  const handleCamera = async () => {
    setError('');
    const files = fromPickerResult(await launchCamera(IMAGE_OPTIONS));
    if (files.length) await uploadAll(files);
  };

  const handleGallery = async () => {
    setError('');
    const files = fromPickerResult(
      await launchImageLibrary({ ...IMAGE_OPTIONS, selectionLimit: Math.max(1, max - list.length) })
    );
    if (files.length) await uploadAll(files);
  };

  const handleFile = async () => {
    setError('');
    try {
      const picked = await pick({ type: [types.pdf, types.images, types.allFiles] });
      await uploadAll(picked.map((file) => ({ uri: file.uri, name: file.name, type: file.type })));
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) return;
      setError('No se pudo abrir el selector de archivos.');
    }
  };

  const handleRemove = (index) => {
    onChange(list.filter((_, i) => i !== index));
  };

  const disabled = uploading || full;

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={styles.buttonsRow}>
        <TouchableOpacity
          style={[styles.btn, disabled && styles.btnDisabled]}
          onPress={handleCamera}
          disabled={disabled}>
          <Icon name="camera" size={20} color={COLORS.orange} /><Text style={styles.btnText}>Tomar foto</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, disabled && styles.btnDisabled]}
          onPress={handleGallery}
          disabled={disabled}>
          <Icon name="gallery" size={20} color={COLORS.orange} /><Text style={styles.btnText}>Galería</Text>
        </TouchableOpacity>
        {allowFiles ? (
          <TouchableOpacity
            style={[styles.btn, disabled && styles.btnDisabled]}
            onPress={handleFile}
            disabled={disabled}>
            <Icon name="file" size={20} color={COLORS.orange} /><Text style={styles.btnText}>Archivo</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {uploading ? (
        <View style={styles.uploadingRow}>
          <ActivityIndicator size="small" color={COLORS.orange} />
          <Text style={styles.uploadingText}>Subiendo archivo…</Text>
        </View>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {list.length > 0 ? (
        <View style={styles.itemsWrap}>
          {list.map((item, index) => (
            <View key={`${item.url}-${index}`} style={styles.item}>
              <TouchableOpacity onPress={() => Linking.openURL(resolveFileUrl(item.url))}>
                {isImageItem(item) ? (
                  <Image source={{ uri: resolveFileUrl(item.url) }} style={styles.thumb} />
                ) : (
                  <View style={styles.fileBox}>
                    <Icon name="file" size={28} color={COLORS.silver} />
                    <Text style={styles.fileName} numberOfLines={2}>
                      {item.name}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(index)}>
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.silver,
    marginBottom: 8,
  },
  buttonsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: {
    flexGrow: 1,
    minHeight: 46,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.orange,
    borderRadius: 10,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  uploadingText: { color: COLORS.textSecondary, fontSize: 12 },
  errorText: { color: COLORS.danger, fontSize: 12, marginTop: 8, fontWeight: '600' },
  itemsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  item: { position: 'relative' },
  thumb: {
    width: 92,
    height: 92,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
  },
  fileBox: {
    width: 92,
    height: 92,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileIcon: { fontSize: 24 },
  fileName: { fontSize: 10, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 },
  removeBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
});

export default AttachmentPicker;
