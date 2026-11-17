import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/useAuth';
import HeaderBar from '../components/HeaderBar';
import CustomInput from '../components/CustomInput';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS } from '../constants/colors';
import { CONSULTATION_EXAMPLES, runBasicConsultation } from '../utils/basicConsultation';

const BasicConsultationScreen = ({ onBack }) => {
  const { role } = useAuth();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [answer, setAnswer] = useState(null);
  const examples = role === 'admin'
    ? CONSULTATION_EXAMPLES
    : CONSULTATION_EXAMPLES.filter(example => example !== '¿Qué personal hay?');

  const changeQuestion = value => {
    setQuestion(value);
    setAnswer(null);
    setError('');
  };

  const consult = async () => {
    setError('');
    setAnswer(null);
    if (!question.trim()) {
      setError('Escribe una pregunta o selecciona un ejemplo.');
      return;
    }
    setLoading(true);
    try {
      const result = await runBasicConsultation(question, role);
      setAnswer(result);
    } catch (err) {
      setError(err.message || 'No se pudo realizar la consulta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar title="Consulta básica" role={role} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.description}>
          Consulta información de tu empresa con preguntas sencillas. Esta herramienta usa reglas, no IA generativa.
        </Text>
        <CustomInput
          label="Tu pregunta"
          placeholder="Escribe una pregunta..."
          value={question}
          onChangeText={changeQuestion}
          autoCapitalize="sentences"
          maxLength={300}
          editable={!loading}
        />
        <PrimaryButton title="Consultar" onPress={consult} loading={loading} />
        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
        {answer ? (
          <View style={styles.card}>
            <Text style={styles.title}>{answer.title}</Text>
            <Text style={styles.description}>
              {answer.total === 0
                ? 'No se encontraron registros.'
                : `Total: ${answer.total}. Mostrando ${answer.results.length} de ${answer.total}.`}
            </Text>
            {answer.results.map((result, index) => (
              <Text key={index} style={styles.result}>• {result}</Text>
            ))}
          </View>
        ) : null}
        <Text style={styles.heading}>Ejemplos de preguntas</Text>
        <Text style={styles.description}>Toca un ejemplo para usarlo o escribe una pregunta similar.</Text>
        {examples.map(example => (
          <TouchableOpacity
            key={example}
            style={styles.example}
            disabled={loading}
            accessibilityRole="button"
            onPress={() => changeQuestion(example)}>
            <Text style={styles.exampleText}>{example}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  description: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 14 },
  heading: { color: COLORS.orange, fontSize: 14, fontWeight: '800', marginTop: 24, marginBottom: 8 },
  card: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, padding: 16, marginTop: 20 },
  title: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '800', marginBottom: 8 },
  result: { color: COLORS.textPrimary, fontSize: 14, lineHeight: 21, marginBottom: 8 },
  error: { color: '#EF4444', marginTop: 14, fontSize: 14 },
  example: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, borderRadius: 4, padding: 12, marginBottom: 8 },
  exampleText: { color: COLORS.textPrimary, fontSize: 14 },
});

export default BasicConsultationScreen;
