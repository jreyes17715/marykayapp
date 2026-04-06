import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { getCallbackType, parsePaymentResponse, validateResponseHash } from '../api/azul';
import colors from '../constants/colors';
import theme from '../constants/theme';

const AZUL_URL_PREFIXES = [
  'https://pruebas.azul',
  'https://pagos.azul',
  'https://contpagos.azul',
];

/**
 * Escape HTML special characters to prevent XSS in injected form values.
 */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Embedded WebView for AZUL Payment Page.
 *
 * Props:
 * - paymentData: { fields, url, altUrl } from buildPaymentRequest()
 * - onSuccess: (response) => void — called on approved payment
 * - onDeclined: (response) => void — called on declined payment
 * - onCancel: () => void — called on cancelled payment
 * - onError: (error) => void — called on unexpected error
 */
export default function AzulPaymentWebView({ paymentData, onSuccess, onDeclined, onCancel, onError }) {
  const [loading, setLoading] = useState(true);
  const [usingAltUrl, setUsingAltUrl] = useState(false);
  const webViewRef = useRef(null);
  // Fix W-4: prevent duplicate callback handling
  const callbackHandledRef = useRef(false);

  // Fix W-3: 10-minute timeout — call onCancel if user hasn't completed payment
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!callbackHandledRef.current) {
        onCancel?.('El tiempo de pago ha expirado. Intenta de nuevo.');
      }
    }, 10 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [onCancel]);

  // Build the HTML form that auto-submits to AZUL Payment Page
  const buildFormHtml = useCallback((targetUrl) => {
    const { fields } = paymentData;
    // Fix N-2: use proper escapeHtml helper instead of only replacing "
    const inputs = Object.entries(fields)
      .map(([key, value]) => `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value)}" />`)
      .join('\n');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f8f8f8;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          }
          .loading {
            text-align: center;
            color: #6b7280;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #e5e7eb;
            border-top-color: #d11e51;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 16px;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="loading">
          <div class="spinner"></div>
          <p>Conectando con AZUL...</p>
        </div>
        <form id="azulForm" method="POST" action="${escapeHtml(targetUrl)}">
          ${inputs}
        </form>
        <script>
          document.getElementById('azulForm').submit();
        </script>
      </body>
      </html>
    `;
  }, [paymentData]);

  const handleNavigationStateChange = useCallback(async (navState) => {
    const { url } = navState;
    if (!url) return;

    // Fix N-6: hide loading overlay once navigated to AZUL's actual payment page
    if (loading && AZUL_URL_PREFIXES.some((prefix) => url.startsWith(prefix))) {
      setLoading(false);
    }

    const callbackType = getCallbackType(url);
    if (!callbackType) return;

    // Fix W-4: prevent duplicate callback handling
    if (callbackHandledRef.current) return;
    callbackHandledRef.current = true;

    const params = parsePaymentResponse(url);

    if (callbackType === 'cancelled') {
      onCancel?.();
      return;
    }

    // Validate response hash for security
    const isValid = await validateResponseHash(params);

    if (callbackType === 'approved' && params.IsoCode === '00') {
      if (!isValid) {
        onError?.('La respuesta de AZUL no pudo ser verificada. Contacta soporte.');
        return;
      }
      onSuccess?.(params);
    } else {
      onDeclined?.({
        ...params,
        hashValid: isValid,
      });
    }
  }, [loading, onSuccess, onDeclined, onCancel, onError]);

  // Fix W-6: separate HTTP error handler — does not attempt alt URL, goes straight to onError
  const handleHttpError = useCallback((syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    const statusCode = nativeEvent?.statusCode ?? 'desconocido';
    onError?.(`Error HTTP ${statusCode} al conectar con AZUL. Intenta de nuevo.`);
  }, [onError]);

  const handleError = useCallback(() => {
    // If primary URL fails, try alternate URL
    if (!usingAltUrl && paymentData.altUrl && paymentData.altUrl !== paymentData.url) {
      setUsingAltUrl(true);
      return;
    }
    onError?.('No se pudo conectar con AZUL. Intenta de nuevo.');
  }, [usingAltUrl, paymentData, onError]);

  const targetUrl = usingAltUrl ? paymentData.altUrl : paymentData.url;
  const html = buildFormHtml(targetUrl);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pago Seguro</Text>
        <View style={styles.cancelBtn} />
      </View>

      <View style={styles.webViewContainer}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Cargando pagina de pago...</Text>
          </View>
        )}
        <WebView
          ref={webViewRef}
          source={{ html }}
          // Fix W-5: tighten originWhitelist — only allow real HTTPS and the initial about:blank
          originWhitelist={['https://*', 'about:blank']}
          onNavigationStateChange={handleNavigationStateChange}
          onError={handleError}
          // Fix W-6: separate HTTP error handler
          onHttpError={handleHttpError}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState={false}
          scalesPageToFit
          style={styles.webView}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  cancelBtn: {
    minWidth: 70,
  },
  cancelText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
  },
  webViewContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6b7280',
  },
});
