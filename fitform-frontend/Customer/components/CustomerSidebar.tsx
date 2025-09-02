import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform, Image, Alert, ScrollView } from 'react-native';
import { Link, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const isMobile = SCREEN_WIDTH < 600;

interface CustomerSidebarProps {
  open?: boolean;
  setOpen?: (open: boolean) => void;
}

const CustomerSidebar: React.FC<CustomerSidebarProps> = ({ open, setOpen }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const isSidebarOpen = typeof open === 'boolean' ? open : !isMobile;
  const handleSetOpen = setOpen || (() => {});
  const [historyOpen, setHistoryOpen] = useState(false);

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

  const menuItems = [
    { name: 'Dashboard', icon: 'home', path: '/customer/dashboard' },
    { name: 'Appointments', icon: 'calendar', path: '/customer/appointments' },
    { name: 'Orders', icon: 'list', path: '/customer/orders' },
    { name: 'Sizing', icon: 'body', path: '/customer/sizing' },
    { name: 'Preferences', icon: 'settings', path: '/customer/preferences' },
  ];

  if (!isSidebarOpen && isMobile) {
    return null;
  }

  if (isSidebarOpen && isMobile) {
    return (
      <>
        <TouchableOpacity
          style={styles.mobileOverlay}
          activeOpacity={1}
          onPress={() => handleSetOpen(false)}
        />
        <View style={styles.mobileSidebar}>
          <View style={styles.logoArea}>
            <TouchableOpacity style={styles.closeButton} onPress={() => handleSetOpen(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Image source={require('../../assets/images/priva-logo.jpg')} style={styles.logoImage} resizeMode="contain" />
            <Text style={styles.brandName}>Priva Atelier</Text>
            <Text style={styles.brandSubtitle}>GOWN SUITS BARONG</Text>
          </View>
          <ScrollView 
            style={styles.menuContainer} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.menuScrollContent}
            bounces={false}
            overScrollMode="never"
          >
            {menuItems.map((item) => (
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
                    color={pathname === item.path ? '#fff' : '#fff'}
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
            {/* History Dropdown */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setHistoryOpen((open) => !open)}
              activeOpacity={0.7}
            >
              <Ionicons name="time" size={24} color="#fff" />
              <Text style={styles.menuText}>History</Text>
              <Ionicons
                name={historyOpen ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#fff"
                style={{ marginLeft: 'auto' }}
              />
            </TouchableOpacity>
            {historyOpen && (
              <View style={styles.dropdownContainer}>
                <Link href={"/measurement-history" as any} asChild>
                  <TouchableOpacity
                    style={
                      pathname === '/measurement-history'
                        ? { ...styles.dropdownItem, ...styles.activeDropdownItem }
                        : styles.dropdownItem
                    }
                    onPress={() => handleSetOpen(false)}
                  >
                    <Ionicons
                      name="analytics"
                      size={18}
                      color={pathname === '/measurement-history' ? '#FFD700' : '#fff'}
                      style={styles.dropdownIcon}
                    />
                    <Text
                      style={
                        pathname === '/measurement-history'
                          ? { ...styles.dropdownText, ...styles.activeDropdownText }
                          : styles.dropdownText
                      }
                    >
                      Measurement History
                    </Text>
                  </TouchableOpacity>
                </Link>
                <Link href={"/customer/rental-purchase-history" as any} asChild>
                  <TouchableOpacity
                    style={
                      pathname === '/customer/rental-purchase-history'
                        ? { ...styles.dropdownItem, ...styles.activeDropdownItem }
                        : styles.dropdownItem
                    }
                    onPress={() => handleSetOpen(false)}
                  >
                    <Ionicons
                      name="receipt"
                      size={18}
                      color={pathname === '/customer/rental-purchase-history' ? '#FFD700' : '#fff'}
                      style={styles.dropdownIcon}
                    />
                    <Text
                      style={
                        pathname === '/customer/rental-purchase-history'
                          ? { ...styles.dropdownText, ...styles.activeDropdownText }
                          : styles.dropdownText
                      }
                    >
                      Rental & Purchase History
                    </Text>
                  </TouchableOpacity>
                </Link>
              </View>
            )}
          </ScrollView>
        </View>
      </>
    );
  }

  // Desktop sidebar
  return (
    <View style={styles.container}>
      <View style={styles.logoArea}>
        <Image source={require('../../assets/images/priva-logo.jpg')} style={styles.logoImage} resizeMode="contain" />
        <Text style={styles.brandName}>Priva Atelier</Text>
        <Text style={styles.brandSubtitle}>GOWN SUITS BARONG</Text>
      </View>
      <ScrollView 
        style={styles.menuContainer} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.menuScrollContent}
        bounces={false}
        overScrollMode="never"
      >
        {menuItems.map((item) => (
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
                color={pathname === item.path ? '#fff' : '#fff'}
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
        {/* History Dropdown */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setHistoryOpen((open) => !open)}
          activeOpacity={0.7}
        >
          <Ionicons name="time" size={24} color="#fff" />
          <Text style={styles.menuText}>History</Text>
          <Ionicons
            name={historyOpen ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#fff"
            style={{ marginLeft: 'auto' }}
          />
        </TouchableOpacity>
        {historyOpen && (
          <View style={styles.dropdownContainer}>
            <Link href={"/measurement-history" as any} asChild>
              <TouchableOpacity
                style={
                  pathname === '/measurement-history'
                    ? { ...styles.dropdownItem, ...styles.activeDropdownItem }
                    : styles.dropdownItem
                }
                onPress={() => handleSetOpen(false)}
              >
                <Ionicons
                  name="analytics"
                  size={18}
                  color={pathname === '/measurement-history' ? '#FFD700' : '#fff'}
                  style={styles.dropdownIcon}
                />
                <Text
                  style={
                    pathname === '/measurement-history'
                      ? { ...styles.dropdownText, ...styles.activeDropdownText }
                      : styles.dropdownText
                  }
                >
                  Measurement History
                </Text>
              </TouchableOpacity>
            </Link>
            <Link href={"/customer/rental-purchase-history" as any} asChild>
              <TouchableOpacity
                style={
                  pathname === '/customer/rental-purchase-history'
                    ? { ...styles.dropdownItem, ...styles.activeDropdownItem }
                    : styles.dropdownItem
                }
                onPress={() => handleSetOpen(false)}
              >
                <Ionicons
                  name="receipt"
                  size={18}
                  color={pathname === '/customer/rental-purchase-history' ? '#FFD700' : '#fff'}
                  style={styles.dropdownIcon}
                />
                <Text
                  style={
                    pathname === '/customer/rental-purchase-history'
                      ? { ...styles.dropdownText, ...styles.activeDropdownText }
                      : styles.dropdownText
                  }
                >
                  Rental & Purchase History
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
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
  container: {
    width: 270,
    height: '100%',
    backgroundColor: '#014D40',
    zIndex: 100,
  },
  logoArea: {
    backgroundColor: '#014D40',
    alignItems: 'center',
    paddingTop: 92,
    paddingBottom: 24,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  closeButton: {
    position: 'absolute',
    top: 76,
    right: 16,
    zIndex: 10,
  },
  logoImage: {
    width: 110,
    height: 110,
    marginBottom: 12,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: '#FFD700',
    backgroundColor: '#014D40',
    overflow: 'hidden',
  },
  brandName: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  brandSubtitle: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
  menuContainer: {
    padding: 10,
    marginTop: 10,
    flex: 1,
  },
  menuScrollContent: {
    paddingBottom: 20,
    minHeight: '100%',
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
  dropdownContainer: {
    marginLeft: 40,
    marginBottom: 5,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  activeDropdownItem: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dropdownText: {
    color: '#fff',
    fontSize: 15,
  },
  dropdownIcon: {
    marginRight: 12,
  },
  activeDropdownText: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
});

export default CustomerSidebar; 