import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomInput from '../components/CustomInput';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../auth/useAuth';
import { COLORS } from '../constants/colors';

const LoginScreen = ({
  initialEmail = '',
  initialCompanyId = '',
  onNavigateToRegister,
  onNavigateToForgotPassword,
  onRequireVerification,
  onLoginSuccess,
}) => {
  const { login } = useAuth();
  const [serviceCompanyId, setServiceCompanyId] = useState(initialCompanyId);
  const [correo, setCorreo] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setErrorMessage('');
    const cleanEmail = correo.trim().toLowerCase();
    const cleanCompanyId = serviceCompanyId.trim();
    if (!cleanCompanyId || !cleanEmail || !password) {
      setErrorMessage('Ingresa el ID de la empresa, correo y contraseña.');
      return;
    }

    setLoading(true);
    try {
      await login({
        serviceCompanyId: cleanCompanyId,
        correo: cleanEmail,
        password,
      });
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (error) {
      if (error?.data?.requiereVerificacion) {
        if (onRequireVerification) {
          onRequireVerification({
            email: error.data.correo || cleanEmail,
            companyId: error.data.serviceCompanyId || cleanCompanyId,
            devCode: error.data.devCode,
            emailSent: error.data.emailSent,
            message: error.message,
          });
          return;
        }
      }
      setErrorMessage(error.message || 'Error al iniciar sesión.');
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
            <Image
              source={require('../../assets/brand/logo-icon.png')}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="Logo HydroTech"
            />
            <View style={styles.eyebrowContainer}>
              <View style={styles.eyebrowBar} />
              <Text style={styles.eyebrowText}>SISTEMAS HIDRÁULICOS & FLUIDOS</Text>
            </View>

            <Text style={styles.title}>
              Hydro<Text style={styles.titleOrange}>Tech</Text>
            </Text>
            <Text style={styles.subtitle}>
              Gestión de maquinaria industrial, repuestos y órdenes
            </Text>

            {errorMessage ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <CustomInput
              label="Código de empresa"
              placeholder="ej: MAQ01 (o el ID de la empresa)"
              value={serviceCompanyId}
              onChangeText={setServiceCompanyId}
              autoCapitalize="none"
            />

            <CustomInput
              label="Correo Electrónico"
              placeholder="correo@empresa.com"
              value={correo}
              onChangeText={setCorreo}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <CustomInput
              label="Contraseña"
              placeholder="Ingresa tu contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {onNavigateToForgotPassword ? (
              <TouchableOpacity
                style={styles.forgotContainer}
                onPress={() => onNavigateToForgotPassword(correo)}>
                <Text style={styles.forgotText}>¿Olvidaste tu contraseña o ID de empresa?</Text>
              </TouchableOpacity>
            ) : null}

            <PrimaryButton
              title="Iniciar Sesión"
              onPress={handleLogin}
              loading={loading}
            />

            {onNavigateToRegister ? (
              <View style={styles.footerLink}>
                <Text style={styles.footerText}>¿Tu empresa aún no está registrada?</Text>
                <TouchableOpacity onPress={onNavigateToRegister}>
                  <Text style={styles.footerAction}>Crear Cuenta</Text>
                </TouchableOpacity>
              </View>
            ) : null}
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
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopWidth: 4,
    borderTopColor: COLORS.orange,
    borderRadius: 4,
    padding: 24,
  },
  logo: {
    alignSelf: 'center',
    width: 150,
    height: 101,
    marginBottom: 16,
  },
  eyebrowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  eyebrowBar: {
    width: 3,
    height: 14,
    backgroundColor: COLORS.orange,
    marginRight: 8,
    borderRadius: 2,
  },
  eyebrowText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.silver,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  titleOrange: {
    color: COLORS.orange,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 20,
    marginTop: 2,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  forgotContainer: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    marginTop: -4,
    paddingVertical: 4,
  },
  forgotText: {
    fontSize: 11,
    color: COLORS.silver,
    fontWeight: '600',
  },
  footerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  footerAction: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.orange,
  },
});

export default LoginScreen;
