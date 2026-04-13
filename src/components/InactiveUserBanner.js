import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function InactiveUserBanner() {
  const { user } = useAuth();

  if (user?.restrictionState !== 'inactive') {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        Tu cuenta está inactiva. Para reactivarla necesitas un pedido mínimo de RD$ 20,000 en productos con descuento.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#f59e0b',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  text: {
    color: '#ffffff',
    fontWeight: 'bold',
    textAlign: 'center',
    flexWrap: 'wrap',
  },
});
