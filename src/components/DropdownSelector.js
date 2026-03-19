import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import colors from '../constants/colors';

/**
 * Selector desplegable con modal. Reutilizado en ConsultantListScreen y RegisterScreen.
 * @param {string} label - Título en el modal
 * @param {string} value - Valor seleccionado (texto)
 * @param {string[]} options - Lista de opciones (strings)
 * @param {function(string)} onSelect - Callback al elegir una opción
 * @param {boolean} disabled - Si está deshabilitado
 * @param {string} placeholder - Texto cuando no hay selección
 * @param {boolean} hasError - Si mostrar borde rojo (validación)
 */
export default function DropdownSelector({
  label,
  value,
  options,
  onSelect,
  disabled = false,
  placeholder = 'Seleccionar',
  hasError = false,
}) {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => !disabled && setModalVisible(true)}
        style={[
          styles.dropdownButton,
          disabled && styles.dropdownButtonDisabled,
          hasError && styles.dropdownButtonError,
        ]}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.dropdownText,
            !value && styles.dropdownPlaceholder,
          ]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <Text style={styles.dropdownArrow}>▼</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.dropdownOverlay}>
          <View style={styles.dropdownModal}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.dropdownClose}>Cerrar</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    onSelect(item);
                    setModalVisible(false);
                  }}
                  style={[
                    styles.dropdownItem,
                    item === value && styles.dropdownItemSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      item === value && styles.dropdownItemTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 50,
    marginBottom: 10,
  },
  dropdownButtonDisabled: {
    backgroundColor: '#F0F0F0',
    borderColor: '#E0E0E0',
  },
  dropdownButtonError: {
    borderColor: '#d11e51',
    borderWidth: 1.5,
  },
  dropdownText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  dropdownPlaceholder: {
    color: '#999',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#999',
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dropdownModal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  dropdownClose: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: 'bold',
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  dropdownItemSelected: {
    backgroundColor: '#FFF0F3',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#333',
  },
  dropdownItemTextSelected: {
    color: colors.primary,
    fontWeight: 'bold',
  },
});
