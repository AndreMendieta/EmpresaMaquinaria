import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = 'empresa_maquinaria_session';

export async function saveSession(session) {
  const payload = JSON.stringify(session);
  await AsyncStorage.setItem(SESSION_KEY, payload);
  return session;
}

export async function getSession() {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

export async function clearSession() {
  await AsyncStorage.removeItem(SESSION_KEY);
}
