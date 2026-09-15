import React, {useState} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import CustomInput from '../components/CustomInput';
import PrimaryButton from '../components/PrimaryButton';
import {login} from '../services/authService';
import {COLORS} from '../constants/colors';

const LoginScreen = ({onNavigateToRegister, onLoginSuccess}) => {
  const [companyCode, setCompanyCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setErrorMessage('');

    const cleanCode = companyCode.trim();
    const cleanEmail = email.trim();

    if (!cleanCode || !cleanEmail || !password) {
      setErrorMessage('Completa todos los campos.');
      return;
    }

    setLoading(true);
    try {
      const data = await login({companyCode: cleanCode, email: cleanEmail, password});

      if (onLoginSuccess) {
        onLoginSuccess(data.usuario, data.token);
      }
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          
          <View style={styles.card}>
            {/* Tagline de marca HydroTech */}
            <View style={styles.eyebrowContainer}>
              <View style={styles.eyebrowBar} />
              <Text style={styles.eyebrowText}>SISTEMAS HIDRÁULICOS & FLUIDOS</Text>
            </View>

            {/* Título de Marca */}
            <Text style={styles.title}>
              Hydro<Text style={styles.titleOrange}>Tech</Text>
            </Text>

            <Text style={styles.subtitle}>
              Plataforma técnica de gestión de maquinaria
            </Text>

            <CustomInput
              placeholder="Código de empresa"
              value={companyCode}
              onChangeText={setCompanyCode}
            />

            <CustomInput
              placeholder="Correo electrónico"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />

            <CustomInput
              placeholder="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {errorMessage ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {loading ? (
              <ActivityIndicator
                size="large"
                color={COLORS.orange}
                style={styles.loader}
              />
            ) : (
              <PrimaryButton
                title="Iniciar Sesión"
                onPress={handleLogin}
              />
            )}

            {/* Enlace para registrarse */}
            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>¿No tienes una cuenta? </Text>
              <TouchableOpacity onPress={onNavigateToRegister}>
                <Text style={styles.registerLink}>Regístrate aquí</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 32,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  eyebrowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  eyebrowBar: {
    width: 3,
    height: 12,
    backgroundColor: COLORS.orange,
    marginRight: 8,
    borderRadius: 2,
  },
  eyebrowText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.silver,
    letterSpacing: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  titleOrange: {
    color: COLORS.orange,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
    marginTop: 6,
  },
  loader: {
    marginTop: 14,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  errorText: {
    color: COLORS.danger,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '500',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 26,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  registerLink: {
    color: COLORS.orange,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default LoginScreen;
