module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^react-native-image-picker$': '<rootDir>/__mocks__/react-native-image-picker.js',
    '^@react-native-documents/picker$': '<rootDir>/__mocks__/react-native-documents-picker.js',
  },
  testTimeout: 30000,
};
