import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';
import { Colors } from '../../constants/Colors';
import KeyboardAvoidingWrapper from '../../components/KeyboardAvoidingWrapper';
import { getLocalImageUrl } from '../../utils/imageUrlHelper';
import EditModal from '../../components/EditModal';
import GroupedReadOnlyField from '../../components/GroupedReadOnlyField';

const { width } = Dimensions.get('window');

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  date_of_birth: string;
  gender: string;
  profile_image: string | null;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  profile_image: string | null;
  phone: string;
  city: string;
  state: string;
  created_at: string;
  updated_at: string;
}

interface ProfileStats {
  total_users: number;
  total_customers: number;
  total_admins: number;
  new_users_this_month: number;
  users_with_profile_images: number;
  users_with_complete_profiles: number;
}

export default function AdminProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const [profile, setProfile] = useState<ProfileData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: '',
    date_of_birth: '',
    gender: '',
    profile_image: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingField, setEditingField] = useState<string>('');
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'users' | 'stats'>('profile');
  const [showUsersTable, setShowUsersTable] = useState(false); // Start collapsed

  useEffect(() => {
    loadProfile();
    loadStats();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await apiService.getProfile();
      if (response.success) {
        setProfile(response.data.user);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiService.getProfileStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await apiService.getAllUsers();
      if (response.success) {
        setUsers(response.data.data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Prepare profile data, filtering out empty strings and invalid values
      const profileData = {
        name: profile.name?.trim() || '',
        email: profile.email?.trim() || '',
        phone: profile.phone?.trim() || null,
        address: profile.address?.trim() || null,
        city: profile.city?.trim() || null,
        state: profile.state?.trim() || null,
        zip_code: profile.zip_code?.trim() || null,
        country: profile.country?.trim() || null,
        date_of_birth: profile.date_of_birth?.trim() || null,
        gender: profile.gender && ['male', 'female'].includes(profile.gender) ? profile.gender : null,
      };

      const response = await apiService.updateProfile(profileData);
      if (response.success) {
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        Alert.alert('Error', response.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleImagePicker = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        // Update local state immediately for UI feedback
        setProfile(prev => ({ ...prev, profile_image: asset.uri }));
        
        // Upload image to server
        try {
          const response = await apiService.uploadProfileImage(asset.uri);
          if (response.success) {
            // Update with server response (includes proper image URL)
            setProfile(prev => ({ 
              ...prev, 
              profile_image: response.data.user.profile_image 
            }));
            // Refresh user data in AuthContext to update header
            await refreshUser();
            Alert.alert('Success', 'Profile image updated successfully');
          } else {
            Alert.alert('Error', 'Failed to upload image');
            // Revert local state on failure
            setProfile(prev => ({ ...prev, profile_image: null }));
          }
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          Alert.alert('Error', 'Failed to upload image');
          // Revert local state on failure
          setProfile(prev => ({ ...prev, profile_image: null }));
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleDeleteImage = async () => {
    try {
      await apiService.deleteProfileImage();
      setProfile(prev => ({ ...prev, profile_image: null }));
      Alert.alert('Success', 'Profile image deleted');
    } catch (error) {
      console.error('Error deleting image:', error);
      Alert.alert('Error', 'Failed to delete image');
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    try {
      setSaving(true);
      const response = await apiService.changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
        new_password_confirmation: passwordData.confirm_password,
      });

      if (response.success) {
        Alert.alert('Success', 'Password changed successfully');
        setShowPasswordModal(false);
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      } else {
        Alert.alert('Error', response.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      Alert.alert('Error', 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUserRole = async (userId: number, newRole: string) => {
    try {
      const response = await apiService.updateUserRole(userId, newRole);
      if (response.success) {
        Alert.alert('Success', 'User role updated successfully');
        loadUsers(); // Refresh users list
      } else {
        Alert.alert('Error', response.message || 'Failed to update user role');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      Alert.alert('Error', 'Failed to update user role');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleEditField = (field: string) => {
    if (field === 'profile') {
      // For grouped profile editing, we'll show a multi-field modal
      setEditingField('profile');
      setShowEditModal(true);
    } else {
      setEditingField(field);
      setShowEditModal(true);
    }
  };

  const handleSaveField = async (data: Record<string, string>) => {
    try {
      setSaving(true);
      
      if (editingField === 'profile') {
        // Handle grouped profile editing
        const updatedProfile = {
          name: data.name?.trim() || '',
          email: data.email?.trim() || '',
          phone: data.phone?.trim() || null,
          address: data.address?.trim() || null,
          city: data.city?.trim() || null,
          state: data.state?.trim() || null,
          zip_code: data.zip_code?.trim() || null,
          country: data.country?.trim() || null,
          date_of_birth: data.date_of_birth?.trim() || null,
          gender: data.gender && ['male', 'female', 'other', 'prefer_not_to_say'].includes(data.gender.toLowerCase()) ? data.gender.toLowerCase() : (data.gender === '' ? null : data.gender),
        };

        const profileData = {
          name: updatedProfile.name,
          email: updatedProfile.email,
          phone: updatedProfile.phone,
          address: updatedProfile.address,
          city: updatedProfile.city,
          state: updatedProfile.state,
          zip_code: updatedProfile.zip_code,
          country: updatedProfile.country,
          date_of_birth: updatedProfile.date_of_birth,
          gender: updatedProfile.gender,
        };

        const response = await apiService.updateProfile(profileData);
        if (response.success) {
          setProfile(updatedProfile);
          // Refresh user data in AuthContext to update header and other components
          await refreshUser();
          Alert.alert('Success', 'Profile updated successfully');
          return true;
        } else {
          Alert.alert('Error', response.message || 'Failed to update profile');
          return false;
        }
      } else {
        // Handle single field editing
        const fieldValue = data[editingField];
        const updatedProfile = { ...profile, [editingField]: fieldValue };
        
        const profileData = {
          name: updatedProfile.name?.trim() || '',
          email: updatedProfile.email?.trim() || '',
          phone: updatedProfile.phone?.trim() || null,
          address: updatedProfile.address?.trim() || null,
          city: updatedProfile.city?.trim() || null,
          state: updatedProfile.state?.trim() || null,
          zip_code: updatedProfile.zip_code?.trim() || null,
          country: updatedProfile.country?.trim() || null,
          date_of_birth: updatedProfile.date_of_birth?.trim() || null,
          gender: updatedProfile.gender && ['male', 'female', 'other', 'prefer_not_to_say'].includes(updatedProfile.gender.toLowerCase()) ? updatedProfile.gender.toLowerCase() : (updatedProfile.gender === '' ? null : updatedProfile.gender),
        };

        const response = await apiService.updateProfile(profileData);
        if (response.success) {
          setProfile(updatedProfile);
          // Refresh user data in AuthContext to update header and other components
          await refreshUser();
          Alert.alert('Success', 'Profile updated successfully');
          return true;
        } else {
          Alert.alert('Error', response.message || 'Failed to update profile');
          return false;
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const getEditFields = () => {
    if (editingField === 'profile') {
      // Return all profile fields for grouped editing
      return [
        {
          key: 'name',
          label: 'Full Name',
          value: profile.name,
          type: 'text' as const,
          placeholder: 'John Doe',
          required: true,
        },
        {
          key: 'email',
          label: 'Email Address',
          value: profile.email,
          type: 'email' as const,
          placeholder: 'john@example.com',
          required: true,
        },
        {
          key: 'phone',
          label: 'Phone Number',
          value: profile.phone,
          type: 'phone' as const,
          placeholder: '+1 (555) 123-4567',
        },
        {
          key: 'address',
          label: 'Address',
          value: profile.address,
          type: 'multiline' as const,
          placeholder: '123 Main St, Apt 4B',
          multiline: true,
          numberOfLines: 3,
        },
        {
          key: 'city',
          label: 'City',
          value: profile.city,
          type: 'text' as const,
          placeholder: 'New York',
        },
        {
          key: 'state',
          label: 'State',
          value: profile.state,
          type: 'text' as const,
          placeholder: 'NY',
        },
        {
          key: 'zip_code',
          label: 'ZIP Code',
          value: profile.zip_code,
          type: 'text' as const,
          placeholder: '10001',
        },
        {
          key: 'country',
          label: 'Country',
          value: profile.country,
          type: 'text' as const,
          placeholder: 'United States',
        },
        {
          key: 'date_of_birth',
          label: 'Date of Birth',
          value: profile.date_of_birth,
          type: 'text' as const,
          placeholder: 'YYYY-MM-DD',
        },
        {
          key: 'gender',
          label: 'Gender',
          value: profile.gender,
          type: 'radio' as const,
          placeholder: 'Select your gender',
          options: [
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'other', label: 'Other' },
            { value: 'prefer_not_to_say', label: 'Prefer not to say' },
          ],
        },
      ];
    }

    // Single field editing (fallback)
    const fieldConfigs = {
      name: {
        key: 'name',
        label: 'Full Name',
        value: profile.name,
        type: 'text' as const,
        placeholder: 'John Doe',
        required: true,
      },
      email: {
        key: 'email',
        label: 'Email Address',
        value: profile.email,
        type: 'email' as const,
        placeholder: 'john@example.com',
        required: true,
      },
      phone: {
        key: 'phone',
        label: 'Phone Number',
        value: profile.phone,
        type: 'phone' as const,
        placeholder: '+1 (555) 123-4567',
      },
      address: {
        key: 'address',
        label: 'Address',
        value: profile.address,
        type: 'multiline' as const,
        placeholder: '123 Main St, Apt 4B',
        multiline: true,
        numberOfLines: 3,
      },
      city: {
        key: 'city',
        label: 'City',
        value: profile.city,
        type: 'text' as const,
        placeholder: 'New York',
      },
      state: {
        key: 'state',
        label: 'State',
        value: profile.state,
        type: 'text' as const,
        placeholder: 'NY',
      },
      zip_code: {
        key: 'zip_code',
        label: 'ZIP Code',
        value: profile.zip_code,
        type: 'text' as const,
        placeholder: '10001',
      },
      country: {
        key: 'country',
        label: 'Country',
        value: profile.country,
        type: 'text' as const,
        placeholder: 'United States',
      },
      date_of_birth: {
        key: 'date_of_birth',
        label: 'Date of Birth',
        value: profile.date_of_birth,
        type: 'text' as const,
        placeholder: 'YYYY-MM-DD',
      },
      gender: {
        key: 'gender',
        label: 'Gender',
        value: profile.gender,
        type: 'text' as const,
        placeholder: 'Male, Female, Other',
      },
    };

    return [fieldConfigs[editingField as keyof typeof fieldConfigs]].filter(Boolean);
  };

  const renderProfileTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Profile Image Section */}
      <View style={styles.imageSection}>
        <TouchableOpacity onPress={handleImagePicker} style={styles.imageContainer}>
          <Image
            source={
              profile.profile_image
                ? { uri: getLocalImageUrl(profile.profile_image) }
                : require('../../assets/images/priva-logo.jpg')
            }
            style={styles.profileImage}
          />
          <View style={styles.imageOverlay}>
            <Ionicons name="camera" size={24} color="white" />
          </View>
        </TouchableOpacity>
        <Text style={styles.imageText}>Tap to change photo</Text>
        {profile.profile_image && (
          <TouchableOpacity onPress={handleDeleteImage} style={styles.deleteImageButton}>
            <Text style={styles.deleteImageText}>Remove Photo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Profile Information - Grouped */}
      <GroupedReadOnlyField
        title="Admin Profile Information"
        description="Your administrative profile details and contact information"
        fields={[
          { label: 'Full Name', value: profile.name },
          { label: 'Email Address', value: profile.email },
          { label: 'Phone Number', value: profile.phone },
          { label: 'Address', value: profile.address, multiline: true, numberOfLines: 3 },
          { label: 'City', value: profile.city },
          { label: 'State', value: profile.state },
          { label: 'ZIP Code', value: profile.zip_code },
          { label: 'Country', value: profile.country },
          { label: 'Date of Birth', value: profile.date_of_birth },
          { label: 'Gender', value: profile.gender },
        ]}
        onEdit={() => handleEditField('profile')}
        icon="pencil"
        editButtonText="Edit Profile"
      />

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.changePasswordButton}
          onPress={() => setShowPasswordModal(true)}
        >
          <Ionicons name="lock-closed-outline" size={20} color={Colors.primary} />
          <Text style={styles.changePasswordText}>Change Password</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.disabledButton]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="white" />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderStatsTab = () => (
    <ScrollView style={styles.tabContent}>
      {stats && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>Profile Statistics</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="people" size={32} color={Colors.primary} />
              <Text style={styles.statNumber}>{stats.total_users}</Text>
              <Text style={styles.statLabel}>Total Users</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="person" size={32} color={Colors.success} />
              <Text style={styles.statNumber}>{stats.total_customers}</Text>
              <Text style={styles.statLabel}>Customers</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="shield-checkmark" size={32} color={Colors.warning} />
              <Text style={styles.statNumber}>{stats.total_admins}</Text>
              <Text style={styles.statLabel}>Admins</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="calendar" size={32} color={Colors.info} />
              <Text style={styles.statNumber}>{stats.new_users_this_month}</Text>
              <Text style={styles.statLabel}>New This Month</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="camera" size={32} color={Colors.primary} />
              <Text style={styles.statNumber}>{stats.users_with_profile_images}</Text>
              <Text style={styles.statLabel}>With Profile Images</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="checkmark-circle" size={32} color={Colors.success} />
              <Text style={styles.statNumber}>{stats.users_with_complete_profiles}</Text>
              <Text style={styles.statLabel}>Complete Profiles</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );

  const renderUsersTab = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity
        style={styles.loadUsersButton}
        onPress={() => {
          setShowUsersModal(true);
          loadUsers();
        }}
      >
        <Ionicons name="people-outline" size={20} color={Colors.primary} />
        <Text style={styles.loadUsersText}>View All Users</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingWrapper style={styles.container} scrollEnabled={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Profile</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color={Colors.error} />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
          onPress={() => setActiveTab('profile')}
        >
          <Ionicons name="person" size={20} color={activeTab === 'profile' ? Colors.primary : Colors.text.secondary} />
          <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>Profile</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
          onPress={() => setActiveTab('stats')}
        >
          <Ionicons name="bar-chart" size={20} color={activeTab === 'stats' ? Colors.primary : Colors.text.secondary} />
          <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>Stats</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.activeTab]}
          onPress={() => setActiveTab('users')}
        >
          <Ionicons name="people" size={20} color={activeTab === 'users' ? Colors.primary : Colors.text.secondary} />
          <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>Users</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'profile' && renderProfileTab()}
      {activeTab === 'stats' && renderStatsTab()}
      {activeTab === 'users' && renderUsersTab()}

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Password</Text>
              <TextInput
                style={styles.input}
                value={passwordData.current_password}
                onChangeText={(text) => setPasswordData(prev => ({ ...prev, current_password: text }))}
                placeholder="Current password"
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                value={passwordData.new_password}
                onChangeText={(text) => setPasswordData(prev => ({ ...prev, new_password: text }))}
                placeholder="New password"
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                value={passwordData.confirm_password}
                onChangeText={(text) => setPasswordData(prev => ({ ...prev, confirm_password: text }))}
                placeholder="Confirm new password"
                secureTextEntry
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, saving && styles.disabledButton]}
                onPress={handleChangePassword}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.confirmButtonText}>Change Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Users Modal */}
      <Modal
        visible={showUsersModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUsersModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.usersModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>All Users</Text>
              <TouchableOpacity onPress={() => setShowUsersModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>
            
            {/* Collapsible Customer Monitoring Section */}
            <View style={styles.collapsibleSection}>
              <TouchableOpacity 
                style={styles.collapsibleHeader}
                onPress={() => setShowUsersTable(!showUsersTable)}
              >
                <View style={styles.collapsibleHeaderContent}>
                  <View style={styles.collapsibleHeaderLeft}>
                    <Text style={styles.collapsibleTitle}>Customer Monitoring</Text>
                    {!showUsersTable && users.length > 0 && (
                      <Text style={styles.collapsibleSubtitle}>
                        Tap to view {users.length} users • {users.filter(u => u.role === 'customer').length} customers, {users.filter(u => u.role === 'admin').length} admins
                      </Text>
                    )}
                  </View>
                  <View style={styles.collapsibleHeaderRight}>
                    <Text style={styles.userCount}>{users.length} users</Text>
                    <Ionicons 
                      name={showUsersTable ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color={Colors.text.secondary} 
                    />
                  </View>
                </View>
              </TouchableOpacity>
              
              {showUsersTable && (
                <View style={styles.collapsibleContent}>
                  <FlatList
                    data={users}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                      <View style={styles.userItem}>
                        <View style={styles.userInfo}>
                          <Text style={styles.userName}>{item.name}</Text>
                          <Text style={styles.userEmail}>{item.email}</Text>
                          <Text style={styles.userRole}>{item.role}</Text>
                        </View>
                        <View style={styles.userActions}>
                          <TouchableOpacity
                            style={[
                              styles.roleButton,
                              item.role === 'admin' ? styles.adminButton : styles.customerButton
                            ]}
                            onPress={() => handleUpdateUserRole(item.id, item.role === 'admin' ? 'customer' : 'admin')}
                          >
                            <Text style={styles.roleButtonText}>
                              {item.role === 'admin' ? 'Make Customer' : 'Make Admin'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  />
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Field Modal */}
      <EditModal
        visible={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingField('');
        }}
        title={editingField === 'profile' ? 'Edit Profile Information' : `Edit ${editingField.charAt(0).toUpperCase() + editingField.slice(1).replace('_', ' ')}`}
        fields={getEditFields()}
        onSave={handleSaveField}
        loading={saving}
        icon="pencil"
      />
    </KeyboardAvoidingWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.light,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.light,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  logoutButton: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  activeTabText: {
    color: Colors.primary,
  },
  tabContent: {
    flex: 1,
  },
  imageSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: 'white',
    marginBottom: 16,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: Colors.primary,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  deleteImageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.error,
    borderRadius: 20,
  },
  deleteImageText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  formContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  changePasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  changePasswordText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  disabledButton: {
    opacity: 0.6,
  },
  statsContainer: {
    padding: 16,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  loadUsersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadUsersText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: width * 0.9,
    maxWidth: 400,
  },
  usersModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: width * 0.95,
    height: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Colors.background.light,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  userRole: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  userActions: {
    marginLeft: 12,
  },
  roleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  adminButton: {
    backgroundColor: Colors.warning,
  },
  customerButton: {
    backgroundColor: Colors.success,
  },
  roleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  // Collapsible Section Styles
  collapsibleSection: {
    marginVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.background.light,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  collapsibleHeader: {
    padding: 16,
    backgroundColor: Colors.background.light,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  collapsibleHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collapsibleHeaderLeft: {
    flex: 1,
    marginRight: 16,
  },
  collapsibleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  collapsibleSubtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  collapsibleHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userCount: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  collapsibleContent: {
    padding: 8,
    backgroundColor: Colors.background.light,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
});
