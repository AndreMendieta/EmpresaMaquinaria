import { Alert } from 'react-native';

export default function confirmHome(onConfirm) {
  Alert.alert(
    'Ir al menú principal',
    'Si tienes cambios sin guardar, se perderán. ¿Quieres continuar?',
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Ir al menú', onPress: onConfirm },
    ],
  );
}
