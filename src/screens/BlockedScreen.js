import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Linking,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function BlockedScreen() {
  const { logout } = useAuth();

  function handleContactarSoporte() {
    Linking.openURL('mailto:atencionalcliente@aromadelrosal.com').catch(() => {
      Alert.alert('Correo de soporte', 'atencionalcliente@aromadelrosal.com');
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Feather name="lock" size={80} color="#d11e51" style={styles.icon} />

        <Text style={styles.title}>Cuenta Bloqueada</Text>

        <Text style={styles.message}>
          Tu cuenta ha sido desactivada. Para mas informacion, contacta a soporte tecnico:{'\n\n'}atencionalcliente@aromadelrosal.com
        </Text>

        <TouchableOpacity
          style={styles.buttonPrimary}
          onPress={handleContactarSoporte}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonPrimaryText}>Enviar Correo a Soporte</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buttonGhost}
          onPress={logout}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonGhostText}>Cerrar Sesion</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  buttonPrimary: {
    backgroundColor: '#d11e51',
    borderRadius: 10,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonPrimaryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonGhost: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  buttonGhostText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
  },
});
