export default {
  alert(title, message) {
    // Los avisos nativos de React Native Web no tienen implementación.
    // eslint-disable-next-line no-alert
    window.alert([title, message].filter(Boolean).join('\n\n'));
  },
};
