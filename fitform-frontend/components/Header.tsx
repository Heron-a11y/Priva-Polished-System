import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal, Text, Pressable, Alert, FlatList, StatusBar, Platform, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { useNotificationContext } from '../contexts/NotificationContext';

interface HeaderProps {
  onHamburgerPress?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onHamburgerPress }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const router = useRouter();
  const { logout, user, isLoading } = useAuth();
  const { triggerOrderReview } = useNotificationContext();

  const fetchNotifications = async () => {
    setLoadingNotif(true);
    try {
      const res = await apiService.request('/notifications');
      let notifArr = [];
      if (res && Array.isArray(res.data)) {
        notifArr = res.data;
      } else if (Array.isArray(res)) {
        notifArr = res;
      } else if (res && Array.isArray(res.data?.data)) {
        notifArr = res.data.data;
      } else if (res && Array.isArray(res.data?.notifications)) {
        notifArr = res.data.notifications;
      }
      setNotifications(notifArr || []);
    } catch (err) {
      setNotifications([]);
    } finally {
      setLoadingNotif(false);
    }
  };

  useEffect(() => {
    if (!isLoading && user) {
      fetchNotifications();
    }
  }, [isLoading, user]);

  const handleProfile = () => {
    setModalVisible(false);
    router.push('/profile');
  };

  const handleLogout = async () => {
    setModalVisible(false);
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to logout?');
      if (confirmed) {
        await logout();
        router.replace('/login');
      }
    } else {
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
    }
  };

  const toggleModal = () => setModalVisible((v) => !v);
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotifPress = async () => {
    setNotifVisible(true);
    await fetchNotifications();
    await apiService.request('/notifications/mark-read', { method: 'POST' });
    await fetchNotifications();
  };

  const handleNotifClose = () => setNotifVisible(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        backgroundColor="#004D40"
        barStyle="light-content"
        translucent={false}
        animated={true}
      />
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={onHamburgerPress} 
          style={styles.iconButton}
          activeOpacity={0.7}
        >
          <Ionicons name="menu" size={28} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.rightIcons}>
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={handleNotifPress}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={24} color="#fff" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={toggleModal}
            activeOpacity={0.7}
          >
            <Ionicons name="person-circle-outline" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Notifications Modal */}
      <Modal
        visible={notifVisible}
        transparent
        animationType="fade"
        onRequestClose={handleNotifClose}
      >
        <Pressable style={styles.modalOverlay} onPress={handleNotifClose}>
          <View style={styles.notifDropdown}>
            <Text style={styles.notifTitle}>Notifications</Text>
            {loadingNotif ? (
              <Text style={styles.notifEmpty}>Loading notifications...</Text>
            ) : notifications.length === 0 ? (
              <Text style={styles.notifEmpty}>No notifications</Text>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => {
                      const idMatch = item.message.match(/order #(\d+)/i);
                      const id = idMatch ? parseInt(idMatch[1], 10) : null;
                      let type: 'Purchase' | 'Rental' = 'Purchase';
                      if (/rental/i.test(item.message)) type = 'Rental';
                      if (/purchase/i.test(item.message)) type = 'Purchase';
                      if (id) {
                        triggerOrderReview({ id, type });
                      }
                      setNotifVisible(false);
                    }}
                    style={styles.notifItem}
                  >
                    <Ionicons 
                      name={item.read ? 'mail-open-outline' : 'mail-unread-outline'} 
                      size={18} 
                      color={item.read ? '#014D40' : '#FFD700'} 
                      style={{ marginRight: 8 }} 
                    />
                    <Text style={[styles.notifText, !item.read && styles.notifTextUnread]}>
                      {item.message}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Profile/Logout Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.dropdown}>
            <TouchableOpacity style={styles.dropdownItem} onPress={handleProfile}>
              <Ionicons name="person-outline" size={20} color="#014D40" style={{ marginRight: 10 }} />
              <Text style={styles.dropdownText}>My Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownItem} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#014D40" style={{ marginRight: 2 }} />
              <Text style={styles.dropdownText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#004D40',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
  },
  header: {
    width: '100%',
    height: 60,
    backgroundColor: '#004D40',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FFD700',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    zIndex: 10,
    borderWidth: 2,
    borderColor: '#004D40',
  },
  badgeText: {
    color: '#014D40',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  dropdown: {
    marginTop: 60,
    marginRight: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 8,
    width: 170,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownText: {
    color: '#014D40',
    fontSize: 16,
    fontWeight: '500',
  },
  notifDropdown: {
    marginTop: 60,
    marginRight: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 8,
    width: 260,
    maxHeight: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  notifTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#014D40',
    marginBottom: 8,
    marginLeft: 16,
  },
  notifEmpty: {
    color: '#888',
    fontStyle: 'italic',
    marginLeft: 16,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  notifText: {
    color: '#014D40',
    fontSize: 14,
    flex: 1,
  },
  notifTextUnread: {
    fontWeight: 'bold',
    color: '#FFD700',
  },
});

export default Header; 