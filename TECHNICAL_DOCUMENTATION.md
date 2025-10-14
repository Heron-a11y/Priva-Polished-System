# FitForm AR - Technical Documentation

## 🏗️ **System Architecture**

### **Frontend Architecture**
```
┌─────────────────────────────────────────────────────────────┐
│                    React Native Frontend                     │
├─────────────────────────────────────────────────────────────┤
│  Presentation Layer (UI Components)                         │
│  ├── Customer Screens (insights, recommendations)          │
│  ├── Admin Screens (orders, analytics)                     │
│  └── Shared Components (navigation, forms)                  │
├─────────────────────────────────────────────────────────────┤
│  Business Logic Layer                                       │
│  ├── CustomerDataAnalysis.ts (Analytics Engine)            │
│  ├── Services (API, Network)                              │
│  └── Utils (Helpers, Formatters)                           │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                 │
│  ├── API Services (REST endpoints)                         │
│  ├── Local Storage (AsyncStorage)                          │
│  └── State Management (React Context)                      │
└─────────────────────────────────────────────────────────────┘
```

### **Backend Architecture**
```
┌─────────────────────────────────────────────────────────────┐
│                    Laravel Backend                         │
├─────────────────────────────────────────────────────────────┤
│  API Layer (Controllers)                                   │
│  ├── CustomerController (User management)                   │
│  ├── OrderController (Rental/Purchase)                     │
│  └── AnalyticsController (Data insights)                   │
├─────────────────────────────────────────────────────────────┤
│  Business Logic Layer                                       │
│  ├── Models (Database entities)                            │
│  ├── Services (Business logic)                             │
│  └── Repositories (Data access)                           │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                 │
│  ├── MySQL/PostgreSQL Database                             │
│  ├── Redis Cache                                           │
│  └── File Storage (Images, Documents)                      │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 **Core Components**

### **1. Customer Data Analysis Engine**

#### **File**: `fitform-frontend/utils/CustomerDataAnalysis.ts`

**Purpose**: Comprehensive customer analytics and recommendation generation

**Key Methods**:
```typescript
class CustomerDataAnalyzer {
  // Main analysis methods
  generateInsights(): CustomerInsights
  generateRecommendations(): Recommendation[]
  
  // Specific analysis methods
  private analyzeRentalInsights(): RentalInsights
  private analyzePurchaseInsights(): PurchaseInsights
  private analyzeMeasurementInsights(): MeasurementInsights
  private analyzeBehavioralPatterns(): BehavioralPatterns
  
  // Recommendation generation
  private generatePatternBasedSuggestions(): Recommendation[]
  private generateMeasurementBasedSuggestions(): Recommendation[]
  private generateTrendBasedRecommendations(): Recommendation[]
}
```

**Data Structures**:
```typescript
interface CustomerInsights {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  priceRange: { min: number; max: number; average: number };
  clothingTypePreferences: ClothingTypePreference[];
  seasonalPreferences: SeasonalPreference[];
  measurementInsights: MeasurementInsights;
  behavioralPatterns: BehavioralPatterns;
  rentalInsights: RentalInsights;
  purchaseInsights: PurchaseInsights;
}

interface Recommendation {
  id: string;
  type: 'size' | 'style' | 'seasonal' | 'maintenance' | 'budget' | 'sizing';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  category: string;
  confidence: number;
  imageSource?: any;
  imageUrl?: string;
  suggestedItems?: SuggestedItem[];
}
```

### **2. Enhanced Preferences System**

#### **File**: `fitform-frontend/app/preferences.tsx`

**Features**:
- Menu-style navigation for Data Analysis section
- Integration with insights and recommendations screens
- Removed legacy account settings and style preferences
- Consistent header layout matching other screens

**Navigation Structure**:
```typescript
const handleInsightsPress = () => {
  router.push('/customer/insights');
};

const handleRecommendationsPress = () => {
  router.push('/customer/recommendations');
};
```

### **3. Data Insights Dashboard**

#### **File**: `fitform-frontend/app/customer/insights.tsx`

**Layout Structure**:
```typescript
// 2x2 Grid Layout (matching rental & purchase history)
<View style={styles.overviewGrid}>
  <View style={styles.overviewRow}>
    <View style={styles.overviewCard}>
      <View style={styles.overviewIcon}>
        <Ionicons name="list" size={24} color="#014D40" />
      </View>
      <Text style={styles.overviewNumber}>{insights.totalOrders}</Text>
      <Text style={styles.overviewLabel}>Total Orders</Text>
    </View>
    <View style={styles.overviewCard}>
      <View style={styles.overviewIcon}>
        <Ionicons name="wallet" size={24} color="#014D40" />
      </View>
      <Text style={styles.overviewNumber}>₱{safeNumber(insights.totalSpent).toFixed(0)}</Text>
      <Text style={styles.overviewLabel}>Total Spent</Text>
    </View>
  </View>
  // Second row with Satisfaction and Rental Ratio
</View>
```

**Section Organization**:
- **Style Analysis**: Clothing type preferences, brand preferences
- **Measurement Insights**: Body type analysis, measurement trends
- **Order Analysis**: Spending patterns, price ranges
- **Business Insights**: Loyalty scores, customer behavior
- **Personal Analysis**: Body type, measurement completeness

### **4. Recommendations Engine**

#### **File**: `fitform-frontend/app/customer/recommendations.tsx`

**Recommendation Types**:
1. **Size/Sizing**: Based on measurement data
2. **Style**: Based on clothing type preferences
3. **Seasonal**: Based on seasonal spending patterns
4. **Budget**: Based on spending history
5. **Maintenance**: Based on rental return patterns

**Action Handling**:
```typescript
const handleTakeAction = (recommendation: Recommendation) => {
  switch (recommendation.type) {
    case 'size':
    case 'sizing':
      router.push('/customer/ar-measurements');
      break;
    case 'style':
      Alert.alert('Perfect Style Match!', 
        `We found amazing ${favoriteType} items that match your style perfectly!`);
      router.push('/customer/orders');
      break;
    case 'seasonal':
      Alert.alert('Seasonal Style Alert!', 
        `Don't miss out on our stunning ${season} collection!`);
      router.push('/customer/orders');
      break;
    // ... other cases
  }
};
```

### **5. Clothing Catalog Integration**

#### **File**: `fitform-frontend/constants/ClothingTypes.ts`

**Clothing Type Structure**:
```typescript
interface ClothingType {
  id: string;
  label: string;
  description: string;
  image?: any; // Local image asset
  imageUrl?: string; // Remote image URL
  icon: string;
  color: string;
  category: string;
  popular: boolean;
}

const CLOTHING_TYPES: ClothingType[] = [
  {
    id: 'barong-adults',
    label: 'Barong Tagalog - Adults',
    description: 'Traditional Filipino formal wear for adults',
    image: require('../assets/images/clothing/barong-adults.jpg'),
    icon: 'shirt',
    color: '#2C3E50',
    category: 'Traditional',
    popular: true
  },
  // ... more items
];
```

## 🔄 **Data Flow Architecture**

### **1. Data Loading Process**
```
User Action → API Call → Data Processing → Analytics Engine → UI Update
     ↓              ↓            ↓              ↓            ↓
  Navigation    getOrders()   Raw Data    generateInsights()  Display
```

### **2. Recommendation Generation Flow**
```
Customer Data → Pattern Analysis → Rule Engine → Catalog Matching → UI Display
     ↓              ↓              ↓            ↓              ↓
  History +     Detect Patterns   Apply Rules   Find Items    Show Cards
  Measurements
```

### **3. State Management Flow**
```
Component State → Context State → Local Storage → API Sync → Backend
     ↓              ↓              ↓            ↓         ↓
  Local UI      Global State   Persistence   Network   Database
```

## 🛠️ **Technical Implementation Details**

### **1. Robust Data Extraction**

**Problem**: API data might use different field names for amounts
**Solution**: Comprehensive field checking with fallbacks

```typescript
const extractAmount = (order: any): number => {
  const possibleAmounts = [
    order.amount,
    order.quotation_amount,
    order.total_amount,
    order.price,
    order.cost,
    order.value
  ];
  
  for (const amount of possibleAmounts) {
    if (amount !== null && amount !== undefined && amount !== '') {
      const numericAmount = typeof amount === 'string' ? Number(amount) : amount;
      if (!isNaN(numericAmount) && numericAmount > 0) {
        return numericAmount;
      }
    }
  }
  
  return 0;
};
```

### **2. Error Handling and Debugging**

**Comprehensive Logging System**:
```typescript
// API Response Debugging
console.log('🔍 Debug: Orders data:', orders.slice(0, 2));
console.log('🔍 Debug: Orders length:', orders.length);

// Calculation Debugging
console.log('🔍 Debug: Order amount calculation:', {
  orderId: order.id,
  originalAmount: order.amount,
  extractedAmount: amount,
  runningTotal: sum + amount
});

// Result Debugging
console.log('🔍 Debug: Total spent calculation result:', totalSpent);
```

### **3. Performance Optimization**

**Data Processing Optimization**:
- Efficient array operations for large datasets
- Memoization for expensive calculations
- Lazy loading for recommendation generation
- Caching for frequently accessed data

**Memory Management**:
- Proper cleanup of event listeners
- Efficient image loading and caching
- Garbage collection optimization
- State management best practices

### **4. Security Implementation**

**Data Validation**:
```typescript
const safeNumber = (value: any, fallback: number = 0): number => {
  if (value === null || value === undefined) return fallback;
  const num = Number(value);
  return isNaN(num) ? fallback : num;
};
```

**Input Sanitization**:
- All user inputs are validated and sanitized
- SQL injection prevention in API calls
- XSS protection for dynamic content
- Secure data transmission

## 📱 **Mobile-Specific Implementation**

### **1. React Native Optimizations**

**Layout Performance**:
```typescript
// Optimized grid layout
overviewGrid: {
  padding: 16,
},
overviewRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 12,
},
overviewCard: {
  backgroundColor: '#fff',
  borderRadius: 12,
  padding: 16,
  flex: 1,
  marginHorizontal: 6,
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
},
```

**Image Handling**:
```typescript
// Efficient image loading with fallbacks
<Image 
  source={recommendation.imageSource || { uri: recommendation.imageUrl }} 
  style={styles.recommendationImage}
  resizeMode="cover"
  onError={() => console.log('Image failed to load')}
/>
```

### **2. Cross-Platform Compatibility**

**Platform-Specific Code**:
```typescript
import { Platform } from 'react-native';

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 44 : 24,
  },
});
```

**Device-Specific Optimizations**:
- Screen size adaptations
- Performance tuning for different devices
- Memory management for low-end devices
- Battery optimization

## 🔧 **API Integration**

### **1. Service Layer Architecture**

**API Service Structure**:
```typescript
// services/api.js
class ApiService {
  async getRentalPurchaseHistory() {
    const response = await fetch(`${API_BASE_URL}/orders`);
    return response.json();
  }
  
  async getMeasurementHistory() {
    const response = await fetch(`${API_BASE_URL}/measurements`);
    return response.json();
  }
  
  async getProfile() {
    const response = await fetch(`${API_BASE_URL}/profile`);
    return response.json();
  }
}
```

### **2. Error Handling**

**Network Error Recovery**:
```typescript
const loadInsights = async () => {
  try {
    setLoading(true);
    const [orders, measurements, profile] = await Promise.all([
      apiService.getRentalPurchaseHistory(),
      apiService.getMeasurementHistory(),
      apiService.getProfile()
    ]);
    
    const analyzer = new CustomerDataAnalyzer(orders, measurements, profile);
    const insights = analyzer.generateInsights();
    setInsights(insights);
  } catch (error) {
    console.error('Error loading insights:', error);
    Alert.alert('Error', 'Failed to load insights data');
  } finally {
    setLoading(false);
  }
};
```

## 📊 **Analytics and Monitoring**

### **1. Performance Metrics**

**Key Performance Indicators**:
- App load time
- Screen transition speed
- Data processing time
- Memory usage
- Battery consumption

### **2. User Analytics**

**Customer Behavior Tracking**:
- Screen views and time spent
- Feature usage patterns
- Recommendation click-through rates
- Conversion rates for suggestions

### **3. Error Monitoring**

**Error Tracking**:
- JavaScript errors and exceptions
- API call failures
- Network connectivity issues
- Performance bottlenecks

## 🚀 **Deployment and DevOps**

### **1. Build Process**

**Frontend Build**:
```bash
# Development build
npm run start

# Production build
npm run build

# Platform-specific builds
expo build:ios
expo build:android
```

**Backend Deployment**:
```bash
# Production optimization
composer install --optimize-autoloader --no-dev
php artisan config:cache
php artisan route:cache
php artisan migrate --force
```

### **2. Environment Configuration**

**Environment Variables**:
```bash
# Frontend (.env)
EXPO_PUBLIC_API_URL=https://api.fitform-ar.com
EXPO_PUBLIC_APP_VERSION=2.0.0

# Backend (.env)
APP_ENV=production
APP_DEBUG=false
DB_CONNECTION=mysql
CACHE_DRIVER=redis
```

### **3. Monitoring and Logging**

**Application Monitoring**:
- Real-time error tracking
- Performance monitoring
- User analytics
- System health checks

---

*This technical documentation provides comprehensive information about the FitForm AR system architecture, implementation details, and deployment procedures.*
