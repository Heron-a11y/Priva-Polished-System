// Shared measurement data types for consistency across components

export interface MeasurementData {
  height?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  shoulder_width?: number;
  shoulders?: number; // Alternative field name
  inseam?: number;
  arm_length?: number;
  armLength?: number; // Alternative field name
  neck?: number;
  thigh?: number;
  [key: string]: number | undefined;
}

export interface CompleteMeasurements {
  height: number;
  chest: number;
  waist: number;
  hips: number;
  shoulders: number;
  inseam: number;
  armLength: number;
  neck: number;
  thigh?: number;
}

// Helper function to normalize measurement data
export const normalizeMeasurementData = (data: MeasurementData): CompleteMeasurements => {
  return {
    height: data.height || 0,
    chest: data.chest || 0,
    waist: data.waist || 0,
    hips: data.hips || 0,
    shoulders: data.shoulder_width || data.shoulders || 0,
    inseam: data.inseam || 0,
    armLength: data.arm_length || data.armLength || 0,
    neck: data.neck || 0,
    thigh: data.thigh || 0,
  };
};

// Helper function to convert CompleteMeasurements to string format for forms
export const measurementsToStrings = (measurements: CompleteMeasurements): Record<string, string> => {
  const result: Record<string, string> = {};
  Object.entries(measurements).forEach(([key, value]) => {
    if (value !== undefined && value > 0) {
      result[key] = value.toString();
    }
  });
  return result;
};

// Helper function to map API measurements to category-specific form fields with intelligent calculations
export const mapMeasurementsToCategory = (measurements: MeasurementData, category: string, unitSystem?: string): Record<string, string> => {
  const result: Record<string, string> = {};
  
  // Input validation
  if (!measurements || typeof measurements !== 'object') {
    console.warn('⚠️ Invalid measurements data:', measurements);
    return result;
  }
  
  if (!category || typeof category !== 'string') {
    console.warn('⚠️ Invalid category:', category);
    return result;
  }
  
  // Get base measurements with safe fallbacks
  console.log('🔍 Raw measurements in mapMeasurementsToCategory:', measurements);
  console.log('🔍 Available keys:', Object.keys(measurements));
  console.log('🔍 Unit system:', unitSystem);
  
  // Check if measurements are in inches
  const isInches = unitSystem === 'inches' || 
    (measurements.height && measurements.height < 100) || // Height less than 100 suggests inches
    (measurements.chest && measurements.chest < 50); // Chest less than 50 suggests inches
  
  console.log('🔍 Detected unit system - isInches:', isInches);
  
  // Keep measurements in their original units (inches or cm)
  const height = Math.max(0, measurements.height || 0);
  const chest = Math.max(0, measurements.chest || 0);
  const waist = Math.max(0, measurements.waist || 0);
  const hips = Math.max(0, measurements.hips || 0);
  const shoulderWidth = Math.max(0, measurements.shoulder_width || measurements.shoulders || 0);
  const armLength = Math.max(0, measurements.arm_length || measurements.armLength || 0);
  const inseam = Math.max(0, measurements.inseam || 0);
  const neck = Math.max(0, measurements.neck || 0);
  
  console.log('📏 Extracted values (original units) - Height:', height, 'Chest:', chest, 'Waist:', waist, 'ShoulderWidth:', shoulderWidth, 'ArmLength:', armLength);
  
  // Smart calculation functions with error handling - all round up to whole numbers
  const calculatePantsLength = (height: number): number => {
    if (height <= 0) return 0;
    // Pants length is typically 45-50% of total height
    return Math.max(0, Math.ceil(height * 0.47));
  };
  
  const calculateShirtLength = (height: number): number => {
    if (height <= 0) return 0;
    // Shirt length is typically 35-40% of total height
    return Math.max(0, Math.ceil(height * 0.37));
  };
  
  const calculateDressLength = (height: number): number => {
    if (height <= 0) return 0;
    // Dress length varies, but typically 50-60% of height for full length
    return Math.max(0, Math.ceil(height * 0.55));
  };
  
  const calculateJacketLength = (height: number): number => {
    if (height <= 0) return 0;
    // Jacket length is typically 30-35% of total height
    return Math.max(0, Math.ceil(height * 0.32));
  };
  
  const calculateSkirtLength = (height: number): number => {
    if (height <= 0) return 0;
    // Skirt length is typically 25-30% of total height
    return Math.max(0, Math.ceil(height * 0.27));
  };
  
  const calculateShoeSize = (height: number): number => {
    if (height <= 0) return 0;
    // Rough estimation: foot length is typically 15-16% of height
    return Math.max(0, Math.ceil(height * 0.155));
  };
  
  const calculateHatSize = (neck: number): number => {
    if (neck <= 0) return 0;
    // Head circumference is typically 1.2-1.3 times neck circumference
    return Math.max(0, Math.ceil(neck * 1.25));
  };
  
  const addAllowance = (measurement: number, allowance: number): number => {
    if (measurement <= 0) return 0;
    // Convert allowance to appropriate unit (inches or cm)
    // For inches, use smaller allowances (roughly 1/2.54 of cm allowances)
    const unitAllowance = isInches ? allowance / 2.54 : allowance;
    return Math.max(0, Math.ceil(measurement + unitAllowance)); // Round up to whole number
  };
  
  // Category-specific calculations with unit-aware allowances
  switch (category) {
    case 'shirts':
      if (chest > 0) result.chest = addAllowance(chest, 2).toString(); // +2cm/+0.79" allowance
      if (waist > 0) result.waist = addAllowance(waist, 1).toString(); // +1cm/+0.39" allowance
      if (height > 0) result.length = calculateShirtLength(height).toString();
      if (shoulderWidth > 0) result.shoulder = addAllowance(shoulderWidth, 1).toString(); // +1cm/+0.39" allowance
      if (armLength > 0) result.sleeve = addAllowance(armLength, 1).toString(); // +1cm/+0.39" allowance
      break;
      
    case 'pants':
      if (waist > 0) result.waist = addAllowance(waist, 2).toString(); // +2cm/+0.79" allowance
      if (hips > 0) result.hips = addAllowance(hips, 1).toString(); // +1cm/+0.39" allowance
      if (height > 0) result.length = calculatePantsLength(height).toString();
      if (inseam > 0) result.inseam = addAllowance(inseam, 1).toString(); // +1cm/+0.39" allowance
      if (measurements.thigh && measurements.thigh > 0) result.thigh = addAllowance(measurements.thigh, 1).toString();
      break;
      
    case 'dresses':
      if (chest > 0) result.chest = addAllowance(chest, 2).toString(); // +2cm/+0.79" allowance
      if (waist > 0) result.waist = addAllowance(waist, 1).toString(); // +1cm/+0.39" allowance
      if (hips > 0) result.hips = addAllowance(hips, 1).toString(); // +1cm/+0.39" allowance
      if (height > 0) result.length = calculateDressLength(height).toString();
      if (shoulderWidth > 0) result.shoulder = addAllowance(shoulderWidth, 1).toString(); // +1cm/+0.39" allowance
      break;
      
    case 'jackets':
      if (chest > 0) result.chest = addAllowance(chest, 3).toString(); // +3cm/+1.18" allowance for jackets
      if (waist > 0) result.waist = addAllowance(waist, 2).toString(); // +2cm/+0.79" allowance
      if (height > 0) result.length = calculateJacketLength(height).toString();
      if (shoulderWidth > 0) result.shoulder = addAllowance(shoulderWidth, 2).toString(); // +2cm/+0.79" allowance
      if (armLength > 0) result.sleeve = addAllowance(armLength, 1).toString(); // +1cm/+0.39" allowance
      break;
      
    case 'skirts':
      if (waist > 0) result.waist = addAllowance(waist, 1).toString(); // +1cm/+0.39" allowance
      if (hips > 0) result.hips = addAllowance(hips, 1).toString(); // +1cm/+0.39" allowance
      if (height > 0) result.length = calculateSkirtLength(height).toString();
      break;
      
    case 'shoes':
      if (height > 0) result.foot_length = calculateShoeSize(height).toString();
      break;
      
    case 'hats':
      if (neck > 0) result.head_circumference = calculateHatSize(neck).toString();
      break;
      
    case 'suits':
      if (chest > 0) result.chest = addAllowance(chest, 2).toString(); // +2cm/+0.79" allowance
      if (waist > 0) result.waist = addAllowance(waist, 1).toString(); // +1cm/+0.39" allowance
      if (hips > 0) result.hips = addAllowance(hips, 1).toString(); // +1cm/+0.39" allowance
      if (height > 0) result.length = calculateJacketLength(height).toString();
      if (shoulderWidth > 0) result.shoulder = addAllowance(shoulderWidth, 1).toString(); // +1cm/+0.39" allowance
      if (armLength > 0) result.sleeve = addAllowance(armLength, 1).toString(); // +1cm/+0.39" allowance
      if (inseam > 0) result.inseam = addAllowance(inseam, 1).toString(); // +1cm/+0.39" allowance
      break;
      
    case 'activewear':
      if (chest > 0) result.chest = addAllowance(chest, 3).toString(); // +3cm/+1.18" allowance for movement
      if (waist > 0) result.waist = addAllowance(waist, 2).toString(); // +2cm/+0.79" allowance
      if (hips > 0) result.hips = addAllowance(hips, 2).toString(); // +2cm/+0.79" allowance
      if (height > 0) result.length = calculateShirtLength(height).toString();
      break;
      
    default:
      // For custom categories, use basic measurements with minimal allowance
      if (chest > 0) result.chest = addAllowance(chest, 1).toString(); // +1cm/+0.39" allowance
      if (waist > 0) result.waist = addAllowance(waist, 1).toString(); // +1cm/+0.39" allowance
      if (height > 0) result.length = Math.ceil(height * 0.4).toString();
      break;
  }
  
  return result;
};
