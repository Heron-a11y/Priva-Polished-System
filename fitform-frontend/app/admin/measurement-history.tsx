import React, { useState, useEffect, useCallback } from 'react';
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
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import KeyboardAvoidingWrapper from '../../components/KeyboardAvoidingWrapper';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth > 768;

interface MeasurementHistory {
  id: number;
  user_id: number;
  admin_id?: number;
  user_name?: string;
  user_email?: string;
  admin_name?: string;
  admin_email?: string;
  measurement_type: string;
  measurements: Record<string, number>;
  unit_system: string;
  confidence_score?: number;
  body_landmarks?: any;
  notes?: string;
  status: string;
  viewed_at?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

interface MeasurementStats {
  total_measurements: number;
  ar_measurements: number;
  manual_measurements: number;
  active_measurements: number;
  archived_measurements: number;
  viewed_measurements: number;
  processed_measurements: number;
  latest_measurement?: MeasurementHistory;
  measurements_this_month: number;
  total_users: number;
  total_admins: number;
}

const AdminMeasurementHistory = () => {
  const { user } = useAuth();
  
  console.log('AdminMeasurementHistory - User:', user);
  const [measurements, setMeasurements] = useState<MeasurementHistory[]>([]);
  const [stats, setStats] = useState<MeasurementStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
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
    fetchMeasurementHistory(1, true);
    fetchStats();
  }, []);

  useEffect(() => {
    fetchMeasurementHistory(1, true);
  }, [unitFilter, typeFilter]);

  const fetchMeasurementHistory = useCallback(async (page = 1, reset = false) => {
    if (reset) {
      setLoading(true);
      setCurrentPage(1);
      setHasMorePages(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      setFiltering(true);
      console.log('Fetching admin measurement history with filters:', { unitFilter, typeFilter, page });
      const params: any = {
        page: page.toString(),
        per_page: '10'
      };
      if (unitFilter !== 'all') params.unit_system = unitFilter;
      if (typeFilter !== 'all') params.type = typeFilter;
      
      console.log('API params:', params);
      const response = await apiService.getAdminMeasurementHistory(params);
      console.log('Admin measurement history response:', response);
      if (response && response.data) {
        const newMeasurements = response.data || [];
        const pagination = response.pagination;
        
        // Deduplicate measurements
        if (reset) {
          setMeasurements(newMeasurements);
        } else {
          setMeasurements(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const uniqueNew = newMeasurements.filter((m: MeasurementHistory) => !existingIds.has(m.id));
            return [...prev, ...uniqueNew];
          });
        }
        
        setHasMorePages(pagination ? (pagination.current_page < pagination.last_page) : false);
        setCurrentPage(page);
        console.log('Filtered measurements count:', newMeasurements.length, 'Has more:', pagination ? (pagination.current_page < pagination.last_page) : false);
      } else {
        if (reset) {
          setMeasurements([]);
        }
      }
    } catch (error) {
      console.error('Error fetching admin measurement history:', error);
      if (reset) {
        Alert.alert('Error', 'Failed to load measurement history. Please check your connection and try again.');
        setMeasurements([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setFiltering(false);
    }
  }, [unitFilter, typeFilter]);

  const fetchStats = async () => {
    try {
      console.log('Fetching admin measurement stats...');
      const response = await apiService.getAdminMeasurementHistoryStats();
      console.log('Admin stats response:', response);
      if (response && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      setStats(null);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMorePages) {
      fetchMeasurementHistory(currentPage + 1, false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchMeasurementHistory(1, true), fetchStats()]);
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
              await apiService.deleteAdminMeasurementHistory(id);
              await fetchMeasurementHistory(1, true);
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
      await apiService.updateAdminMeasurementHistory(selectedMeasurement.id, {
        notes: editingNotes
      });
      setModalVisible(false);
      await fetchMeasurementHistory(1, true);
      Alert.alert('Success', 'Notes updated successfully');
    } catch (error) {
      console.error('Error updating notes:', error);
      Alert.alert('Error', 'Failed to update notes');
    }
  };

  const formatMeasurementValue = (value: number | { feet: number; inches: number }, unit: string): string => {
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
        <Text style={styles.statsTitle}>Admin Measurement Statistics</Text>
        <View style={styles.statsGrid}>
          {/* First Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="bar-chart" size={24} color={Colors.primary} style={styles.statIcon} />
              <Text style={styles.statNumber}>{stats?.total_measurements || 0}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="people" size={24} color={Colors.primary} style={styles.statIcon} />
              <Text style={styles.statNumber}>{stats?.total_users || 0}</Text>
              <Text style={styles.statLabel}>Users</Text>
            </View>
          </View>
          {/* Second Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="scan" size={24} color={Colors.primary} style={styles.statIcon} />
              <Text style={styles.statNumber}>{stats?.ar_measurements || 0}</Text>
              <Text style={styles.statLabel}>AR</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="create" size={24} color={Colors.primary} style={styles.statIcon} />
              <Text style={styles.statNumber}>{stats?.manual_measurements || 0}</Text>
              <Text style={styles.statLabel}>Manual</Text>
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading measurement history...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingWrapper style={styles.container} scrollEnabled={false}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="analytics" size={24} color={Colors.primary} style={styles.titleIcon} />
          <Text style={styles.headerTitle}>Measurement History</Text>
        </View>
      </View>

      <View style={styles.listContainer}>
        <FlatList
        data={measurements}
        renderItem={({ item: measurement }) => (
          <TouchableOpacity 
            style={styles.measurementCard}
            onPress={() => {
              setSelectedMeasurement(measurement);
              setDetailsModalVisible(true);
            }}
            activeOpacity={0.7}
          >
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
                <View style={styles.userInfo}>
                  <Ionicons name="person" size={14} color="#6b7280" />
                  <Text style={styles.userText}>
                    {/* Check if this is an admin measurement by looking for client name in notes field */}
                    {measurement.notes && measurement.notes.startsWith('Client:') ? 
                     `Client: ${measurement.notes.replace('Client: ', '')}` : 
                     `User: ${measurement.user_name || measurement.user_email || `User #${measurement.user_id}`}`}
                  </Text>
                </View>
                {measurement.admin_name && (
                  <View style={styles.userInfo}>
                    <Ionicons name="shield-checkmark" size={14} color="#6b7280" />
                    <Text style={styles.userText}>
                      Admin: {measurement.admin_name || measurement.admin_email || `Admin #${measurement.admin_id}`}
                    </Text>
                  </View>
                )}
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

            {measurement.confidence_score && (
              <View style={styles.confidenceContainer}>
                <Text style={styles.confidenceLabel}>Confidence:</Text>
                <Text style={styles.confidenceValue}>
                  {Math.round(measurement.confidence_score)}%
                </Text>
              </View>
            )}

            {measurement.notes && (
              <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>Notes:</Text>
                <Text style={styles.notesText} numberOfLines={2}>
                  {measurement.notes}
                </Text>
              </View>
            )}
            
            <View style={styles.cardFooter}>
              <Text style={styles.viewDetailsText}>Tap to view details</Text>
              <Ionicons name="chevron-forward" size={16} color="#666" />
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id.toString()}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <>
            {renderStatsCard()}
            {renderFilters()}
            {filtering && (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Filtering measurements...</Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          !filtering ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="body-outline" size={80} color="#ccc" />
              <Text style={styles.emptyTitle}>No Measurements Found</Text>
              <Text style={styles.emptySubtitle}>
                {unitFilter !== 'all' || typeFilter !== 'all' 
                  ? 'No measurements match your current filters'
                  : 'No measurements have been recorded yet'
                }
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadMoreContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadMoreText}>Loading more measurements...</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        style={styles.flatList}
      />
      </View>

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

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>User:</Text>
                  <Text style={styles.detailValue}>
                    {selectedMeasurement.user_name || selectedMeasurement.user_email || `User #${selectedMeasurement.user_id}`}
                  </Text>
                </View>

                {selectedMeasurement.admin_name && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Admin:</Text>
                    <Text style={styles.detailValue}>
                      {selectedMeasurement.admin_name || selectedMeasurement.admin_email || `Admin #${selectedMeasurement.admin_id}`}
                    </Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <Text style={styles.detailValue}>
                    {selectedMeasurement.status?.charAt(0).toUpperCase() + selectedMeasurement.status?.slice(1) || 'Active'}
                  </Text>
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
                      .filter(([key, value]) => Boolean(value))
                      .length > 0 ? (
                        Object.entries(selectedMeasurement.measurements)
                          .filter(([key, value]) => Boolean(value))
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
    </KeyboardAvoidingWrapper>
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
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
  listContainer: {
    flex: 1,
  },
  flatList: {
    flex: 1,
  },
  content: {
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
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginLeft: 8,
  },
  userText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
    fontWeight: '500',
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
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
  // Filter styles
  filtersContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    position: 'relative',
    zIndex: 10,
  },
  filtersContainerWithDropdown: {
    zIndex: 1000,
  },
  filtersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterGroup: {
    flex: 1,
    marginHorizontal: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 8,
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 1001,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  dropdownButtonActive: {
    borderColor: Colors.primary,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
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
    right: 0,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1002,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemFirst: {
    borderTopWidth: 0,
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownItemActive: {
    backgroundColor: '#F0F9FF',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
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
    zIndex: 999,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detailsModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '99%',
    maxWidth: 600,
    maxHeight: '90%',
    minHeight: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    margin: 10,
  },
  detailsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 8,
  },
  detailsModalBody: {
    flex: 1,
    maxHeight: 400,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  detailSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexWrap: 'wrap',
  },
  measurementsList: {
    flexDirection: 'column',
  },
  measurementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexWrap: 'wrap',
  },
  // Modal styles to match customer side
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
  loadMoreContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
});

export default AdminMeasurementHistory;
