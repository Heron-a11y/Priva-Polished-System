import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Dimensions, Alert } from 'react-native';
import { Link, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const isMobile = SCREEN_WIDTH < 600;

const adminMenuItems = [
  { name: 'Dashboard', icon: 'speedometer', path: '/admin/dashboard' },
  // { name: 'Manage Pickups/Returns', icon: 'swap-horizontal', path: '/admin/pickup-return' },
  { name: 'Manage Appointments', icon: 'calendar', path: '/admin/appointments' },
  { name: 'Manage Orders', icon: 'file-tray-full', path: '/admin/orders' },
  { name: 'Sizing Standards', icon: 'resize', path: '/admin/sizing' },
  { name: 'Reports', icon: 'bar-chart', path: '/admin/reports' },
  { name: 'Settings', icon: 'settings', path: '/admin/settings' },
];

interface AdminSidebarProps {
  open?: boolean;
  setOpen?: (open: boolean) => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ open, setOpen }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const isSidebarOpen = typeof open === 'boolean' ? open : !isMobile;
  const handleSetOpen = setOpen || (() => {});

  if (!isSidebarOpen && isMobile) {
    return null;
  }

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  // Overlay and sidebar for mobile
  if (isSidebarOpen && isMobile) {
    return (
      <>
        <TouchableOpacity
          style={styles.mobileOverlay}
          activeOpacity={1}
          onPress={() => handleSetOpen(false)}
        />
        <View style={styles.mobileSidebar}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={() => handleSetOpen(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <View style={styles.logoWrapper}>
              <Image source={require('../../../assets/images/priva-logo.jpg')} style={styles.logoImage} />
            </View>
            <Text style={styles.brand}>Priva Atelier</Text>
            <Text style={styles.tagline}>GOWN SUITS BARONG</Text>
          </View>
          <View style={styles.menuContainer}>
            {adminMenuItems.map((item) => (
              <Link key={item.path} href={item.path as any} asChild>
                <TouchableOpacity
                  style={
                    pathname === item.path
                      ? { ...styles.menuItem, ...styles.activeMenuItem }
                      : styles.menuItem
                  }
                  onPress={() => handleSetOpen(false)}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={24}
                    color={pathname === item.path ? '#FFD700' : '#fff'}
                  />
                  <Text
                    style={
                      pathname === item.path
                        ? { ...styles.menuText, ...styles.activeMenuText }
                        : styles.menuText
                    }
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              </Link>
            ))}
          </View>
        </View>
      </>
    );
  }

  // Desktop sidebar
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoWrapper}>
          <Image source={require('../../../assets/images/priva-logo.jpg')} style={styles.logoImage} />
        </View>
        <Text style={styles.brand}>Priva Atelier</Text>
        <Text style={styles.tagline}>GOWN SUITS BARONG</Text>
      </View>
      <View style={styles.menuContainer}>
        {adminMenuItems.map((item) => (
          <Link key={item.path} href={item.path as any} asChild>
            <TouchableOpacity
              style={
                pathname === item.path
                  ? { ...styles.menuItem, ...styles.activeMenuItem }
                  : styles.menuItem
              }
              onPress={() => handleSetOpen(false)}
            >
              <Ionicons
                name={item.icon as any}
                size={24}
                color={pathname === item.path ? '#FFD700' : '#fff'}
              />
              <Text
                style={
                  pathname === item.path
                    ? { ...styles.menuText, ...styles.activeMenuText }
                    : styles.menuText
                }
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          </Link>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 250,
    height: '100%',
    backgroundColor: '#014D40',
    zIndex: 100,
  },
  header: {
    paddingTop: 90,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 0,
    zIndex: 10,
    padding: 10,
  },
  logoWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: '#FFD700',
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: '#014D40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
    resizeMode: 'contain',
  },
  brand: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
    letterSpacing: 1,
    marginTop: 5,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFD700',
    letterSpacing: 1,
    marginTop: 2,
    textAlign: 'center',
  },
  menuContainer: {
    padding: 10,
    marginTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 5,
  },
  activeMenuItem: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  menuText: {
    marginLeft: 15,
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  activeMenuText: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  mobileOverlay: {
    position: 'absolute',
    top: -60,
    left: 0,
    width: '100%',
    height: '120%',
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 998,
  },
  mobileSidebar: {
    position: 'absolute',
    top: -60,
    left: 0,
    width: 270,
    height: '120%',
    backgroundColor: '#014D40',
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
});

export default AdminSidebar; 