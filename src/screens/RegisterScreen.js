import React, {useState} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import CustomInput from '../components/CustomInput';
import PrimaryButton from '../components/PrimaryButton';
import {register as registerCompany} from '../api/authApi';
import {COLORS} from '../constants/colors';

const RegisterScreen = ({onNavigateToLogin, onRegisterSuccess}) => {
  // 'company' (Nueva Empresa) o 'user' (Unirme a Empresa existente)
  const [tab, setTab] = useState('company');

  // Campos
  const [companyName, setCompanyName] = useState('');
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setErrorMessage('');

    const cleanEmail = email.trim();
    const cleanUserName = userName.trim();

    if (tab !== 'company') {
      setErrorMessage('El registro para unirse a una empresa se habilitará en la API v2 próximamente.');
      return;
    }

    if (!cleanUserName || !cleanEmail || !password || !confirmPassword) {
      setErrorMessage('Por favor completa todos los campos.');
      return;
    }

    if (!companyName.trim()) {
      setErrorMessage('Ingresa el nombre de la empresa.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      let data;
      data = await registerCompany({
        razonSocialEmpresa: companyName.trim(),
        nombreCompleto: cleanUserName,
        correo: cleanEmail,
        password,
      });

      if (onRegisterSuccess) {
        onRegisterSuccess(data.usuario, data.token);
      }
    } catch (error) {
      setErrorMessage(error.message || 'Error al procesar el registro.');
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
            <View style={styles.eyebrowContainer}>
              <View style={styles.eyebrowBar} />
              <Text style={styles.eyebrowText}>ALTA DE CUENTA TÉCNICA</Text>
            </View>

            <Text style={styles.appTitle}>
              Hydro<Text style={styles.titleOrange}>Tech</Text>
            </Text>
            <Text style={styles.screenTitle}>Registro de Usuario & Empresa</Text>

            {/* Selector de Pestaña */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, tab === 'company' && styles.tabButtonActive]}
                onPress={() => {
                  setTab('company');
                  setErrorMessage('');
                }}>
                <Text
                  style={[
                    styles.tabText,
                    tab === 'company' && styles.tabTextActive,
                  ]}>
                  Nueva Empresa
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, tab === 'user' && styles.tabButtonActive]}
                onPress={() => {
                  setTab('user');
                  setErrorMessage('');
                }}>
                <Text
                  style={[
                    styles.tabText,
                    tab === 'user' && styles.tabTextActive,
                  ]}>
                  Unirme a Empresa
                </Text>
              </TouchableOpacity>
            </View>

            {/* Subtítulo informativo según la pestaña */}
            <Text style={styles.roleHint}>
              {tab === 'company'
                ? 'Registra tu empresa y crea la cuenta Administrador principal.'
                : 'Únete como Técnico usando el código de tu empresa.'}
            </Text>

            {/* Formulario */}
            {tab === 'company' && (
              <CustomInput
                placeholder="Nombre de la empresa (ej: Maquinaria S.A.)"
                value={companyName}
                onChangeText={setCompanyName}
              />
            )}

            <CustomInput
              placeholder={
                tab === 'company' ? 'Nombre del Administrador' : 'Tu Nombre Completo'
              }
              value={userName}
              onChangeText={setUserName}
            />

            <CustomInput
              placeholder="Correo electrónico"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />

            <CustomInput
              placeholder="Contraseña (mínimo 6 caracteres)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <CustomInput
              placeholder="Confirmar Contraseña"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
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
                title={
                  tab === 'company'
                    ? 'Registrar Empresa y Admin'
                    : 'Registrarme como Técnico'
                }
                onPress={handleRegister}
              />
            )}

            {/* Enlace para volver a Iniciar Sesión */}
            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>¿Ya tienes una cuenta? </Text>
              <TouchableOpacity onPress={onNavigateToLogin}>
                <Text style={styles.loginLink}>Inicia sesión</Text>
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
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 22,
    paddingVertical: 28,
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
    marginBottom: 6,
  },
  eyebrowBar: {
    width: 3,
    height: 12,
    backgroundColor: COLORS.orange,
    marginRight: 8,
    borderRadius: 2,
  },
  eyebrowText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.silver,
    letterSpacing: 1,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  titleOrange: {
    color: COLORS.orange,
  },
  screenTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 18,
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: COLORS.orange,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  roleHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  errorText: {
    color: COLORS.danger,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '500',
  },
  loader: {
    marginTop: 15,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  loginLink: {
    color: COLORS.orange,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default RegisterScreen;
