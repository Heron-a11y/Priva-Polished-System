import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal, Text, Pressable, Alert, FlatList, StatusBar, Platform, SafeAreaView, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { useNotificationContext } from '../contexts/NotificationContext';
import { getLocalImageUrl } from '../utils/imageUrlHelper';

interface HeaderProps {
  onHamburgerPress?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onHamburgerPress }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const router = useRouter();
  const { logout, user, isLoading } = useAuth();
  const { triggerOrderReview } = useNotificationContext();

  // Debug user data
  console.log('🔍 Header - User data:', user);
  console.log('🔍 Header - Profile image:', user?.profile_image);

  const fetchNotifications = useCallback(async (page = 1, reset = false) => {
    if (reset) {
      setLoadingNotif(true);
      setCurrentPage(1);
      setHasMorePages(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('per_page', '10');
      
      const res = await apiService.request(`/notifications?${params.toString()}`);
      
      let notifArr = [];
      let pagination = null;
      
      // Handle different response structures
      if (res && res.data && Array.isArray(res.data)) {
        notifArr = res.data;
        pagination = res.pagination;
      } else if (res && Array.isArray(res.data?.data)) {
        notifArr = res.data.data;
        pagination = res.data.pagination;
      } else if (res && Array.isArray(res)) {
        notifArr = res;
      } else if (res && Array.isArray(res.data?.notifications)) {
        notifArr = res.data.notifications;
      }
      
      // Deduplicate notifications
      if (reset) {
        setNotifications(notifArr || []);
      } else {
        setNotifications(prev => {
          const existingIds = new Set(prev.map(n => n.id));
          const uniqueNew = (notifArr || []).filter(n => !existingIds.has(n.id));
          return [...prev, ...uniqueNew];
        });
      }
      
      // Update pagination state
      if (pagination) {
        setHasMorePages(pagination.current_page < pagination.last_page);
        setCurrentPage(page);
      } else {
        setHasMorePages(false);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      if (reset) {
        setNotifications([]);
      }
    } finally {
      setLoadingNotif(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && user) {
      fetchNotifications(1, true);
    }
  }, [isLoading, user, fetchNotifications]);

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
    await fetchNotifications(1, true);
  };
  
  const loadMoreNotifications = useCallback(() => {
    if (!loadingMore && hasMorePages && notifVisible) {
      fetchNotifications(currentPage + 1, false);
    }
  }, [loadingMore, hasMorePages, currentPage, notifVisible, fetchNotifications]);

  const handleNotifClose = () => setNotifVisible(false);

  return (
    <View style={styles.container}>
      <StatusBar
        backgroundColor="#004D40"
        barStyle="light-content"
        translucent={true}
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
            {user?.profile_image ? (
              <Image 
                source={{ 
                  uri: getLocalImageUrl(user.profile_image),
                  cache: 'force-cache' // Force cache for persistence
                }} 
                style={styles.profileImage}
                resizeMode="cover"
                onError={(error) => {
                  console.log('❌ Image load error:', error);
                  console.log('🔄 Trying original URL:', user.profile_image);
                  // Fallback to default icon on error
                }}
                onLoad={() => console.log('✅ Profile image loaded:', user.profile_image)}
              />
            ) : (
              <Ionicons name="person-circle-outline" size={28} color="#fff" />
            )}
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
            <View style={styles.notifTitleContainer}>
              <Text style={styles.notifTitle}>Notifications</Text>
              <View style={styles.notifTitleRight}>
                {unreadCount > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>{unreadCount}</Text>
                  </View>
                )}
                {unreadCount > 0 && (
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        await apiService.request('/notifications/mark-read', { method: 'POST' });
                        await fetchNotifications(1, true);
                      } catch (error) {
                        console.error('Error marking all notifications as read:', error);
                      }
                    }}
                    style={styles.markAllButton}
                  >
                    <Text style={styles.markAllText}>Mark All Read</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            {loadingNotif ? (
              <Text style={styles.notifEmpty}>Loading notifications...</Text>
            ) : notifications.length === 0 ? (
              <Text style={styles.notifEmpty}>No notifications</Text>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={item => item.id.toString()}
                onEndReached={loadMoreNotifications}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                  loadingMore ? (
                    <View style={styles.loadMoreContainer}>
                      <ActivityIndicator size="small" color="#014D40" />
                      <Text style={styles.loadMoreText}>Loading more...</Text>
                    </View>
                  ) : null
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={async () => {
                      // Mark notification as read
                      if (!item.read) {
                        try {
                          await apiService.request('/notifications/mark-read', {
                            method: 'POST',
                            body: JSON.stringify({ notification_id: item.id })
                          });
                          // Update local state
                          setNotifications(prev => 
                            prev.map(notif => 
                              notif.id === item.id ? { ...notif, read: true } : notif
                            )
                          );
                        } catch (error) {
                          console.error('Error marking notification as read:', error);
                        }
                      }

                      // Extract order information from notification message
                      const idMatch = item.message.match(/order #(\d+)/i);
                      const id = idMatch ? parseInt(idMatch[1], 10) : null;
                      let type: 'Purchase' | 'Rental' = 'Purchase';
                      if (/rental/i.test(item.message)) type = 'Rental';
                      if (/purchase/i.test(item.message)) type = 'Purchase';
                      
                      if (id) {
                        // Trigger order review for the specific order
                        triggerOrderReview({ id, type });
                        
                        // Navigate based on user role
                        if (user?.role === 'customer') {
                          router.push('/customer/orders');
                        } else if (user?.role === 'admin') {
                          router.push('/admin/orders');
                        }
                      } else {
                        // If no order ID found, navigate based on role
                        if (user?.role === 'customer') {
                          router.push('/customer/orders');
                        } else if (user?.role === 'admin') {
                          router.push('/admin/orders');
                        }
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
                    <View style={styles.notifContent}>
                      <Text style={[styles.notifText, !item.read && styles.notifTextUnread]}>
                        {item.message}
                      </Text>
                      {item.customer_email && (
                        <Text style={styles.customerEmail}>
                          📧 {item.customer_email}
                        </Text>
                      )}
                    </View>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
    borderRadius: 12,
    paddingVertical: 8,
    width: 300,
    maxHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 15,
  },
  notifTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  notifTitleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#014D40',
  },
  notifBadge: {
    backgroundColor: '#FFD700',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  notifBadgeText: {
    color: '#014D40',
    fontSize: 12,
    fontWeight: 'bold',
  },
  markAllButton: {
    backgroundColor: '#014D40',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  markAllText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  notifEmpty: {
    color: '#888',
    fontStyle: 'italic',
    marginLeft: 16,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: 'transparent',
  },
  notifContent: {
    flex: 1,
  },
  notifText: {
    color: '#014D40',
    fontSize: 14,
    lineHeight: 20,
  },
  notifTextUnread: {
    fontWeight: 'bold',
    color: '#014D40',
  },
  customerEmail: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  profileImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fff',
  },
  loadMoreContainer: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
  },
});

export default Header; 