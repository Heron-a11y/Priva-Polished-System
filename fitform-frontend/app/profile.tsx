import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const [name, setName] = useState('John Doe');
  const [email, setEmail] = useState('john@example.com');
  const [password, setPassword] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const router = useRouter();

  // Pick image from gallery
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setProfileImage(result.assets[0].uri);
    }
  };

  // Save profile changes (implement your API call here)
  const handleSave = () => {
    Alert.alert('Profile updated!', 'Your changes have been saved.');
    // Add your API call here
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Profile</Text>
      <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
        <Image
          source={profileImage ? { uri: profileImage } : require('../assets/images/priva-logo.jpg')}
          style={styles.profileImage}
        />
        <Text style={styles.changePhotoText}>Change/Upload Photo</Text>
      </TouchableOpacity>

      {/* List-style navigation */}
      <View style={styles.listContainer}>
        <TouchableOpacity style={styles.listItem} onPress={() => router.push('/account-info')}>
          <Text style={styles.listItemText}>Account Information</Text>
          <Ionicons name="chevron-forward" size={22} color="#014D40" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.listItem, styles.listItemLast]} onPress={() => router.push('/password')}>
          <Text style={styles.listItemText}>Password</Text>
          <Ionicons name="chevron-forward" size={22} color="#014D40" />
        </TouchableOpacity>
      </View>

      {/* Old profile form (optional: remove or keep for quick edit) */}
      {/*
      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Enter your name"
      />
      <Text style={styles.label}>Email Address</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Enter your email"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Text style={styles.label}>Change Password</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Enter new password"
        secureTextEntry
      />
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </TouchableOpacity>
      */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, color: '#014D40' },
  imagePicker: { alignItems: 'center', marginBottom: 24 },
  profileImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#FFD700', marginBottom: 8 },
  changePhotoText: { color: '#007AFF', fontSize: 14, marginBottom: 8 },
  listContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 24,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  listItemLast: {
    borderBottomWidth: 0,
  },
  listItemText: {
    fontSize: 17,
    color: '#014D40',
    fontWeight: 'bold',
  },
  label: { fontSize: 16, color: '#014D40', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#ddd', marginBottom: 4 },
  saveButton: { backgroundColor: '#014D40', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
}); 