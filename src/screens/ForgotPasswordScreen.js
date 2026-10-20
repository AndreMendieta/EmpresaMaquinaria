import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomInput from '../components/CustomInput';
import PrimaryButton from '../components/PrimaryButton';
import { forgotPassword, resetPassword, recoverUser } from '../api/authApi';
import { COLORS } from '../constants/colors';

const ForgotPasswordScreen = ({ initialEmail = '', onNavigateToLogin }) => {
  // Pestañas: 'password' (Recuperar Contraseña) | 'user' (Recuperar ID Empresa / Usuario)
  const [tab, setTab] = useState('password');

  // Modo 'password': paso 1 (solicitar código) o paso 2 (ingresar código y nueva contraseña)
  const [step, setStep] = useState(1);

  // Estados de formulario
  const [correo, setCorreo] = useState(initialEmail);
  const [serviceCompanyId, setServiceCompanyId] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Estados de retroalimentación
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isResetDone, setIsResetDone] = useState(false);
  const [isRecoverSent, setIsRecoverSent] = useState(false);

  // Cambiar de pestaña
  const handleSwitchTab = (newTab) => {
    setTab(newTab);
    setErrorMessage('');
    setSuccessMessage('');
    setIsResetDone(false);
    setIsRecoverSent(false);
    setStep(1);
  };

  // Paso 1: Solicitar código de recuperación de contraseña
  const handleRequestCode = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    const cleanEmail = correo.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMessage('Por favor ingresa tu correo electrónico.');
      return;
    }

    setLoading(true);
    try {
      const res = await forgotPassword({
        correo: cleanEmail,
        serviceCompanyId: serviceCompanyId.trim() || null,
      });

      setSuccessMessage(res.message || 'Código enviado. Revisa tu correo electrónico.');
      if (res.serviceCompanyId && !serviceCompanyId) {
        setServiceCompanyId(res.serviceCompanyId);
      }
      if (res.devCode) {
        setCodigo(res.devCode);
      }
      setStep(2);
    } catch (err) {
      setErrorMessage(err.message || 'No se pudo enviar el código de recuperación.');
    } finally {
      setLoading(false);
    }
  };

  // Paso 2: Validar código y restablecer contraseña
  const handleResetPassword = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    const cleanEmail = correo.trim().toLowerCase();
    const cleanCodigo = codigo.trim();

    if (!cleanCodigo || cleanCodigo.length < 6) {
      setErrorMessage('Ingresa el código de 6 dígitos que recibiste por correo.');
      return;
    }

    if (!nuevaPassword || nuevaPassword.length < 6) {
      setErrorMessage('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (nuevaPassword !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword({
        correo: cleanEmail,
        codigo: cleanCodigo,
        nuevaPassword,
        serviceCompanyId: serviceCompanyId.trim() || null,
      });

      setSuccessMessage(res.message || '¡Contraseña restablecida exitosamente!');
      setIsResetDone(true);
    } catch (err) {
      setErrorMessage(err.message || 'Error al restablecer la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  // Recuperar ID de empresa y datos de cuenta
  const handleRecoverAccount = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    const cleanEmail = correo.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMessage('Por favor ingresa tu correo electrónico.');
      return;
    }

    setLoading(true);
    try {
      const res = await recoverUser({ correo: cleanEmail });
      setSuccessMessage(
        res.message || 'Hemos enviado la lista de tus empresas e identificadores a tu correo.'
      );
      setIsRecoverSent(true);
    } catch (err) {
      setErrorMessage(err.message || 'No se pudo procesar la solicitud.');
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
            {/* Header / Logo */}
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>{tab === 'password' ? '🔑' : '🏢'}</Text>
            </View>

            <Text style={styles.appTitle}>
              Hydro<Text style={styles.titleOrange}>Tech</Text>
            </Text>
            <Text style={styles.title}>
              {tab === 'password' ? 'Recuperar Contraseña' : 'Recordar ID de Empresa'}
            </Text>
            <Text style={styles.subtitle}>
              {tab === 'password'
                ? 'Te enviaremos un código de seguridad para crear una nueva clave.'
                : '¿Olvidaste el ID de tu empresa o usuario? Te enviamos tus accesos.'}
            </Text>

            {/* Pestañas de opción */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, tab === 'password' && styles.tabButtonActive]}
                onPress={() => handleSwitchTab('password')}>
                <Text
                  style={[styles.tabText, tab === 'password' && styles.tabTextActive]}>
                  Restablecer Clave
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, tab === 'user' && styles.tabButtonActive]}
                onPress={() => handleSwitchTab('user')}>
                <Text
                  style={[styles.tabText, tab === 'user' && styles.tabTextActive]}>
                  Recuperar Empresa / ID
                </Text>
              </TouchableOpacity>
            </View>

            {/* Alertas */}
            {errorMessage ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {successMessage ? (
              <View style={styles.successContainer}>
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            ) : null}

            {/* CONTENIDO PESTAÑA: RECUPERAR CONTRASEÑA */}
            {tab === 'password' && !isResetDone && (
              <>
                {step === 1 ? (
                  // PASO 1: Ingreso de correo y envío de código
                  <View style={styles.formSection}>
                    <CustomInput
                      label="Correo Electrónico Registrado"
                      placeholder="ej: usuario@empresa.com"
                      value={correo}
                      onChangeText={setCorreo}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />

                    <CustomInput
                      label="ID de Empresa Prestadora (Opcional)"
                      placeholder="UUID (déjalo vacío si no lo recuerdas)"
                      value={serviceCompanyId}
                      onChangeText={setServiceCompanyId}
                      autoCapitalize="none"
                    />

                    <PrimaryButton
                      title="Enviar Código de Recuperación"
                      onPress={handleRequestCode}
                      loading={loading}
                      disabled={loading || !correo.trim()}
                    />
                  </View>
                ) : (
                  // PASO 2: Ingreso de código de 6 dígitos y nueva contraseña
                  <View style={styles.formSection}>
                    <View style={styles.targetEmailBox}>
                      <Text style={styles.targetEmailLabel}>Código enviado a:</Text>
                      <Text style={styles.targetEmailText}>{correo}</Text>
                      {serviceCompanyId ? (
                        <Text style={styles.targetCompanyText}>
                          Empresa ID: {serviceCompanyId}
                        </Text>
                      ) : null}
                    </View>

                    <Text style={styles.fieldLabel}>Código de 6 dígitos</Text>
                    <CustomInput
                      placeholder="000000"
                      value={codigo}
                      onChangeText={(val) =>
                        setCodigo(val.replace(/[^0-9]/g, '').slice(0, 6))
                      }
                      keyboardType="number-pad"
                      maxLength={6}
                      style={styles.codeTextCenter}
                    />

                    <CustomInput
                      label="Nueva Contraseña (mínimo 6 caracteres)"
                      placeholder="Ingresa tu nueva contraseña"
                      value={nuevaPassword}
                      onChangeText={setNuevaPassword}
                      secureTextEntry
                    />

                    <CustomInput
                      label="Confirmar Nueva Contraseña"
                      placeholder="Repite la contraseña"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                    />

                    <PrimaryButton
                      title="Actualizar Contraseña"
                      onPress={handleResetPassword}
                      loading={loading}
                      disabled={loading || codigo.trim().length < 6}
                    />

                    <TouchableOpacity
                      style={styles.changeEmailBtn}
                      onPress={() => setStep(1)}
                      disabled={loading}>
                      <Text style={styles.changeEmailText}>
                        ← Cambiar correo o solicitar nuevo código
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {/* CONTENIDO ÉXITO TRAS RESTABLECER */}
            {tab === 'password' && isResetDone && (
              <View style={styles.doneContainer}>
                <Text style={styles.doneEmoji}>✅</Text>
                <Text style={styles.doneTitle}>¡Contraseña Actualizada!</Text>
                <Text style={styles.doneDesc}>
                  Tu clave ha sido modificada con éxito. Ya puedes iniciar sesión en
                  HydroTech con tus nuevas credenciales.
                </Text>
                <PrimaryButton
                  title="Ir a Iniciar Sesión"
                  onPress={onNavigateToLogin}
                />
              </View>
            )}

            {/* CONTENIDO PESTAÑA: RECUPERAR ID DE EMPRESA */}
            {tab === 'user' && !isRecoverSent && (
              <View style={styles.formSection}>
                <Text style={styles.infoHint}>
                  Ingresa tu correo registrado y te enviaremos de inmediato el ID de
                  tu empresa y el nombre de tus cuentas vinculadas.
                </Text>

                <CustomInput
                  label="Correo Electrónico"
                  placeholder="ej: usuario@empresa.com"
                  value={correo}
                  onChangeText={setCorreo}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <PrimaryButton
                  title="Enviar Datos a mi Correo"
                  onPress={handleRecoverAccount}
                  loading={loading}
                  disabled={loading || !correo.trim()}
                />
              </View>
            )}

            {/* CONTENIDO ÉXITO TRAS ENVIAR RECORDATORIO DE EMPRESA */}
            {tab === 'user' && isRecoverSent && (
              <View style={styles.doneContainer}>
                <Text style={styles.doneEmoji}>📬</Text>
                <Text style={styles.doneTitle}>Información Enviada</Text>
                <Text style={styles.doneDesc}>
                  Revisa tu bandeja de entrada en {correo}. Te enviamos los
                  identificadores de empresa necesarios para iniciar sesión.
                </Text>
                <PrimaryButton
                  title="Ir a Iniciar Sesión"
                  onPress={onNavigateToLogin}
                />
              </View>
            )}

            {/* Enlace para volver */}
            {onNavigateToLogin && !isResetDone && !isRecoverSent ? (
              <TouchableOpacity
                style={styles.footerBack}
                onPress={onNavigateToLogin}
                disabled={loading}>
                <Text style={styles.footerBackText}>← Volver a Iniciar Sesión</Text>
              </TouchableOpacity>
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
    paddingVertical: 32,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 6,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 106, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 106, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconText: {
    fontSize: 26,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  titleOrange: {
    color: COLORS.orange,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.silver,
    marginTop: 4,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: '100%',
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
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  formSection: {
    width: '100%',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  codeTextCenter: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  targetEmailBox: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 14,
    alignItems: 'center',
  },
  targetEmailLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  targetEmailText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.orange,
    marginTop: 2,
  },
  targetCompanyText: {
    fontSize: 11,
    color: COLORS.silver,
    marginTop: 2,
  },
  infoHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    width: '100%',
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  successContainer: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    width: '100%',
  },
  successText: {
    color: COLORS.success,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  changeEmailBtn: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 6,
  },
  changeEmailText: {
    fontSize: 12,
    color: COLORS.silver,
    fontWeight: '600',
  },
  doneContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  doneEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  doneTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  doneDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  footerBack: {
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  footerBackText: {
    fontSize: 12,
    color: COLORS.silver,
    fontWeight: '600',
  },
});

export default ForgotPasswordScreen;
