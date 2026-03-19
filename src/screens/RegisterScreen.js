import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import DropdownSelector from '../components/DropdownSelector';
import { PROVINCIAS_RD, NCF_TIPOS } from '../constants/provinces';

const PRIMARY = '#d11e51';
const SECTION_TITLE = { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 8 };
const SECTION_BORDER = { height: 1, backgroundColor: '#E0E0E0', marginBottom: 16 };
const LABEL = { fontSize: 13, color: '#555', marginBottom: 6 };
const INPUT_BASE = {
  backgroundColor: '#F5F5F5',
  borderRadius: 10,
  borderWidth: 1,
  borderColor: '#E0E0E0',
  paddingHorizontal: 16,
  height: 50,
  fontSize: 15,
  color: '#333',
};
const INPUT_ERROR = { borderColor: PRIMARY, borderWidth: 1.5 };
const ERROR_TEXT = { fontSize: 12, color: PRIMARY, marginTop: 4 };

function SectionTitle({ title }) {
  return (
    <>
      <Text style={SECTION_TITLE}>{title}</Text>
      <View style={SECTION_BORDER} />
    </>
  );
}

function FieldLabel({ label, required }) {
  return (
    <Text style={LABEL}>
      {label}
      {required ? <Text style={{ color: PRIMARY }}> *</Text> : null}
    </Text>
  );
}

function TextField({ value, onChangeText, placeholder, error, ...rest }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <TextInput
        style={[INPUT_BASE, error && INPUT_ERROR]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#999"
        {...rest}
      />
      {error ? <Text style={ERROR_TEXT}>{error}</Text> : null}
    </View>
  );
}

function PasswordField({ value, onChangeText, placeholder, error, showPassword, onToggleShow }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={[styles.passwordWrap, error && INPUT_ERROR]}>
        <TextInput
          style={styles.passwordInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#999"
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity onPress={onToggleShow} style={styles.eyeBtn}>
          <Feather name={showPassword ? 'eye-off' : 'eye'} size={22} color="#999" />
        </TouchableOpacity>
      </View>
      {error ? <Text style={ERROR_TEXT}>{error}</Text> : null}
    </View>
  );
}

export default function RegisterScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);

  // Datos personales
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [telefono, setTelefono] = useState('');
  const [telefonoCasa, setTelefonoCasa] = useState('');
  const [telefonoTrabajo, setTelefonoTrabajo] = useState('');

  // Cuenta
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Info adicional
  const [nombreReclutador, setNombreReclutador] = useState('');

  // Dirección
  const [direccion1, setDireccion1] = useState('');
  const [direccion2, setDireccion2] = useState('');
  const [provincia, setProvincia] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [codigoPostal, setCodigoPostal] = useState('');

  // Facturación
  const [tipoNcf, setTipoNcf] = useState('');

  // Términos
  const [aceptoTerminos, setAceptoTerminos] = useState(false);

  // Errores de validación
  const [errors, setErrors] = useState({});

  const provinciasOptions = useMemo(() => Object.keys(PROVINCIAS_RD).sort(), []);
  const ciudadesOptions = useMemo(() => {
    if (!provincia) return [];
    return PROVINCIAS_RD[provincia] || [];
  }, [provincia]);

  const validate = () => {
    const e = {};
    if (!nombre.trim()) e.nombre = 'Requerido';
    if (!apellidos.trim()) e.apellidos = 'Requerido';
    if (!correo.trim()) e.correo = 'Requerido';
    else if (!/^[^@]+@[^@]+\.[^@]+$/.test(correo.trim())) e.correo = 'Correo no válido';
    if (!password) e.password = 'Requerido';
    else if (password.length < 6) e.password = 'Mínimo 6 caracteres';
    if (confirmPassword !== password) e.confirmPassword = 'Las contraseñas no coinciden';
    if (!confirmPassword) e.confirmPassword = 'Requerido';
    if (!tipoNcf) e.tipoNcf = 'Seleccione tipo de NCF';
    if (!aceptoTerminos) e.terminos = 'Debes aceptar los términos';
    if (!provincia) e.provincia = 'Seleccione provincia';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    setErrors({});

    // TODO: Implementar llamada real al API de registro
    // POST /wp-json/wp/v2/users o endpoint personalizado
    // Body: { username: email, email, password, first_name, last_name, meta: { phone, address, etc } }

    await new Promise((r) => setTimeout(r, 2000));
    setLoading(false);
    setSuccessModalVisible(true);
  };

  const isFormValid = useMemo(() => {
    return (
      nombre.trim() &&
      apellidos.trim() &&
      correo.trim() &&
      /^[^@]+@[^@]+\.[^@]+$/.test(correo.trim()) &&
      password.length >= 6 &&
      confirmPassword === password &&
      tipoNcf &&
      aceptoTerminos &&
      provincia
    );
  }, [nombre, apellidos, correo, password, confirmPassword, tipoNcf, aceptoTerminos, provincia]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Datos Personales */}
        <SectionTitle title="Datos Personales" />
        <View style={styles.row}>
          <View style={styles.half}>
            <FieldLabel label="Nombre" required />
            <TextField
              value={nombre}
              onChangeText={setNombre}
              placeholder="Nombre"
              error={errors.nombre}
            />
          </View>
          <View style={styles.half}>
            <FieldLabel label="Apellidos" required />
            <TextField
              value={apellidos}
              onChangeText={setApellidos}
              placeholder="Apellidos"
              error={errors.apellidos}
            />
          </View>
        </View>
        <FieldLabel label="Fecha de inicio" required={false} />
        <TextField
          value={fechaInicio}
          onChangeText={setFechaInicio}
          placeholder="MM/DD/YYYY"
          keyboardType="default"
        />
        <FieldLabel label="Teléfono" required={false} />
        <TextField
          value={telefono}
          onChangeText={setTelefono}
          placeholder="Teléfono"
          keyboardType="phone-pad"
        />
        <FieldLabel label="Teléfono de Casa" required={false} />
        <TextField
          value={telefonoCasa}
          onChangeText={setTelefonoCasa}
          placeholder="Teléfono de Casa"
          keyboardType="phone-pad"
        />
        <FieldLabel label="Teléfono de Trabajo - si aplica" required={false} />
        <TextField
          value={telefonoTrabajo}
          onChangeText={setTelefonoTrabajo}
          placeholder="Teléfono de Trabajo"
          keyboardType="phone-pad"
        />

        {/* Cuenta */}
        <SectionTitle title="Cuenta" />
        <FieldLabel label="Correo (usuario)" required />
        <TextField
          value={correo}
          onChangeText={setCorreo}
          placeholder="Correo electrónico"
          keyboardType="email-address"
          autoCapitalize="none"
          error={errors.correo}
        />
        <FieldLabel label="Contraseña" required />
        <PasswordField
          value={password}
          onChangeText={setPassword}
          placeholder="Contraseña"
          error={errors.password}
          showPassword={showPassword}
          onToggleShow={() => setShowPassword(!showPassword)}
        />
        <FieldLabel label="Confirmar Contraseña" required />
        <PasswordField
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirmar Contraseña"
          error={errors.confirmPassword}
          showPassword={showConfirmPassword}
          onToggleShow={() => setShowConfirmPassword(!showConfirmPassword)}
        />

        {/* Información Adicional */}
        <SectionTitle title="Información Adicional" />
        <FieldLabel label="Nombre del Reclutador" required={false} />
        <TextField
          value={nombreReclutador}
          onChangeText={setNombreReclutador}
          placeholder="Nombre del Reclutador"
        />

        {/* Dirección */}
        <SectionTitle title="Dirección" />
        <FieldLabel label="Dirección, línea 1" required={false} />
        <TextField value={direccion1} onChangeText={setDireccion1} placeholder="Dirección" />
        <FieldLabel label="Dirección, línea 2 - opcional" required={false} />
        <TextField value={direccion2} onChangeText={setDireccion2} placeholder="Opcional" />
        <View style={styles.row}>
          <View style={styles.half}>
            <FieldLabel label="Provincia / Región" required />
            <DropdownSelector
              label="Provincia / Región"
              value={provincia}
              options={provinciasOptions}
              onSelect={(v) => { setProvincia(v); setCiudad(''); }}
              placeholder="Seleccione provincia"
              hasError={!!errors.provincia}
            />
            {errors.provincia ? <Text style={ERROR_TEXT}>{errors.provincia}</Text> : null}
          </View>
          <View style={styles.half}>
            <FieldLabel label="Ciudad" required={false} />
            <DropdownSelector
              label="Ciudad"
              value={ciudad}
              options={ciudadesOptions}
              onSelect={setCiudad}
              disabled={!provincia}
              placeholder={provincia ? 'Seleccione ciudad' : 'Primero seleccione provincia'}
            />
          </View>
        </View>
        <FieldLabel label="Código Postal / ZIP" required={false} />
        <TextField
          value={codigoPostal}
          onChangeText={setCodigoPostal}
          placeholder="Código Postal"
        />
        <FieldLabel label="País" required={false} />
        <View style={styles.fixedCountry}>
          <Text style={styles.fixedCountryText}>República Dominicana</Text>
        </View>

        {/* Facturación */}
        <SectionTitle title="Facturación" />
        <FieldLabel label="Tipo de NCF" required />
        <DropdownSelector
          label="Tipo de NCF"
          value={tipoNcf}
          options={NCF_TIPOS}
          onSelect={setTipoNcf}
          placeholder="Seleccione tipo de NCF"
          hasError={!!errors.tipoNcf}
        />
        {errors.tipoNcf ? <Text style={ERROR_TEXT}>{errors.tipoNcf}</Text> : null}

        {/* Términos */}
        <View style={styles.termsRow}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setAceptoTerminos(!aceptoTerminos)}
            activeOpacity={0.8}
          >
            {aceptoTerminos ? (
              <Feather name="check-square" size={24} color={PRIMARY} />
            ) : (
              <Feather name="square" size={24} color="#999" />
            )}
          </TouchableOpacity>
          <View style={styles.termsTextWrap}>
            <Text style={styles.termsText}>He leído y estoy de acuerdo, acepto </Text>
            <TouchableOpacity onPress={() => setTermsModalVisible(true)} activeOpacity={0.8}>
              <Text style={styles.termsLink}>términos y condiciones</Text>
            </TouchableOpacity>
          </View>
        </View>
        {errors.terminos ? <Text style={ERROR_TEXT}>{errors.terminos}</Text> : null}

        {/* Botón Crear Cuenta */}
        <TouchableOpacity
          style={[styles.submitBtn, (!isFormValid || loading) && styles.submitBtnDisabled]}
          onPress={handleRegister}
          disabled={!isFormValid || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <View style={styles.submitBtnLoading}>
              <ActivityIndicator color="#FFF" size="small" />
              <Text style={styles.submitBtnText}>Creando cuenta...</Text>
            </View>
          ) : (
            <Text style={styles.submitBtnText}>Crear Cuenta</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Modal términos y condiciones */}
      <Modal visible={termsModalVisible} transparent animationType="fade">
        <View style={styles.termsModalOverlay}>
          <View style={styles.termsModalBox}>
            <Text style={styles.termsModalTitle}>Términos y condiciones</Text>
            <ScrollView
              style={styles.termsModalScroll}
              showsVerticalScrollIndicator={true}
            >
              <Text style={styles.termsModalBody}>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
                exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute
                irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
                pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia
                deserunt mollit anim id est laborum. Curabitur pretium tincidunt lacus. Nulla
                facilisi. Ut fringilla. Suspendisse potenti. Nunc feugiat mi a tellus consequat
                imperdiet. Vestibulum sapien proin quam etiam ultricies. Lorem ipsum dolor sit amet
                consectetur adipiscing elit.
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.termsModalBtn}
              onPress={() => setTermsModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.termsModalBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal éxito */}
      <Modal visible={successModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalIcon}>✅</Text>
            <Text style={styles.modalTitle}>¡Cuenta creada exitosamente!</Text>
            <Text style={styles.modalMessage}>
              Tu solicitud ha sido recibida. Un administrador revisará tu registro y te contactará pronto.
            </Text>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => {
                setSuccessModalVisible(false);
                navigation.navigate('Login');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.modalBtnText}>Volver al Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 0 },
  half: { flex: 1 },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    height: 50,
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 0,
  },
  eyeBtn: { padding: 8 },
  fixedCountry: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    height: 50,
    justifyContent: 'center',
    marginBottom: 12,
  },
  fixedCountryText: { fontSize: 15, color: '#666' },
  termsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 12 },
  checkbox: { marginRight: 10 },
  termsTextWrap: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  termsText: { fontSize: 14, color: '#555' },
  termsLink: { color: PRIMARY, textDecorationLine: 'underline', fontSize: 14 },
  termsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  termsModalBox: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    maxHeight: '70%',
    width: '100%',
  },
  termsModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  termsModalScroll: { maxHeight: 280, marginBottom: 16 },
  termsModalBody: { fontSize: 14, color: '#555', lineHeight: 22 },
  termsModalBtn: {
    backgroundColor: PRIMARY,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  termsModalBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  submitBtn: {
    backgroundColor: PRIMARY,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnDisabled: { backgroundColor: '#999' },
  submitBtnLoading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
  },
  modalIcon: { fontSize: 48, marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 12, textAlign: 'center' },
  modalMessage: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 24 },
  modalBtn: { backgroundColor: PRIMARY, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 10 },
  modalBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
