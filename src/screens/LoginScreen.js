import React, {useState} from 'react';
import {SafeAreaView, View, Text, StyleSheet, ActivityIndicator} from 'react-native';

import CustomInput from '../components/CustomInput';
import PrimaryButton from '../components/PrimaryButton';
import {login} from '../services/authService';

const LoginScreen = ({navigation}) => {
  const [companyCode, setCompanyCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setErrorMessage('');

    if (!companyCode || !email || !password) {
      setErrorMessage('Completa todos los campos.');
      return;
    }

    setLoading(true);
    try {
      const data = await login({companyCode, email, password});

      // TODO: guardar data.token de forma persistente con
      // @react-native-async-storage/async-storage para no pedir
      // login cada vez que se abra la app.
      console.log('Login exitoso:', data.usuario);

      // Si ya tienes navegación configurada (AppNavigator), navega
      // a la pantalla principal, por ejemplo:
      // navigation.replace('Home', {usuario: data.usuario});
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>EmpresaMaquinaria</Text>

        <Text style={styles.subtitle}>
          Inicia sesión para continuar
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
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        {loading ? (
          <ActivityIndicator size="large" color="#2563EB" style={{marginTop: 10}} />
        ) : (
          <PrimaryButton
            title="Iniciar sesión"
            onPress={handleLogin}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 30,
  },

  errorText: {
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 14,
  },
});

export default LoginScreen;
