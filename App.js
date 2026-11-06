import React from 'react';
import { KeyboardAvoidingView, StyleSheet } from 'react-native';
import { AuthProvider } from './src/auth/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const App = () => {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        {/* El teclado empuja el contenido en vez de taparlo (Android 15+ ya no redimensiona la ventana) */}
        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          <AppNavigator />
        </KeyboardAvoidingView>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
});

export default App;