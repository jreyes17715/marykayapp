import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { getCustomers } from '../api/woocommerce';
import colors from '../constants/colors';
import theme from '../constants/theme';
import { Feather } from '@expo/vector-icons';
import DropdownSelector from '../components/DropdownSelector';
import { PROVINCIAS_RD } from '../constants/provinces';

function obtenerIniciales(nombre) {
  if (!nombre) return '?';
  const partes = nombre.trim().split(/\s+/);
  if (partes.length >= 2) {
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }
  return partes[0][0].toUpperCase();
}

export default function ConsultantListScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [consultoras, setConsultoras] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [selectedProvincia, setSelectedProvincia] = useState('');
  const [selectedCiudad, setSelectedCiudad] = useState('');

  const loadConsultants = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getCustomers();
      if (res.success && Array.isArray(res.data)) {
        const mapped = res.data.map((customer) => {
          const nombreBase = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
          const nombre =
            nombreBase ||
            customer.username ||
            customer.email ||
            'Sin nombre';
          const email = customer.email || '';
          const telefono = customer.billing?.phone || '';
          const ciudad = customer.billing?.city || '';
          const state = customer.billing?.state || '';
          return {
            id: customer.id,
            nombre,
            email,
            telefono,
            ciudad,
            state,
            iniciales: obtenerIniciales(nombre),
          };
        });
        setConsultoras(mapped);
      } else {
        setError(res.error || 'No se pudieron cargar las consultoras.');
        setConsultoras([]);
      }
    } catch (e) {
      setError('Error al conectar con la lista de consultoras.');
      setConsultoras([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConsultants();
  }, [loadConsultants]);

  const provinciasOptions = useMemo(
    () => ['Todas las provincias', ...Object.keys(PROVINCIAS_RD).sort()],
    []
  );

  const ciudadesOptions = useMemo(() => {
    if (!selectedProvincia) return [];
    return ['Todas las ciudades', ...(PROVINCIAS_RD[selectedProvincia] || [])];
  }, [selectedProvincia]);

  const handleProvinciaChange = (provinciaLabel) => {
    const prov = provinciaLabel === 'Todas las provincias' ? '' : provinciaLabel;
    setSelectedProvincia(prov);
    setSelectedCiudad('');
  };

  const handleCiudadChange = (ciudadLabel) => {
    const ciudad = ciudadLabel === 'Todas las ciudades' ? '' : ciudadLabel;
    setSelectedCiudad(ciudad);
  };

  const filtradas = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return consultoras.filter((c) => {
      const nombre = c.nombre?.toLowerCase() || '';
      const email = c.email?.toLowerCase() || '';
      const ciudad = c.ciudad?.toLowerCase() || '';
      const state = c.state?.toLowerCase() || '';

      const matchTexto =
        !q || nombre.includes(q) || email.includes(q);

      let matchProvincia = true;
      if (selectedProvincia) {
        const ciudadesProvincia = PROVINCIAS_RD[selectedProvincia] || [];
        const inProvincia = ciudad &&
          ciudadesProvincia.some(
            (name) => name.toLowerCase() === ciudad.toLowerCase()
          );
        // Si no hay ciudad, intentamos por state como fallback
        const inProvinciaPorState = !inProvincia && state &&
          state.includes(selectedProvincia.toLowerCase());
        matchProvincia = inProvincia || inProvinciaPorState;
      }

      const matchCiudad =
        !selectedCiudad ||
        (ciudad && ciudad.toLowerCase() === selectedCiudad.toLowerCase());

      return matchTexto && matchProvincia && matchCiudad;
    });
  }, [consultoras, searchText, selectedProvincia, selectedCiudad]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardRowTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.iniciales}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.nombre}
          </Text>
          <Text style={styles.cardEmail} numberOfLines={1}>
            {item.email || 'Sin email'}
          </Text>
        </View>
      </View>
      {(item.telefono || item.ciudad) && (
        <View style={styles.cardRowBottom}>
          {item.telefono ? (
            <View style={styles.cardMetaRow}>
              <Feather name="phone" size={14} color={colors.darkGray} style={styles.cardMetaIcon} />
              <Text style={styles.cardMeta}>{item.telefono}</Text>
            </View>
          ) : null}
          {item.ciudad ? (
            <View style={styles.cardMetaRow}>
              <Feather name="map-pin" size={14} color={colors.darkGray} style={styles.cardMetaIcon} />
              <Text style={styles.cardMeta}>{item.ciudad}</Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );

  const keyExtractor = (item, index) => `${item.id}-${index}`;

  if (loading && !consultoras.length) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando consultoras...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DropdownSelector
        label="Provincia"
        value={selectedProvincia || ''}
        options={provinciasOptions}
        onSelect={handleProvinciaChange}
        disabled={false}
        placeholder="Todas las provincias"
      />

      <DropdownSelector
        label="Ciudad"
        value={selectedCiudad || ''}
        options={ciudadesOptions}
        onSelect={handleCiudadChange}
        disabled={!selectedProvincia}
        placeholder={
          selectedProvincia
            ? 'Todas las ciudades'
            : 'Selecciona una provincia primero'
        }
      />

      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o email..."
          placeholderTextColor={colors.gray}
          value={searchText}
          onChangeText={setSearchText}
          autoCapitalize="none"
        />
      </View>

      <Text style={styles.counterText}>
        {filtradas.length === 0 && (selectedProvincia || selectedCiudad || searchText.trim())
          ? selectedProvincia
            ? `No se encontraron consultoras en ${selectedProvincia}. Verifica que las consultoras tengan su dirección registrada.`
            : 'No se encontraron consultoras con los filtros actuales.'
          : `Mostrando ${filtradas.length} de ${consultoras.length} consultoras`}
      </Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadConsultants}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        data={filtradas}
        keyExtractor={keyExtractor}
        contentContainerStyle={
          filtradas.length === 0 ? styles.emptyContent : styles.listContent
        }
        renderItem={renderItem}
        ListEmptyComponent={
          !loading && !error ? (
            <Text style={styles.emptyText}>No se encontraron consultoras</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightGray,
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.lightGray,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.gray,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 25,
    paddingHorizontal: 14,
    height: 45,
    marginBottom: 16,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.secondary,
  },
  counterText: {
    fontSize: 13,
    color: colors.gray,
    marginBottom: 8,
    marginLeft: 4,
  },
  listContent: {
    paddingBottom: 16,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...theme.shadow,
  },
  cardRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 2,
  },
  cardEmail: {
    fontSize: 13,
    color: colors.gray,
  },
  cardRowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  cardMeta: {
    fontSize: 13,
    color: colors.darkGray,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardMetaIcon: {
    marginRight: 4,
  },
  errorBox: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#B71C1C',
    marginBottom: 8,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.primary,
  },
  retryText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
    marginTop: 32,
  },
});
