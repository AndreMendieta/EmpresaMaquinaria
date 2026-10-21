import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/useAuth';
import { downloadCompanyReport, getReportsSummary } from '../api/reportsApi';
import HeaderBar from '../components/HeaderBar';
import ForbiddenNotice from '../components/ForbiddenNotice';
import { COLORS } from '../constants/colors';

const ReportsScreen = ({ onBack }) => {
  const { role } = useAuth();
  const [data, setData] = useState({ ordenes: [], piezas: [], maquinarias: [] });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  const [exportError, setExportError] = useState('');

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    setForbidden(false);
    try {
      const res = await getReportsSummary();
      setData(res.reportes || { ordenes: [], piezas: [], maquinarias: [] });
    } catch (err) {
      if (err.isForbidden) {
        setForbidden(true);
      } else {
        setErrorMsg(err.message || 'Error al consolidar los reportes de métricas.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleDownloadReport = async () => {
    setExporting(true);
    setExportStatus('');
    setExportError('');
    try {
      const result = await downloadCompanyReport();
      setExportStatus(result.message);
    } catch (error) {
      setExportError(error.message || 'No se pudo descargar el reporte PDF.');
    } finally {
      setExporting(false);
    }
  };

  const totalOrdenes = (data.ordenes || []).reduce((acc, curr) => acc + Number(curr.total || 0), 0);
  const totalPiezas = (data.piezas || []).reduce((acc, curr) => acc + Number(curr.total || 0), 0);
  const totalMaquinas = (data.maquinarias || []).reduce((acc, curr) => acc + Number(curr.total || 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar
        title="Reportes y Métricas"
        role={role}
        onBack={onBack}
        onRightAction={loadSummary}
        rightActionLabel="Refrescar"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {forbidden ? (
          <ForbiddenNotice message="No tienes permisos para visualizar este panel analítico." />
        ) : null}

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.exportCard}>
          <Text style={styles.exportTitle}>Reporte completo de operaciones</Text>
          <Text style={styles.exportDescription}>
            Descarga las máquinas con sus piezas técnicas y órdenes de trabajo asociadas en un solo PDF.
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            disabled={exporting}
            onPress={handleDownloadReport}
            style={[styles.exportButton, exporting && styles.exportButtonDisabled]}>
            {exporting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.exportButtonText}>Descargar PDF</Text>
            )}
          </TouchableOpacity>
          {exportStatus ? <Text style={styles.exportStatus}>{exportStatus}</Text> : null}
          {exportError ? <Text style={styles.exportError}>{exportError}</Text> : null}
        </View>

        {role === 'tecnico' ? (
          <View style={styles.techNote}>
            <Text style={styles.techNoteText}>
              Vista Técnico: Las métricas de órdenes y piezas reflejan únicamente tus tareas y piezas creadas.
            </Text>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator size="small" color={COLORS.orange} style={styles.loader} />
        ) : (
          <View style={styles.metricsContainer}>
            {/* Sección Órdenes de Servicio */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Órdenes de Trabajo</Text>
                <View style={styles.totalBadge}>
                  <Text style={styles.totalBadgeText}>{totalOrdenes} Total</Text>
                </View>
              </View>

              <View style={styles.grid}>
                {(data.ordenes || []).map((row, idx) => (
                  <View key={idx} style={styles.statBox}>
                    <Text style={styles.statNumber}>{row.total}</Text>
                    <Text style={styles.statLabel}>
                      {(row.estado || 'sin_estado').replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                ))}
                {(data.ordenes || []).length === 0 ? (
                  <Text style={styles.emptyRow}>No hay registros de órdenes aún.</Text>
                ) : null}
              </View>
            </View>

            {/* Sección Piezas Técnicas */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Piezas & Repuestos</Text>
                <View style={styles.totalBadge}>
                  <Text style={styles.totalBadgeText}>{totalPiezas} Total</Text>
                </View>
              </View>

              <View style={styles.grid}>
                {(data.piezas || []).map((row, idx) => (
                  <View key={idx} style={styles.statBox}>
                    <Text style={styles.statNumber}>{row.total}</Text>
                    <Text style={styles.statLabel}>
                      {(row.estado_validacion || 'borrador').toUpperCase()}
                    </Text>
                  </View>
                ))}
                {(data.piezas || []).length === 0 ? (
                  <Text style={styles.emptyRow}>No hay piezas registradas en el catálogo.</Text>
                ) : null}
              </View>
            </View>

            {/* Sección Flota de Maquinaria */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Flota de Maquinaria</Text>
                <View style={styles.totalBadge}>
                  <Text style={styles.totalBadgeText}>{totalMaquinas} Total</Text>
                </View>
              </View>

              <View style={styles.grid}>
                {(data.maquinarias || []).map((row, idx) => (
                  <View key={idx} style={styles.statBox}>
                    <Text style={styles.statNumber}>{row.total}</Text>
                    <Text style={styles.statLabel}>
                      {(row.estado || 'activa').toUpperCase()}
                    </Text>
                  </View>
                ))}
                {(data.maquinarias || []).length === 0 ? (
                  <Text style={styles.emptyRow}>No hay maquinaria registrada.</Text>
                ) : null}
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loader: {
    marginVertical: 20,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  exportCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  exportTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  exportDescription: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  exportButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
    backgroundColor: COLORS.orange,
    borderRadius: 8,
    marginTop: 12,
  },
  exportButtonDisabled: {
    opacity: 0.65,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  exportStatus: {
    color: COLORS.success,
    fontSize: 12,
    marginTop: 8,
  },
  exportError: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 8,
  },
  techNote: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  techNoteText: {
    color: '#38BDF8',
    fontSize: 12,
    lineHeight: 18,
  },
  metricsContainer: {
    gap: 16,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  totalBadge: {
    backgroundColor: 'rgba(255, 106, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  totalBadgeText: {
    color: COLORS.orange,
    fontSize: 11,
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statBox: {
    flex: 1,
    minWidth: '28%',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  emptyRow: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
});

export default ReportsScreen;
