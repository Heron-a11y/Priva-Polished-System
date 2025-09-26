import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth > 768;

interface MeasurementHistory {
  id: number;
  measurement_type: string;
  measurements: Record<string, number>;
  unit_system: string;
  confidence_score?: number;
  body_landmarks?: any;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface MeasurementStats {
  total_measurements: number;
  ar_measurements: number;
  manual_measurements: number;
  latest_measurement?: MeasurementHistory;
  measurements_this_month: number;
}

const MeasurementHistoryScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  
  console.log('MeasurementHistoryScreen - User:', user);
  const [measurements, setMeasurements] = useState<MeasurementHistory[]>([]);
  const [stats, setStats] = useState<MeasurementStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMeasurement, setSelectedMeasurement] = useState<MeasurementHistory | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNotes, setEditingNotes] = useState('');
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [unitFilter, setUnitFilter] = useState<'all' | 'cm' | 'inches' | 'feet'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'ar' | 'manual'>('all');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [filtering, setFiltering] = useState(false);

  useEffect(() => {
    fetchMeasurementHistory();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchMeasurementHistory();
  }, [unitFilter, typeFilter]);

  const fetchMeasurementHistory = async () => {
    try {
      setFiltering(true);
      console.log('Fetching measurement history with filters:', { unitFilter, typeFilter });
      const params: any = {};
      if (unitFilter !== 'all') params.unit_system = unitFilter;
      if (typeFilter !== 'all') params.type = typeFilter;
      
      console.log('API params:', params);
      const response = await apiService.getMeasurementHistory(params);
      console.log('Measurement history response:', response);
      if (response && response.data) {
        setMeasurements(response.data);
        console.log('Filtered measurements count:', response.data.length);
      } else {
        setMeasurements([]);
      }
    } catch (error) {
      console.error('Error fetching measurement history:', error);
      Alert.alert('Error', 'Failed to load measurement history. Please check your connection and try again.');
      setMeasurements([]);
    } finally {
      setLoading(false);
      setFiltering(false);
    }
  };

  const fetchStats = async () => {
    try {
      console.log('Fetching measurement stats...');
      const response = await apiService.getMeasurementHistoryStats();
      console.log('Stats response:', response);
      if (response && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Set default stats if there's an error
      setStats({
        total_measurements: 0,
        ar_measurements: 0,
        manual_measurements: 0,
        measurements_this_month: 0
      });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchMeasurementHistory(), fetchStats()]);
    setRefreshing(false);
  };

  const handleDeleteMeasurement = async (id: number) => {
    Alert.alert(
      'Delete Measurement',
      'Are you sure you want to delete this measurement? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteMeasurementHistory(id);
              await fetchMeasurementHistory();
              await fetchStats();
              Alert.alert('Success', 'Measurement deleted successfully');
            } catch (error) {
              console.error('Error deleting measurement:', error);
              Alert.alert('Error', 'Failed to delete measurement');
            }
          }
        }
      ]
    );
  };

  const handleEditNotes = (measurement: MeasurementHistory) => {
    setSelectedMeasurement(measurement);
    setEditingNotes(measurement.notes || '');
    setModalVisible(true);
  };

  const saveNotes = async () => {
    if (!selectedMeasurement) return;

    try {
      await apiService.updateMeasurementHistory(selectedMeasurement.id, {
        notes: editingNotes
      });
      setModalVisible(false);
      await fetchMeasurementHistory();
      Alert.alert('Success', 'Notes updated successfully');
    } catch (error) {
      console.error('Error updating notes:', error);
      Alert.alert('Error', 'Failed to update notes');
    }
  };

  const formatMeasurementValue = (value: number, unit: string): string => {
    switch (unit) {
      case 'inches':
        return `${value} in`;
      case 'feet':
        if (typeof value === 'object' && value.feet !== undefined) {
          return `${value.feet}'${value.inches}"`;
        }
        return `${value} ft`;
      case 'cm':
      default:
        return `${value} cm`;
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'all': return 'All';
      case 'ar': return 'AR';
      case 'manual': return 'Manual';
      default: return 'All';
    }
  };

  const getUnitLabel = (unit: string): string => {
    switch (unit) {
      case 'all': return 'All';
      case 'cm': return 'cm';
      case 'inches': return 'inches';
      case 'feet': return 'feet';
      default: return 'All';
    }
  };

  const renderStatsCard = () => {
    return (
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Measurement Statistics</Text>
        <View style={styles.statsGrid}>
          {/* First Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="bar-chart" size={24} color={Colors.primary} style={styles.statIcon} />
              <Text style={styles.statNumber}>{stats?.total_measurements || 0}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="scan" size={24} color={Colors.primary} style={styles.statIcon} />
              <Text style={styles.statNumber}>{stats?.ar_measurements || 0}</Text>
              <Text style={styles.statLabel}>AR</Text>
            </View>
          </View>
          {/* Second Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="create" size={24} color={Colors.primary} style={styles.statIcon} />
              <Text style={styles.statNumber}>{stats?.manual_measurements || 0}</Text>
              <Text style={styles.statLabel}>Manual</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="calendar" size={24} color={Colors.primary} style={styles.statIcon} />
              <Text style={styles.statNumber}>{stats?.measurements_this_month || 0}</Text>
              <Text style={styles.statLabel}>This Month</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderFilters = () => (
    <View style={[
      styles.filtersContainer,
      (showTypeDropdown || showUnitDropdown) && styles.filtersContainerWithDropdown
    ]}>
      <View style={styles.filtersRow}>
        {/* Type Filter */}
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Type:</Text>
          <View style={styles.dropdownContainer}>
            <TouchableOpacity 
              style={[
                styles.dropdownButton,
                showTypeDropdown && styles.dropdownButtonActive
              ]}
              onPress={() => {
                setShowTypeDropdown(!showTypeDropdown);
                setShowUnitDropdown(false); // Close unit dropdown when type dropdown opens
              }}
            >
              <Text style={styles.dropdownButtonText}>
                {getTypeLabel(typeFilter)}
              </Text>
              <Ionicons 
                name={showTypeDropdown ? "chevron-up" : "chevron-down"} 
                size={18} 
                color={Colors.primary} 
              />
            </TouchableOpacity>
            
            {showTypeDropdown && (
              <>
                <View style={styles.dropdownMenu}>
                  {['all', 'ar', 'manual'].map((type, index) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.dropdownItem,
                        typeFilter === type && styles.dropdownItemActive,
                        index === 0 && styles.dropdownItemFirst,
                        index === 2 && styles.dropdownItemLast
                      ]}
                      onPress={() => {
                        setTypeFilter(type as any);
                        setShowTypeDropdown(false);
                      }}
                    >
                    <Text style={[
                      styles.dropdownItemText,
                      typeFilter === type && styles.dropdownItemTextActive
                    ]}>
                      {type === 'all' ? 'All' : type === 'ar' ? 'AR' : 'Manual'}
                    </Text>
                      {typeFilter === type && (
                        <Ionicons name="checkmark" size={16} color={Colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.dropdownOverlay}
                  onPress={() => setShowTypeDropdown(false)}
                  activeOpacity={1}
                />
              </>
            )}
          </View>
        </View>

        {/* Unit Filter */}
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Unit:</Text>
          <View style={styles.dropdownContainer}>
            <TouchableOpacity 
              style={[
                styles.dropdownButton,
                showUnitDropdown && styles.dropdownButtonActive
              ]}
              onPress={() => {
                setShowUnitDropdown(!showUnitDropdown);
                setShowTypeDropdown(false); // Close type dropdown when unit dropdown opens
              }}
            >
              <Text style={styles.dropdownButtonText}>
                {getUnitLabel(unitFilter)}
              </Text>
              <Ionicons 
                name={showUnitDropdown ? "chevron-up" : "chevron-down"} 
                size={18} 
                color={Colors.primary} 
              />
            </TouchableOpacity>
            
            {showUnitDropdown && (
              <>
                <View style={styles.dropdownMenu}>
                  {['all', 'cm', 'inches', 'feet'].map((unit, index) => (
                    <TouchableOpacity
                      key={unit}
                      style={[
                        styles.dropdownItem,
                        unitFilter === unit && styles.dropdownItemActive,
                        index === 0 && styles.dropdownItemFirst,
                        index === 3 && styles.dropdownItemLast
                      ]}
                      onPress={() => {
                        setUnitFilter(unit as any);
                        setShowUnitDropdown(false);
                      }}
                    >
                    <Text style={[
                      styles.dropdownItemText,
                      unitFilter === unit && styles.dropdownItemTextActive
                    ]}>
                      {unit === 'all' ? 'All' : unit}
                    </Text>
                      {unitFilter === unit && (
                        <Ionicons name="checkmark" size={16} color={Colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.dropdownOverlay}
                  onPress={() => setShowUnitDropdown(false)}
                  activeOpacity={1}
                />
              </>
            )}
          </View>
        </View>
      </View>
    </View>
  );

  const renderMeasurementCard = (measurement: MeasurementHistory) => (
    <TouchableOpacity 
      key={measurement.id} 
      style={styles.measurementCard}
      onPress={() => {
        setSelectedMeasurement(measurement);
        setDetailsModalVisible(true);
      }}
      activeOpacity={0.7}
    >
      {/* Header with Icon and Actions */}
      <View style={styles.measurementHeader}>
        <View style={styles.measurementInfo}>
          <View style={styles.titleRow}>
            <View style={styles.measurementIconContainer}>
              <Ionicons 
                name={measurement.measurement_type === 'ar' ? 'scan' : 'create'} 
                size={18} 
                color="#fff" 
              />
            </View>
            <Text style={styles.measurementType}>
              {measurement.measurement_type.toUpperCase()} Measurement
            </Text>
          </View>
          <Text style={styles.measurementDate}>
            {formatDate(measurement.created_at)}
          </Text>
        </View>
        <View style={styles.measurementActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              handleEditNotes(measurement);
            }}
          >
            <Ionicons name="create-outline" size={18} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDeleteMeasurement(measurement.id);
            }}
          >
            <Ionicons name="trash-outline" size={18} color="#ff6b6b" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Confidence Score */}
      {measurement.confidence_score && (
        <View style={styles.confidenceContainer}>
          <Text style={styles.confidenceLabel}>Confidence:</Text>
          <Text style={styles.confidenceValue}>
            {Math.round(measurement.confidence_score)}%
          </Text>
        </View>
      )}

      {/* Notes Section */}
      {measurement.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Notes:</Text>
          <Text style={styles.notesText} numberOfLines={2}>
            {measurement.notes}
          </Text>
        </View>
      )}
      
      {/* Footer */}
      <View style={styles.cardFooter}>
        <Text style={styles.viewDetailsText}>Tap to view details</Text>
        <Ionicons name="chevron-forward" size={16} color="#666" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading measurement history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Ionicons name="analytics" size={24} color={Colors.primary} style={styles.titleIcon} />
          <Text style={styles.headerTitle}>Measurement History</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/customer/ar-measurements')}
        >
          <Ionicons name="add" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderStatsCard()}
        {renderFilters()}

        {filtering ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Filtering measurements...</Text>
          </View>
        ) : measurements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="body-outline" size={80} color="#ccc" />
            <Text style={styles.emptyTitle}>No Measurements Found</Text>
            <Text style={styles.emptySubtitle}>
              {unitFilter !== 'all' || typeFilter !== 'all' 
                ? 'No measurements match your current filters'
                : 'Start by taking your first AR measurement'
              }
            </Text>
            {unitFilter === 'all' && typeFilter === 'all' && (
              <TouchableOpacity
                style={styles.startButton}
                onPress={() => router.push('/customer/ar-measurements')}
              >
                <Text style={styles.startButtonText}>Take Measurement</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          measurements.map(renderMeasurementCard)
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Notes</Text>
            <TextInput
              style={styles.notesInput}
              value={editingNotes}
              onChangeText={setEditingNotes}
              placeholder="Add notes about this measurement..."
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={saveNotes}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Detailed Measurement Modal */}
      <Modal
        visible={detailsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Measurement Details</Text>
            <TouchableOpacity
              onPress={() => setDetailsModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {selectedMeasurement && (
              <View style={styles.orderDetailCard}>
                <Text style={styles.orderDetailTitle}>
                  {selectedMeasurement.measurement_type === 'ar' ? 'AR Measurement' : 'Manual Measurement'}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: selectedMeasurement.measurement_type === 'ar' ? '#3b82f6' + '20' : '#10b981' + '20' }]}>
                  <Text style={[styles.statusText, { color: selectedMeasurement.measurement_type === 'ar' ? '#3b82f6' : '#10b981' }]}>
                    {selectedMeasurement.measurement_type.toUpperCase()}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date:</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedMeasurement.created_at)}</Text>
                </View>

                {selectedMeasurement.confidence_score && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Confidence:</Text>
                    <Text style={styles.detailValue}>
                      {Math.round(selectedMeasurement.confidence_score)}%
                    </Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Unit System:</Text>
                  <Text style={styles.detailValue}>
                    {selectedMeasurement.unit_system.toUpperCase()}
                  </Text>
                </View>

                {selectedMeasurement.notes && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Notes:</Text>
                    <Text style={[styles.detailValue, styles.notesValue]}>
                      {selectedMeasurement.notes}
                    </Text>
                  </View>
                )}

                <View style={styles.measurementsSection}>
                  <Text style={styles.measurementsTitle}>Measurements:</Text>
                  <View style={styles.measurementsGrid}>
                    {Object.entries(selectedMeasurement.measurements)
                      .filter(([key, value]) => value !== null && value !== undefined && value !== '')
                      .length > 0 ? (
                        Object.entries(selectedMeasurement.measurements)
                          .filter(([key, value]) => value !== null && value !== undefined && value !== '')
                          .map(([key, value]) => (
                            <View key={key} style={styles.measurementItem}>
                              <Text style={styles.measurementLabel}>
                                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                              </Text>
                              <Text style={styles.measurementValue}>
                                {formatMeasurementValue(value, selectedMeasurement.unit_system)}
                              </Text>
                            </View>
                          ))
                      ) : (
                        <View style={styles.measurementItem}>
                          <Text style={styles.measurementLabel}>No measurements available</Text>
                          <Text style={styles.measurementValue}>-</Text>
                        </View>
                      )}
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    position: 'relative',
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  titleIcon: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
  },
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  statsCard: {
    marginVertical: 15,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'column',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statItem: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  filtersContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
    zIndex: 999999,
    overflow: 'visible',
  },
  filtersContainerWithDropdown: {
    zIndex: 9999999, // Ensure it's above everything when dropdown is open
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    position: 'relative',
    zIndex: 9999999,
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  filterLabel: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '600',
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 9999999,
    flex: 1,
    maxWidth: 100,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 100,
    width: 100,
    minHeight: 36,
  },
  dropdownButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownButtonText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    width: 100,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 30,
    zIndex: 9999999,
    marginTop: 4,
    maxHeight: 360,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    height: 40,
    backgroundColor: '#fff',
  },
  dropdownItemActive: {
    backgroundColor: '#F0FDF4',
  },
  dropdownItemFirst: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  dropdownItemLast: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomWidth: 0,
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#374151',
  },
  dropdownItemTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  dropdownOverlay: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    zIndex: 9999998,
  },
  measurementCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
    zIndex: 1,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  measurementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  measurementInfo: {
    flex: 1,
  },
  measurementType: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginLeft: 8,
  },
  measurementDate: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
    marginLeft: 8,
  },
  measurementActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f0fdf4',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  confidenceLabel: {
    fontSize: 14,
    color: '#374151',
    marginRight: 8,
    fontWeight: '500',
  },
  confidenceValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  notesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  startButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 15,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleIcon: {
    marginRight: 8,
  },
  measurementIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background.light,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    backgroundColor: Colors.background.light,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  orderDetailCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  orderDetailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  notesValue: {
    textAlign: 'left',
    fontStyle: 'italic',
  },
  measurementsSection: {
    marginTop: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  measurementsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  measurementsGrid: {
    flexDirection: 'column',
  },
  measurementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    flexWrap: 'wrap',
  },
  measurementLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  measurementValue: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    flexWrap: 'wrap',
  },
});

export default MeasurementHistoryScreen;
