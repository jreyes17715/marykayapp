import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Muestra un banner verde con cuenta regresiva para el envio gratis promocional.
 * Se actualiza cada minuto. Retorna null si ya expiro o no hay fecha.
 *
 * @param {{ expiresAt: string|null }} props - expiresAt: ISO date string
 */
export default function FreeShippingBanner({ expiresAt }) {
  const [remainingLabel, setRemainingLabel] = useState(null);

  useEffect(() => {
    if (!expiresAt) return;

    function computeLabel() {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) return null;
      const totalMinutes = Math.ceil(diff / 60000);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      if (hours > 0 && minutes > 0) {
        return `Envio gratis por ${hours}h ${minutes}m`;
      }
      if (hours > 0) {
        return `Envio gratis por ${hours}h`;
      }
      return `Envio gratis por ${minutes}m`;
    }

    setRemainingLabel(computeLabel());

    const interval = setInterval(() => {
      const label = computeLabel();
      setRemainingLabel(label);
      if (!label) {
        clearInterval(interval);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!remainingLabel) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{remainingLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#10b981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  text: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
