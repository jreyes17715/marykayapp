import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import colors from '../constants/colors';
import theme from '../constants/theme';

const ERROR_MESSAGES = {
  CREDENTIALS: 'Credenciales incorrectas. Verifica tu email y contraseña.',
  NETWORK: 'Error de conexión. Revisa tu internet e intenta de nuevo.',
  SERVER: 'Error del servidor. Intenta más tarde.',
  GENERIC: 'No se pudo iniciar sesión. Intenta de nuevo.',
};

function getLoginErrorMessage(error) {
  const msg = error?.message || '';
  if (msg.toLowerCase().includes('incorrecta') || msg.toLowerCase().includes('incorrect')) return ERROR_MESSAGES.CREDENTIALS;
  if (msg.toLowerCase().includes('red') || msg.toLowerCase().includes('network') || msg.toLowerCase().includes('conexión') || msg.toLowerCase().includes('timeout')) return ERROR_MESSAGES.NETWORK;
  if (msg.includes('500') || msg.toLowerCase().includes('servidor')) return ERROR_MESSAGES.SERVER;
  return msg || ERROR_MESSAGES.GENERIC;
}

export default function LoginScreen() {
  const navigation = useNavigation();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    const user = (username || '').trim();
    if (!user || !password) {
      setError('Ingresa tu email o usuario y contraseña.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(user, password);
      // Al cambiar isLoggedIn, AppNavigator muestra MainTabs automáticamente
    } catch (e) {
      setError(getLoginErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <View style={styles.content}>
        <Text style={styles.logo}>Mary Kay</Text>
        <Text style={styles.subtitle}>Inicia sesión en tu cuenta</Text>

        <TextInput
          style={styles.input}
          value={username}
          onChangeText={(t) => { setUsername(t); setError(''); }}
          placeholder="Email o usuario"
          placeholderTextColor={colors.gray}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />
        <View style={styles.passwordWrap}>
          <TextInput
            style={styles.passwordInput}
            value={password}
            onChangeText={(t) => { setPassword(t); setError(''); }}
            placeholder="Contraseña"
            placeholderTextColor={colors.gray}
            secureTextEntry={!showPassword}
            editable={!loading}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather
              name={showPassword ? 'eye-off' : 'eye'}
              size={22}
              color={colors.gray}
            />
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.loginBtnText}>Iniciar Sesión</Text>
          )}
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>o</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('ConsultantList')}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryBtnText}>Ver Consultoras</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerLinkWrap}
          onPress={() => navigation.navigate('Register')}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.registerLinkText}>
            ¿Quiero ser consultora? Regístrate aquí
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          ¿No tienes cuenta? Contacta a tu consultora
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 32,
    alignItems: 'stretch',
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.gray,
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: theme.borderRadius.input,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.secondary,
    marginBottom: 16,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    height: 50,
    fontSize: 15,
    color: '#333',
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 8,
  },
  registerLinkWrap: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  registerLinkText: {
    fontSize: 14,
    color: '#d11e51',
    textDecorationLine: 'underline',
  },
  errorText: {
    fontSize: 14,
    color: colors.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  loginBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: theme.borderRadius.button,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  loginBtnDisabled: {
    opacity: 0.8,
  },
  loginBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerText: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.lightGray,
  },
  dividerText: {
    marginHorizontal: 8,
    fontSize: 12,
    color: colors.gray,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: theme.borderRadius.button,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  secondaryBtnText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
