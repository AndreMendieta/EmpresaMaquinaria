import React, { useRef, useState } from 'react';
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
  const [conversation, setConversation] = useState([]);
  const scrollRef = useRef(null);
  const composerPosition = useRef(0);
  const scrollToResponse = useRef(false);
  const examples = CONSULTATION_EXAMPLES.filter(example => !example.adminOnly || role === 'admin');

  const consult = async () => {
    const text = question.trim();
    if (!text) {
      setError('Escribe una pregunta o selecciona un ejemplo.');
      return;
    }
    setError('');
    setQuestion('');
    setLoading(true);
    scrollToResponse.current = true;
    setConversation(previous => [...previous, { question: text, loading: true }]);
    try {
      const answer = await runBasicConsultation(text, role);
      scrollToResponse.current = true;
      setConversation(previous => [...previous.slice(0, -1), { question: text, answer }]);
    } catch (err) {
      scrollToResponse.current = true;
      setConversation(previous => [...previous.slice(0, -1), {
        question: text,
        error: err.message || 'No se pudo realizar la consulta.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar title="Consulta básica" role={role} onBack={onBack} />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>HYDROTECH · CONSULTAS</Text>
          <Text style={styles.introTitle}>Información a tu alcance</Text>
          <Text style={styles.description}>
            Pregunta por tus registros y consulta los resultados actualizados. Esta herramienta usa reglas, no IA generativa.
          </Text>
        </View>

        {conversation.map((entry, index) => (
          <View key={index} style={styles.exchange}>
            <View style={styles.questionBubble}>
              <Text style={styles.bubbleLabel}>TU CONSULTA</Text>
              <Text style={styles.questionText}>{entry.question}</Text>
            </View>
            <View style={styles.answerBubble}>
              <Text style={styles.answerLabel}>HYDROTECH</Text>
              {entry.loading ? <Text style={styles.answerText}>Consultando datos...</Text> : null}
              {entry.error ? <Text style={styles.error} accessibilityRole="alert">{entry.error}</Text> : null}
              {entry.answer ? (
                <>
                  <Text style={styles.answerTitle}>{entry.answer.title}</Text>
                  {entry.answer.filters.length ? (
                    <Text style={styles.filters}>{entry.answer.filters.join(' · ')}</Text>
                  ) : null}
                  <Text style={styles.answerText}>
                    {entry.answer.total === 0
                      ? 'No se encontraron registros.'
                      : `Total: ${entry.answer.total}. Mostrando ${entry.answer.results.length} de ${entry.answer.total}.`}
                  </Text>
                  {entry.answer.results.map((result, resultIndex) => (
                    <Text key={resultIndex} style={styles.result}>• {result}</Text>
                  ))}
                </>
              ) : null}
            </View>
          </View>
        ))}

        <View
          style={styles.composer}
          onLayout={event => {
            composerPosition.current = event.nativeEvent.layout.y;
            if (scrollToResponse.current) {
              scrollToResponse.current = false;
              scrollRef.current?.scrollTo({ y: Math.max(0, composerPosition.current - 250), animated: true });
            }
          }}>
          <CustomInput
            label="Escribe tu consulta"
            placeholder="Ej. ¿Cuántas máquinas están activas?"
            value={question}
            onChangeText={value => { setQuestion(value); setError(''); }}
            autoCapitalize="sentences"
            maxLength={300}
            editable={!loading}
          />
          <PrimaryButton title="Consultar" onPress={consult} loading={loading} />
          {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
        </View>

        <View style={styles.examplesHeader}>
          <Text style={styles.heading}>Ideas para preguntar</Text>
          <Text style={styles.description}>Selecciona un ejemplo para escribirlo arriba. También puedes cambiar sus palabras.</Text>
        </View>
        {examples.map(example => (
          <TouchableOpacity
            key={example.question}
            style={styles.example}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={`Usar ejemplo: ${example.question}`}
            onPress={() => {
              setQuestion(example.question);
              setError('');
              scrollRef.current?.scrollTo({ y: composerPosition.current, animated: true });
            }}>
            <View style={styles.exampleContent}>
              <Text style={styles.category}>{example.category}</Text>
              <Text style={styles.exampleText}>{example.question}</Text>
            </View>
            <Text style={styles.exampleArrow}>+</Text>
          </TouchableOpacity>
        ))}
        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>BUSCA CON FILTROS</Text>
          <Text style={styles.tipText}>Nombre o código: «mostrar piezas por código P-001»</Text>
          <Text style={styles.tipText}>Empresa: «máquinas activas de la empresa Nombre»</Text>
          <Text style={styles.tipText}>Fecha: «piezas creadas hoy» o «piezas desde 2026-11-01»</Text>
          <Text style={styles.tipText}>Reemplaza el código, nombre o fecha por los que quieras consultar.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 36 },
  intro: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 4, borderLeftColor: COLORS.orange, borderRadius: 6, padding: 16, marginBottom: 20 },
  eyebrow: { color: COLORS.orange, fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginBottom: 6 },
  introTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '800', marginBottom: 7 },
  description: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 20 },
  exchange: { marginBottom: 18 },
  questionBubble: { alignSelf: 'flex-end', maxWidth: '90%', backgroundColor: COLORS.orangeDim, borderRadius: 10, padding: 14, marginBottom: 8 },
  bubbleLabel: { color: '#FFFFFF', opacity: 0.8, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 5 },
  questionText: { color: '#FFFFFF', fontSize: 15, lineHeight: 21 },
  answerBubble: { alignSelf: 'flex-start', width: '95%', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 14 },
  answerLabel: { color: COLORS.orange, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  answerTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 6 },
  answerText: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 20 },
  filters: { color: COLORS.silver, fontSize: 12, lineHeight: 18, marginBottom: 8 },
  result: { color: COLORS.textPrimary, fontSize: 14, lineHeight: 21, marginTop: 8 },
  composer: { backgroundColor: COLORS.surfaceCard, borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, padding: 14 },
  error: { color: COLORS.danger, marginTop: 8, fontSize: 14, lineHeight: 20 },
  examplesHeader: { marginTop: 26, marginBottom: 14 },
  heading: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 5 },
  example: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, padding: 14, marginBottom: 8 },
  exampleContent: { flex: 1 },
  category: { color: COLORS.orange, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  exampleText: { color: COLORS.textPrimary, fontSize: 14, lineHeight: 20 },
  exampleArrow: { color: COLORS.orange, fontSize: 22, fontWeight: '700', marginLeft: 12 },
  tips: { backgroundColor: COLORS.surface2, borderRadius: 6, padding: 14, marginTop: 8 },
  tipsTitle: { color: COLORS.silver, fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  tipText: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: 4 },
});

export default BasicConsultationScreen;
