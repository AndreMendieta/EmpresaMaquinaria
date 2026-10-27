import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomInput from '../components/CustomInput';
import PrimaryButton from '../components/PrimaryButton';
import { verifyEmail, resendVerification } from '../api/authApi';
import { saveSession } from '../auth/session';
import { useAuth } from '../auth/useAuth';
import { COLORS } from '../constants/colors';

const VerifyEmailScreen = ({
  initialEmail = '',
  initialCompanyId = '',
  initialDevCode = '',
  initialEmailSent = false,
  initialDeliveryMessage = '',
  onVerificationSuccess,
  onBackToLogin,
}) => {
  const { login: setAuthContextSession } = useAuth();
  const correo = initialEmail;
  const serviceCompanyId = initialCompanyId;
  const [codigo, setCodigo] = useState(initialDevCode || '');
  const [emailSent, setEmailSent] = useState(initialEmailSent);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState(
    initialDeliveryMessage || 'Ingresa el código de 6 dígitos para activar tu cuenta.'
  );

  const handleVerify = async () => {
    setErrorMessage('');
    const cleanCodigo = codigo.trim();
    if (!cleanCodigo || cleanCodigo.length < 6) {
      setErrorMessage('Por favor ingresa el código completo de 6 dígitos.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyEmail({
        serviceCompanyId,
        correo,
        codigo: cleanCodigo,
      });

      if (res.token && res.usuario) {
        await saveSession({ user: res.usuario, token: res.token });
        if (setAuthContextSession) {
          await setAuthContextSession({
            serviceCompanyId: res.usuario.empresa_prestadora_id,
            correo: res.usuario.correo,
            user: res.usuario,
            token: res.token,
          }).catch(() => {});
        }
      }

      if (onVerificationSuccess) {
        onVerificationSuccess(res.usuario, res.token);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Código incorrecto o expirado.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setResending(true);
    try {
      const res = await resendVerification({
        serviceCompanyId,
        correo,
      });
      setEmailSent(res.emailSent === true);
      setSuccessMessage(res.message || 'Se solicitó un nuevo código de verificación.');
      if (res.devCode) {
        setCodigo(res.devCode);
      }
    } catch (err) {
      setErrorMessage(err.message || 'No se pudo reenviar el código.');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            {/* Header con icono y títulos */}
            <Text style={styles.title}>Verifica tu Correo</Text>
            <Text style={styles.subtitle}>
              Ingresa el código de 6 dígitos para activar tu cuenta. Si no recibiste el correo, puedes solicitar otro.
            </Text>

            {/* Email destinatario */}
            <View style={styles.targetEmailBox}>
              <Text style={styles.targetEmailLabel}>Correo de la cuenta:</Text>
              <Text style={styles.targetEmailText}>{correo || 'tu correo'}</Text>
              {serviceCompanyId ? (
              <>
                <Text style={[styles.targetEmailLabel, styles.companyIdLabel]}>
                  ID de Empresa (guárdalo, lo necesitas para iniciar sesión):
                </Text>
                <Text selectable style={styles.targetEmailText}>{serviceCompanyId}</Text>
              </>
              ) : null}
            </View>

            {errorMessage ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {successMessage ? (
              <View style={[styles.successContainer, !emailSent && styles.deliveryWarningContainer]}>
                <Text style={[styles.successText, !emailSent && styles.deliveryWarningText]}>{successMessage}</Text>
              </View>
            ) : null}

            {/* Input código de 6 dígitos */}
            <View style={styles.inputSection}>
              <Text style={styles.fieldLabel}>Código de 6 dígitos</Text>
              <CustomInput
                placeholder="000000"
                value={codigo}
                onChangeText={(val) => setCodigo(val.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                style={styles.codeTextCenter}
              />
            </View>

            <PrimaryButton
              title="Confirmar y Activar Cuenta"
              onPress={handleVerify}
              loading={loading}
              disabled={loading || codigo.trim().length < 6}
            />

            {/* Acciones secundarias: Reenviar y Volver */}
            <View style={styles.resendRow}>
              <Text style={styles.resendText}>¿No recibiste el correo? </Text>
              <TouchableOpacity onPress={handleResend} disabled={resending}>
                {resending ? (
                  <ActivityIndicator size="small" color={COLORS.orange} />
                ) : (
                  <Text style={styles.resendLink}>Reenviar código</Text>
                )}
              </TouchableOpacity>
            </View>

            {onBackToLogin ? (
              <TouchableOpacity style={styles.btnBack} onPress={onBackToLogin}>
                <Text style={styles.btnBackText}>← Volver a Iniciar Sesión</Text>
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
    padding: 16,
    paddingVertical: 32,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  targetEmailBox: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  targetEmailLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  companyIdLabel: {
    marginTop: 10,
  },
  targetEmailText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.orange,
    marginTop: 2,
  },
  inputSection: {
    width: '100%',
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  codeTextCenter: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
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
  },
  deliveryWarningContainer: {
    backgroundColor: 'rgba(255, 106, 0, 0.1)',
    borderColor: 'rgba(255, 106, 0, 0.4)',
  },
  deliveryWarningText: {
    color: '#FFB36B',
    fontWeight: '600',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    gap: 4,
  },
  resendText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  resendLink: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.orange,
  },
  btnBack: {
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  btnBackText: {
    fontSize: 12,
    color: COLORS.silver,
    fontWeight: '600',
  },
});

export default VerifyEmailScreen;
