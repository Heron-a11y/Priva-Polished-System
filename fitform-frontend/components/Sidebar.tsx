import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform, Image } from 'react-native';
import { Link, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;
const isMobile = SCREEN_WIDTH < 600;

interface SidebarProps {
  open?: boolean;
  setOpen?: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, setOpen }) => {
  const pathname = usePathname();
  const isSidebarOpen = typeof open === 'boolean' ? open : !isMobile;
  const handleSetOpen = setOpen || (() => {});
  const [historyOpen, setHistoryOpen] = useState(false);

  const menuItems = [
    { name: 'Dashboard', icon: 'home', path: '/' },
    { name: 'Appointments', icon: 'calendar', path: '/appointments' },
    { name: 'Rentals & Purchase', icon: 'shirt', path: '/rentals' },
    // Preferences will be rendered after History
  ];

  // Hamburger button for mobile (should not show if using Header)
  if (!isSidebarOpen && isMobile) {
    return null;
  }

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
          <View style={styles.logoArea}>
            <TouchableOpacity style={styles.closeButton} onPress={() => handleSetOpen(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Image source={require('../assets/images/priva-logo.jpg')} style={styles.logoImage} resizeMode="contain" />
            <Text style={styles.brandName}>Priva Atelier</Text>
            <Text style={styles.brandSubtitle}>GOWN SUITS BARONG</Text>
          </View>
          <View style={styles.menuContainer}>
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
                <Link href={"/rental-purchase-history" as any} asChild>
                  <TouchableOpacity
                    style={
                      pathname === '/rental-purchase-history'
                        ? { ...styles.dropdownItem, ...styles.activeDropdownItem }
                        : styles.dropdownItem
                    }
                    onPress={() => handleSetOpen(false)}
                  >
                    <Text
                      style={
                        pathname === '/rental-purchase-history'
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
            {/* Preferences menu item below History */}
            <Link href={"/preferences" as any} asChild>
              <TouchableOpacity
                style={
                  pathname === '/preferences'
                    ? { ...styles.menuItem, ...styles.activeMenuItem }
                    : styles.menuItem
                }
                onPress={() => handleSetOpen(false)}
              >
                <Ionicons name="settings" size={24} color={pathname === '/preferences' ? '#fff' : '#fff'} />
                <Text
                  style={
                    pathname === '/preferences'
                      ? { ...styles.menuText, ...styles.activeMenuText }
                      : styles.menuText
                  }
                >
                  Preferences
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </>
    );
  }

  // Desktop sidebar
  return (
    <View style={styles.container}>
      <View style={styles.logoArea}>
        <Image source={require('../assets/images/priva-logo.jpg')} style={styles.logoImage} resizeMode="contain" />
        <Text style={styles.brandName}>Priva Atelier</Text>
        <Text style={styles.brandSubtitle}>GOWN SUITS BARONG</Text>
      </View>
      <View style={styles.menuContainer}>
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
            <Link href={"/rental-purchase-history" as any} asChild>
              <TouchableOpacity
                style={
                  pathname === '/rental-purchase-history'
                    ? { ...styles.dropdownItem, ...styles.activeDropdownItem }
                    : styles.dropdownItem
                }
                onPress={() => handleSetOpen(false)}
              >
                <Text
                  style={
                    pathname === '/rental-purchase-history'
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
        {/* Preferences menu item below History */}
        <Link href={"/preferences" as any} asChild>
          <TouchableOpacity
            style={
              pathname === '/preferences'
                ? { ...styles.menuItem, ...styles.activeMenuItem }
                : styles.menuItem
            }
            onPress={() => handleSetOpen(false)}
          >
            <Ionicons name="settings" size={24} color={pathname === '/preferences' ? '#fff' : '#fff'} />
            <Text
              style={
                pathname === '/preferences'
                  ? { ...styles.menuText, ...styles.activeMenuText }
                  : styles.menuText
              }
            >
              Preferences
            </Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mobileOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 998,
  },
  mobileSidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 270,
    height: '100%',
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
    paddingTop: 32,
    paddingBottom: 24,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
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
  activeDropdownText: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
});

export default Sidebar; 