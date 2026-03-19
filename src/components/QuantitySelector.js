import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../constants/colors';

const SIZES = {
  small: {
    buttonSize: 32,
    fontSize: 16,
    valueMinWidth: 20,
  },
  medium: {
    buttonSize: 40,
    fontSize: 18,
    valueMinWidth: 28,
  },
};

export default function QuantitySelector({
  value,
  onIncrement,
  onDecrement,
  min = 1,
  max = 99,
  size = 'medium',
}) {
  const config = SIZES[size] || SIZES.medium;
  const canDecrement = value > min;
  const canIncrement = value < max;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          {
            width: config.buttonSize,
            height: config.buttonSize,
            borderRadius: config.buttonSize / 2,
          },
          !canDecrement && styles.buttonDisabled,
        ]}
        onPress={onDecrement}
        disabled={!canDecrement}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.buttonText,
            { fontSize: config.fontSize + 4 },
            !canDecrement && styles.buttonTextDisabled,
          ]}
        >
          −
        </Text>
      </TouchableOpacity>
      <Text style={[styles.value, { fontSize: config.fontSize, minWidth: config.valueMinWidth }]}>
        {value}
      </Text>
      <TouchableOpacity
        style={[
          styles.button,
          {
            width: config.buttonSize,
            height: config.buttonSize,
            borderRadius: config.buttonSize / 2,
          },
          !canIncrement && styles.buttonDisabled,
        ]}
        onPress={onIncrement}
        disabled={!canIncrement}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.buttonText,
            { fontSize: config.fontSize + 4 },
            !canIncrement && styles.buttonTextDisabled,
          ]}
        >
          +
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    borderColor: colors.gray,
    backgroundColor: colors.lightGray,
  },
  buttonText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  buttonTextDisabled: {
    color: colors.gray,
  },
  value: {
    fontWeight: 'bold',
    color: colors.secondary,
    textAlign: 'center',
    marginHorizontal: 12,
  },
});
