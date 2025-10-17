import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../../../services/api.js';
import { useAuth } from '../../../contexts/AuthContext';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'customer';
  is_super_admin?: boolean;
  profile_image?: string;
  phone?: string;
  created_at: string;
}

const UserManagementScreen = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRole, setNewRole] = useState<'admin' | 'customer'>('customer');
  const [actionLoading, setActionLoading] = useState<{[key: number]: boolean}>({});

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAllUsers();
      
      if (response.success) {
        setUsers(response.data || []);
      } else {
        throw new Error(response.message || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const handleRoleChange = (user: User) => {
    // Check if trying to change super admin role
    if (user.is_super_admin) {
      Alert.alert(
        'Super Admin Protection',
        'This user is a super admin and cannot have their role changed. Super admin status is permanent.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check if trying to change own role
    if (user.id === currentUser?.id) {
      Alert.alert(
        'Cannot Change Own Role',
        'You cannot change your own role.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSelectedUser(user);
    setNewRole(user.role === 'admin' ? 'customer' : 'admin');
    setShowRoleModal(true);
  };

  const confirmRoleChange = async () => {
    if (!selectedUser) return;

    try {
      setActionLoading(prev => ({ ...prev, [selectedUser.id]: true }));

      const response = await apiService.updateUserRole(selectedUser.id, newRole);

      if (response.success) {
        Alert.alert('Success', `User role updated to ${newRole}`);
        setShowRoleModal(false);
        await fetchUsers();
      } else {
        throw new Error(response.message || 'Failed to update user role');
      }
    } catch (error: any) {
      console.error('Error updating user role:', error);
      Alert.alert('Error', error.message || 'Failed to update user role');
    } finally {
      setActionLoading(prev => ({ ...prev, [selectedUser.id]: false }));
    }
  };

  const getRoleColor = (role: string, isSuperAdmin?: boolean) => {
    if (isSuperAdmin) return '#FF6B35'; // Orange for super admin
    if (role === 'admin') return '#4CAF50'; // Green for admin
    return '#2196F3'; // Blue for customer
  };

  const getRoleIcon = (role: string, isSuperAdmin?: boolean) => {
    if (isSuperAdmin) return 'shield';
    if (role === 'admin') return 'person';
    return 'person-outline';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#014D40" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="people" size={24} color="#014D40" />
          <Text style={styles.title}>User Management</Text>
        </View>
      </View>

      {/* Super Admin Notice */}
      <View style={styles.noticeContainer}>
        <Ionicons name="shield" size={20} color="#FF6B35" />
        <Text style={styles.noticeText}>
          Super admins (marked with 🛡️) cannot have their roles changed for security reasons.
        </Text>
      </View>

      {/* Users List */}
      <View style={styles.usersContainer}>
        {users.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No users found</Text>
          </View>
        ) : (
          users.map((user) => (
            <View key={user.id} style={styles.userCard}>
              <View style={styles.userInfo}>
                <View style={styles.userAvatar}>
                  {user.profile_image ? (
                    <Text style={styles.avatarText}>
                      {user.name.charAt(0).toUpperCase()}
                    </Text>
                  ) : (
                    <Text style={styles.avatarText}>
                      {user.name.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={styles.userDetails}>
                  <View style={styles.userNameRow}>
                    <Text style={styles.userName}>{user.name}</Text>
                    {user.is_super_admin && (
                      <Ionicons name="shield" size={16} color="#FF6B35" />
                    )}
                  </View>
                  <Text style={styles.userEmail}>{user.email}</Text>
                  <View style={styles.roleContainer}>
                    <View style={[
                      styles.roleBadge, 
                      { backgroundColor: getRoleColor(user.role, user.is_super_admin) }
                    ]}>
                      <Ionicons 
                        name={getRoleIcon(user.role, user.is_super_admin)} 
                        size={12} 
                        color="white" 
                      />
                      <Text style={styles.roleText}>
                        {user.is_super_admin ? 'Super Admin' : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              
              <View style={styles.userActions}>
                {!user.is_super_admin && user.id !== currentUser?.id && (
                  <TouchableOpacity
                    style={styles.roleButton}
                    onPress={() => handleRoleChange(user)}
                    disabled={actionLoading[user.id]}
                  >
                    {actionLoading[user.id] ? (
                      <ActivityIndicator size="small" color="#014D40" />
                    ) : (
                      <>
                        <Ionicons name="swap-horizontal" size={16} color="#014D40" />
                        <Text style={styles.roleButtonText}>
                          {user.role === 'admin' ? 'Make Customer' : 'Make Admin'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
                
                {user.is_super_admin && (
                  <View style={styles.protectedBadge}>
                    <Ionicons name="lock-closed" size={16} color="#666" />
                    <Text style={styles.protectedText}>Protected</Text>
                  </View>
                )}
                
                {user.id === currentUser?.id && (
                  <View style={styles.currentUserBadge}>
                    <Ionicons name="person" size={16} color="#014D40" />
                    <Text style={styles.currentUserText}>You</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Role Change Modal */}
      <Modal
        visible={showRoleModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRoleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change User Role</Text>
              <TouchableOpacity onPress={() => setShowRoleModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalText}>
                Change role for <Text style={styles.boldText}>{selectedUser?.name}</Text> ({selectedUser?.email})
              </Text>
              
              <View style={styles.roleOptions}>
                <TouchableOpacity
                  style={[
                    styles.roleOption,
                    newRole === 'admin' && styles.roleOptionSelected
                  ]}
                  onPress={() => setNewRole('admin')}
                >
                  <Ionicons name="person" size={20} color={newRole === 'admin' ? 'white' : '#4CAF50'} />
                  <Text style={[
                    styles.roleOptionText,
                    newRole === 'admin' && styles.roleOptionTextSelected
                  ]}>
                    Admin
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.roleOption,
                    newRole === 'customer' && styles.roleOptionSelected
                  ]}
                  onPress={() => setNewRole('customer')}
                >
                  <Ionicons name="person-outline" size={20} color={newRole === 'customer' ? 'white' : '#2196F3'} />
                  <Text style={[
                    styles.roleOptionText,
                    newRole === 'customer' && styles.roleOptionTextSelected
                  ]}>
                    Customer
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowRoleModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmRoleChange}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#014D40',
    marginLeft: 12,
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    color: '#E65100',
    marginLeft: 8,
  },
  usersContainer: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#014D40',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  roleContainer: {
    flexDirection: 'row',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  roleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#014D40',
    gap: 4,
  },
  roleButtonText: {
    color: '#014D40',
    fontSize: 14,
    fontWeight: '600',
  },
  protectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    gap: 4,
  },
  protectedText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  currentUserBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    gap: 4,
  },
  currentUserText: {
    color: '#014D40',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#014D40',
  },
  modalBody: {
    padding: 20,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
  },
  boldText: {
    fontWeight: 'bold',
  },
  roleOptions: {
    gap: 12,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    gap: 12,
  },
  roleOptionSelected: {
    backgroundColor: '#014D40',
    borderColor: '#014D40',
  },
  roleOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  roleOptionTextSelected: {
    color: 'white',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  confirmButton: {
    backgroundColor: '#014D40',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default UserManagementScreen;
