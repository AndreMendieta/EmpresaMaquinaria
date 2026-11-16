export default function confirmHome(onConfirm) {
  // eslint-disable-next-line no-alert
  if (window.confirm('Si tienes cambios sin guardar, se perderán. ¿Quieres ir al menú principal?')) {
    onConfirm();
  }
}
