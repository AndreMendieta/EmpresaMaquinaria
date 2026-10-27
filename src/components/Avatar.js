import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { resolveFileUrl } from '../api/client';
import { COLORS } from '../constants/colors';

const Avatar = ({ uri, name, size = 40, square = false }) => {
  const radius = square ? size * 0.2 : size / 2;
  const box = { width: size, height: size, borderRadius: radius };

  if (uri) {
    return <Image source={{ uri: resolveFileUrl(uri) }} style={[styles.image, box]} />;
  }
  return (
    <View style={[styles.fallback, box]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>
        {(name || 'U').trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: COLORS.surface2,
    borderWidth: 2,
    borderColor: COLORS.orange,
  },
  fallback: {
    backgroundColor: 'rgba(255, 106, 0, 0.15)',
    borderWidth: 2,
    borderColor: COLORS.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: COLORS.orange,
    fontWeight: '800',
  },
});

export default Avatar;
