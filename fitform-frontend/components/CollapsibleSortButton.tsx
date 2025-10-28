import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

const { width: screenWidth } = Dimensions.get('window');

interface SortOption {
  key: string;
  label: string;
  icon: string;
}

interface CollapsibleSortButtonProps {
  sortOption: string;
  sortDirection: 'asc' | 'desc';
  onSortChange: (option: string, direction: 'asc' | 'desc') => void;
  sortOptions: SortOption[];
  style?: any;
}

export default function CollapsibleSortButton({
  sortOption,
  sortDirection,
  onSortChange,
  sortOptions,
  style
}: CollapsibleSortButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [rotateValue] = useState(new Animated.Value(0));

  const toggleExpanded = () => {
    const toValue = isExpanded ? 0 : 1;
    Animated.timing(rotateValue, {
      toValue,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setIsExpanded(!isExpanded);
  };

  const handleSortSelect = (option: string) => {
    const newDirection = sortOption === option && sortDirection === 'asc' ? 'desc' : 'asc';
    onSortChange(option, newDirection);
    setIsExpanded(false);
  };

  const getCurrentOption = () => {
    return sortOptions.find(option => option.key === sortOption) || sortOptions[0];
  };

  const rotate = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={[styles.container, style]}>
      {/* Main Sort Button */}
      <TouchableOpacity
        style={styles.sortButton}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <Ionicons 
          name={getCurrentOption().icon} 
          size={16} 
          color={Colors.primary} 
        />
        <Text style={styles.sortButtonText} numberOfLines={1}>
          Sort
        </Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons 
            name="chevron-down" 
            size={12} 
            color={Colors.primary} 
          />
        </Animated.View>
      </TouchableOpacity>

      {/* Dropdown Modal */}
      <Modal
        visible={isExpanded}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsExpanded(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsExpanded(false)}
        >
          <View style={styles.dropdownContainer}>
            <View style={styles.dropdownHeader}>
              <View style={styles.sortTitleContainer}>
                <Ionicons name="swap-vertical" size={20} color={Colors.primary} />
                <Text style={styles.dropdownTitle}>Sort By</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsExpanded(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={20} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>
            
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.sortOption,
                  sortOption === option.key && styles.selectedOption
                ]}
                onPress={() => handleSortSelect(option.key)}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <Ionicons 
                    name={option.icon as any} 
                    size={18} 
                    color={sortOption === option.key ? Colors.primary : Colors.text.secondary} 
                  />
                  <Text style={[
                    styles.optionText,
                    sortOption === option.key && styles.selectedOptionText
                  ]}>
                    {option.label}
                  </Text>
                </View>
                {sortOption === option.key && (
                  <Ionicons 
                    name="checkmark" 
                    size={16} 
                    color={Colors.primary} 
                  />
                )}
              </TouchableOpacity>
            ))}
            
            {/* Direction Toggle */}
            <View style={styles.directionSection}>
              <Text style={styles.directionLabel}>Sort Direction</Text>
              <View style={styles.directionButtons}>
                <TouchableOpacity
                  style={[
                    styles.directionButton,
                    sortDirection === 'asc' && styles.selectedDirectionButton
                  ]}
                  onPress={() => onSortChange(sortOption, 'asc')}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name="arrow-up" 
                    size={16} 
                    color={sortDirection === 'asc' ? '#fff' : Colors.primary} 
                  />
                  <Text style={[
                    styles.directionText,
                    sortDirection === 'asc' && styles.selectedDirectionText
                  ]}>
                    Sort to Top
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.directionButton,
                    sortDirection === 'desc' && styles.selectedDirectionButton
                  ]}
                  onPress={() => onSortChange(sortOption, 'desc')}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name="arrow-down" 
                    size={16} 
                    color={sortDirection === 'desc' ? '#fff' : Colors.primary} 
                  />
                  <Text style={[
                    styles.directionText,
                    sortDirection === 'desc' && styles.selectedDirectionText
                  ]}>
                    Sort to Bottom
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    gap: 4,
    minWidth: 80,
    width: 80,
  },
  sortButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
    flex: 0,
    flexShrink: 0,
  },
  directionIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: screenWidth * 0.8,
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  sortTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  selectedOption: {
    backgroundColor: Colors.primary + '10',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  selectedOptionText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  directionSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  directionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  directionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  directionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.light,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    gap: 6,
  },
  selectedDirectionButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  directionText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.primary,
  },
  selectedDirectionText: {
    color: '#fff',
    fontWeight: '600',
  },
});
