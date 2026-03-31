import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import StoreScreen from '../screens/StoreScreen';
import CartScreen from '../screens/CartScreen';
import ProfileScreen from '../screens/ProfileScreen';
import OrdersScreen from '../screens/OrdersScreen';
import OrderTrackingScreen from '../screens/OrderTrackingScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import LoginScreen from '../screens/LoginScreen';
import ConsultantListScreen from '../screens/ConsultantListScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import LoadingSpinner from '../components/LoadingSpinner';
import { CartContext } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import colors from '../constants/colors';

const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const headerOptions = {
  headerStyle: { backgroundColor: colors.white },
  headerTintColor: colors.primary,
  headerTitleStyle: {
    fontWeight: 'bold',
    color: colors.secondary,
  },
  headerTitleAlign: 'center',
  headerTitle: 'Mary Kay',
};

const NOTIFICATIONS = [
  {
    id: '1',
    title: '¡Bienvenida a la App! 🎉',
    message:
      'Estamos felices de que estés aquí. Explora nuestro catálogo de productos Mary Kay.',
    date: '2026-03-12',
    read: false,
    type: 'welcome',
  },
  {
    id: '2',
    title: 'Nuevos productos disponibles 💄',
    message:
      'Hemos agregado nuevos productos al catálogo. ¡No te los pierdas!',
    date: '2026-03-11',
    read: false,
    type: 'product',
  },
  {
    id: '3',
    title: 'Recuerda tu meta mensual 📊',
    message:
      'Llevas buen progreso este mes. ¡Sigue así para mantener tu nivel ORO!',
    date: '2026-03-10',
    read: true,
    type: 'goal',
  },
  {
    id: '4',
    title: 'Promoción especial de Marzo 🌸',
    message:
      'Aprovecha los descuentos especiales en productos seleccionados durante todo marzo.',
    date: '2026-03-08',
    read: true,
    type: 'promo',
  },
  {
    id: '5',
    title: 'Tu pedido #1234 fue confirmado ✅',
    message:
      'Tu pedido ha sido recibido y está siendo procesado. Te notificaremos cuando esté listo.',
    date: '2026-03-05',
    read: true,
    type: 'order',
  },
];

const unreadCount = NOTIFICATIONS.filter((n) => !n.read).length;

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={({ navigation }) => ({
          ...headerOptions,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('Notifications')}
              style={{ marginRight: 16 }}
              activeOpacity={0.8}
            >
              <View>
                <Feather name="bell" size={22} color={colors.secondary} />
                {unreadCount > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -5,
                      right: -8,
                      backgroundColor: colors.primary,
                      borderRadius: 10,
                      width: 18,
                      height: 18,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: colors.white,
                        fontSize: 10,
                        fontWeight: 'bold',
                      }}
                    >
                      {unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'Notificaciones',
          headerTintColor: colors.primary,
        }}
      />
    </Stack.Navigator>
  );
}

function StoreStack() {
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen name="Store" component={StoreScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
    </Stack.Navigator>
  );
}

function CartStack() {
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen
        name="Orders"
        component={OrdersScreen}
        options={{ title: 'Mis Pedidos' }}
      />
      <Stack.Screen
        name="OrderTracking"
        component={OrderTrackingScreen}
        options={{ title: 'Seguimiento del Pedido' }}
      />
    </Stack.Navigator>
  );
}

function CartTabIcon({ focused, color }) {
  const { totalItems = 0 } = useContext(CartContext);
  const count = totalItems;
  return (
    <View style={styles.cartIconWrap}>
      <Feather name="shopping-cart" size={22} color={color} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {count > 99 ? '99+' : count}
          </Text>
        </View>
      )}
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.lightGray,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Inicio"
        component={HomeStack}
        options={{
          tabBarIcon: ({ color }) => (
            <Feather name="home" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Tienda"
        component={StoreStack}
        options={{
          tabBarIcon: ({ color }) => (
            <Feather name="shopping-bag" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Carrito"
        component={CartStack}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <CartTabIcon focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Perfil"
        component={ProfileStack}
        options={{
          tabBarIcon: ({ color }) => (
            <Feather name="user" size={22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen
        name="ConsultantList"
        component={ConsultantListScreen}
        options={{
          headerShown: true,
          title: 'Consultoras',
          headerStyle: { backgroundColor: colors.white },
          headerTintColor: colors.primary,
        }}
      />
    </AuthStack.Navigator>
  );
}

export default function AppNavigator() {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner message="Cargando..." />;
  }

  return (
    <NavigationContainer>
      {isLoggedIn ? <MainTabs /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    fontSize: 22,
  },
  cartIconWrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    right: -8,
    top: -4,
    backgroundColor: colors.primary,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
});
