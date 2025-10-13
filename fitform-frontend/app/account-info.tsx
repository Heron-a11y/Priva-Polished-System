import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import KeyboardAvoidingWrapper from '../components/KeyboardAvoidingWrapper';
import EditModal from '../components/EditModal';
import GroupedReadOnlyField from '../components/GroupedReadOnlyField';

export default function AccountInfoScreen() {
  const [name, setName] = useState('John Doe');
  const [email, setEmail] = useState('john@example.com');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingField, setEditingField] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleEditField = (field: string) => {
    if (field === 'account') {
      // For grouped account editing
      setEditingField('account');
      setShowEditModal(true);
    } else {
      setEditingField(field);
      setShowEditModal(true);
    }
  };

  const handleSaveField = async (data: Record<string, string>) => {
    try {
      setSaving(true);
      
      if (editingField === 'account') {
        // Handle grouped account editing
        setName(data.name);
        setEmail(data.email);
      } else if (editingField === 'name') {
        setName(data.name);
      } else if (editingField === 'email') {
        setEmail(data.email);
      }
      
      Alert.alert('Success', 'Account updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating account:', error);
      Alert.alert('Error', 'Failed to update account');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const getEditFields = () => {
    if (editingField === 'account') {
      // Return all account fields for grouped editing
      return [
        {
          key: 'name',
          label: 'Full Name',
          value: name,
          type: 'text' as const,
          placeholder: 'John Doe',
          required: true,
        },
        {
          key: 'email',
          label: 'Email Address',
          value: email,
          type: 'email' as const,
          placeholder: 'john@example.com',
          required: true,
        },
      ];
    }

    // Single field editing (fallback)
    const fieldConfigs = {
      name: {
        key: 'name',
        label: 'Full Name',
        value: name,
        type: 'text' as const,
        placeholder: 'John Doe',
        required: true,
      },
      email: {
        key: 'email',
        label: 'Email Address',
        value: email,
        type: 'email' as const,
        placeholder: 'john@example.com',
        required: true,
      },
    };

    return [fieldConfigs[editingField as keyof typeof fieldConfigs]].filter(Boolean);
  };

  return (
    <KeyboardAvoidingWrapper style={styles.container}>
      <View style={styles.contentContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#014D40" />
        </TouchableOpacity>
        <Text style={styles.title}>Account Information</Text>
        
        <GroupedReadOnlyField
          title="Account Information"
          description="Your basic account details"
          fields={[
            { label: 'Full Name', value: name },
            { label: 'Email Address', value: email },
          ]}
          onEdit={() => handleEditField('account')}
          icon="pencil"
          editButtonText="Edit Account"
        />

        {/* Edit Field Modal */}
        <EditModal
          visible={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingField('');
          }}
          title={editingField === 'account' ? 'Edit Account Information' : `Edit ${editingField.charAt(0).toUpperCase() + editingField.slice(1)}`}
          fields={getEditFields()}
          onSave={handleSaveField}
          loading={saving}
          icon="pencil"
        />
      </View>
    </KeyboardAvoidingWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  contentContainer: { flex: 1, padding: 24 },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  backButton: {
    position: 'absolute',
    top: 24,
    left: 16,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, color: '#014D40', marginTop: 24 },
  label: { fontSize: 16, color: '#014D40', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#ddd', marginBottom: 4 },
  saveButton: { backgroundColor: '#014D40', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
}); 