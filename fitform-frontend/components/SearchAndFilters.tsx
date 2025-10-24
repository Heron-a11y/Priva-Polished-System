import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const isMobile = width < 768;
const isSmallMobile = width < 375;
const isMediumMobile = width >= 375 && width < 414;
const isLargeMobile = width >= 414 && width < 768;

interface FilterOption {
  value: string;
  label: string;
}

interface SearchAndFiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters: { [key: string]: any };
  onFilterChange: (key: string, value: any) => void;
  onClearFilters: () => void;
  filterOptions?: {
    [key: string]: {
      label: string;
      options: FilterOption[];
      type?: 'select' | 'multiselect';
    };
  };
  placeholder?: string;
  showFilters?: boolean;
  compact?: boolean;
}

export default function SearchAndFilters({
  searchValue,
  onSearchChange,
  filters,
  onFilterChange,
  onClearFilters,
  filterOptions = {},
  placeholder = 'Search...',
  showFilters = true,
  compact = false
}: SearchAndFiltersProps) {
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== null && value !== '' && 
    (Array.isArray(value) ? value.length > 0 : true)
  );

  const renderFilterButton = (key: string, config: any) => {
    const currentValue = filters[key];
    const isActive = currentValue !== undefined && currentValue !== null && currentValue !== '';
    
    return (
      <TouchableOpacity
        key={key}
        style={[styles.filterButton, isActive && styles.activeFilterButton]}
        onPress={() => {
          setActiveFilter(key);
          setShowFilterModal(true);
        }}
      >
        <Text style={[styles.filterButtonText, isActive && styles.activeFilterButtonText]}>
          {config.label}
        </Text>
        {isActive && (
          <View style={styles.activeIndicator}>
            <Text style={styles.activeIndicatorText}>•</Text>
          </View>
        )}
        <Ionicons 
          name="chevron-down" 
          size={14} 
          color={isActive ? '#014D40' : '#6B7280'} 
        />
      </TouchableOpacity>
    );
  };

  const renderFilterModal = () => {
    if (!activeFilter || !filterOptions[activeFilter]) return null;

    const config = filterOptions[activeFilter];
    const currentValue = filters[activeFilter];

    return (
      <Modal
        visible={showFilterModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{config.label}</Text>
            <TouchableOpacity
              onPress={() => setShowFilterModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {config.options.map((option) => {
              const isSelected = config.type === 'multiselect' 
                ? Array.isArray(currentValue) && currentValue.includes(option.value)
                : currentValue === option.value;

              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.filterOption, isSelected && styles.selectedFilterOption]}
                  onPress={() => {
                    if (config.type === 'multiselect') {
                      const currentArray = Array.isArray(currentValue) ? currentValue : [];
                      const newValue = currentArray.includes(option.value)
                        ? currentArray.filter(v => v !== option.value)
                        : [...currentArray, option.value];
                      onFilterChange(activeFilter, newValue);
                    } else {
                      onFilterChange(activeFilter, option.value);
                      setShowFilterModal(false);
                    }
                  }}
                >
                  <Text style={[styles.filterOptionText, isSelected && styles.selectedFilterOptionText]}>
                    {option.label}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={16} color="#014D40" />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                onFilterChange(activeFilter, config.type === 'multiselect' ? [] : '');
                setShowFilterModal(false);
              }}
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactSearchContainer}>
          <Ionicons name="search" size={16} color="#6B7280" />
          <TextInput
            style={styles.compactSearchInput}
            placeholder={placeholder}
            value={searchValue}
            onChangeText={onSearchChange}
            placeholderTextColor="#9CA3AF"
          />
        </View>
        
        {showFilters && (
          <TouchableOpacity
            style={[styles.filterToggle, hasActiveFilters && styles.activeFilterToggle]}
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons 
              name="filter" 
              size={16} 
              color={hasActiveFilters ? '#014D40' : '#6B7280'} 
            />
            {hasActiveFilters && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>•</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        
        {renderFilterModal()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          value={searchValue}
          onChangeText={onSearchChange}
          placeholderTextColor="#9CA3AF"
        />
        {searchValue.length > 0 && (
          <TouchableOpacity
            onPress={() => onSearchChange('')}
            style={styles.clearSearchButton}
          >
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      {showFilters && Object.keys(filterOptions).length > 0 && (
        <View style={styles.filtersContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScroll}
          >
            {Object.entries(filterOptions).map(([key, config]) => 
              renderFilterButton(key, config)
            )}
            
            {hasActiveFilters && (
              <TouchableOpacity
                style={styles.clearAllButton}
                onPress={onClearFilters}
              >
                <Ionicons name="close-circle" size={16} color="#DC2626" />
                <Text style={styles.clearAllText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      )}

      {renderFilterModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingHorizontal: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 24,
    paddingVertical: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 24,
    paddingVertical: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 16,
    paddingHorizontal: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 20,
    paddingVertical: isSmallMobile ? 10 : isMediumMobile ? 12 : isLargeMobile ? 14 : 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flex: 1,
  },
  compactSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
    paddingHorizontal: isSmallMobile ? 10 : isMediumMobile ? 12 : isLargeMobile ? 14 : 16,
    paddingVertical: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flex: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
    fontSize: isSmallMobile ? 14 : isMediumMobile ? 15 : isLargeMobile ? 16 : 16,
    color: '#111827',
  },
  compactSearchInput: {
    flex: 1,
    marginLeft: isSmallMobile ? 6 : isMediumMobile ? 8 : isLargeMobile ? 10 : 10,
    fontSize: isSmallMobile ? 13 : isMediumMobile ? 14 : isLargeMobile ? 15 : 15,
    color: '#111827',
  },
  clearSearchButton: {
    marginLeft: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
  },
  filtersContainer: {
    marginTop: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 20,
  },
  filtersScroll: {
    paddingRight: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 24,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
    paddingHorizontal: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 16,
    paddingVertical: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
    gap: isSmallMobile ? 4 : isMediumMobile ? 6 : isLargeMobile ? 8 : 8,
  },
  activeFilterButton: {
    backgroundColor: '#F0FDF4',
    borderColor: '#014D40',
    borderWidth: 2,
  },
  filterButtonText: {
    fontSize: isSmallMobile ? 12 : isMediumMobile ? 13 : isLargeMobile ? 14 : 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: '#014D40',
    fontWeight: '600',
  },
  activeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#014D40',
  },
  activeIndicatorText: {
    fontSize: 8,
    color: '#014D40',
    fontWeight: 'bold',
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
    paddingHorizontal: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 16,
    paddingVertical: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: isSmallMobile ? 4 : isMediumMobile ? 6 : isLargeMobile ? 8 : 8,
  },
  clearAllText: {
    fontSize: isSmallMobile ? 12 : isMediumMobile ? 13 : isLargeMobile ? 14 : 14,
    color: '#DC2626',
    fontWeight: '600',
  },
  filterToggle: {
    padding: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
    borderRadius: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    position: 'relative',
  },
  activeFilterToggle: {
    backgroundColor: '#F0FDF4',
    borderColor: '#014D40',
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#014D40',
  },
  filterBadgeText: {
    fontSize: 6,
    color: '#fff',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedFilterOption: {
    backgroundColor: '#F0FDF4',
    borderColor: '#014D40',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  selectedFilterOptionText: {
    color: '#014D40',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#fff',
    gap: 12,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#014D40',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});


