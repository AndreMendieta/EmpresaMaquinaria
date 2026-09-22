import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = '@hydrotech_session_v2';

export async function saveSession(sessionData) {
  try {
    const payload = JSON.stringify(sessionData);
    await AsyncStorage.setItem(SESSION_KEY, payload);
    return sessionData;
  } catch (error) {
    console.error('Error guardando sesión en storage:', error);
    return null;
  }
}

export async function getSession() {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error leyendo sesión de storage:', error);
    return null;
  }
}

export async function clearSession() {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error('Error eliminando sesión de storage:', error);
  }
}
