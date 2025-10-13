import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, TextInput, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import KeyboardAvoidingWrapper from '../components/KeyboardAvoidingWrapper';

export default function RentalsScreen() {
  const { user } = useAuth();
  const [rentals, setRentals] = useState([]);
  const [itemName, setItemName] = useState('');

  useEffect(() => { fetchRentals(); }, []);

  const fetchRentals = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/rentals', { withCredentials: true });
      setRentals(res.data);
    } catch (e) { console.error(e); }
  };

  const createRental = async () => {
    try {
      await axios.post('http://localhost:8000/api/rentals', {
        item_name: itemName,
        rental_date: new Date().toISOString().slice(0,10)
      }, { withCredentials: true });
      setItemName('');
      fetchRentals();
    } catch (e) { console.error(e); }
  };

  return (
    <KeyboardAvoidingWrapper style={styles.container}>
      <Text style={styles.title}>My Rentals</Text>
      <FlatList
        data={rentals}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.item}>{item.item_name} - {item.status}</Text>
            <Text style={styles.date}>Rented: {item.rental_date}</Text>
            {item.return_date && <Text style={styles.date}>Returned: {item.return_date}</Text>}
          </View>
        )}
      />
      <TextInput
        style={styles.input}
        value={itemName}
        onChangeText={setItemName}
        placeholder="Wedding Dress, Tuxedo, Formal Suit"
        placeholderTextColor="#999"
      />
      <Button title="Rent Item" onPress={createRental} />
    </KeyboardAvoidingWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  card: { padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
  item: { fontSize: 18 },
  date: { fontSize: 14, color: '#888' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 8, marginVertical: 10 },
}); 