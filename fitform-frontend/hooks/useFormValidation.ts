import { useState, useCallback, useRef } from 'react';
import { View, ScrollView } from 'react-native';
import { useScrollOnError } from './useScrollOnError';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface ValidationRules {
  [key: string]: ValidationRule;
}

export interface FormErrors {
  [key: string]: string;
}

export interface UseFormValidationOptions {
  scrollViewRef?: React.RefObject<ScrollView>;
  offset?: number;
  animated?: boolean;
  delay?: number;
}

export interface UseFormValidationReturn {
  errors: FormErrors;
  validateField: (fieldName: string, value: any) => string | null;
  validateForm: (data: any, rules: ValidationRules) => boolean;
  setError: (fieldName: string, error: string) => void;
  clearError: (fieldName: string) => void;
  clearAllErrors: () => void;
  scrollToError: (fieldName: string) => void;
  registerErrorElement: (fieldName: string, ref: React.RefObject<View>) => void;
  hasErrors: boolean;
  getFirstError: () => string | null;
}

export function useFormValidation(options: UseFormValidationOptions = {}): UseFormValidationReturn {
  const {
    scrollViewRef,
    offset = 50,
    animated = true,
    delay = 200
  } = options;

  const [errors, setErrors] = useState<FormErrors>({});
  const errorElementsRef = useRef<Map<string, React.RefObject<View>>>(new Map());

  const { scrollToElement } = useScrollOnError({
    scrollViewRef,
    offset,
    animated,
    delay
  });

  const validateField = useCallback((fieldName: string, value: any, rules?: ValidationRule): string | null => {
    if (!rules) return null;

    // Required validation
    if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return `${fieldName} is required`;
    }

    // Skip other validations if value is empty and not required
    if (!value || (typeof value === 'string' && !value.trim())) {
      return null;
    }

    // Min length validation
    if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
      return `${fieldName} must be at least ${rules.minLength} characters`;
    }

    // Max length validation
    if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
      return `${fieldName} must be no more than ${rules.maxLength} characters`;
    }

    // Pattern validation
    if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
      return `${fieldName} format is invalid`;
    }

    // Custom validation
    if (rules.custom) {
      const customError = rules.custom(value);
      if (customError) {
        return customError;
      }
    }

    return null;
  }, []);

  const validateForm = useCallback((data: any, rules: ValidationRules): boolean => {
    const newErrors: FormErrors = {};
    let hasErrors = false;

    // Validate each field
    Object.entries(rules).forEach(([fieldName, rule]) => {
      const value = data[fieldName];
      const error = validateField(fieldName, value, rule);
      
      if (error) {
        newErrors[fieldName] = error;
        hasErrors = true;
      }
    });

    setErrors(newErrors);

    // If there are errors, scroll to the first one immediately
    if (hasErrors) {
      const firstErrorField = Object.keys(newErrors)[0];
      if (firstErrorField) {
        console.log('🔍 Scrolling to error field:', firstErrorField);
        // Scroll immediately - no delay needed
        scrollToError(firstErrorField);
      }
    }

    return !hasErrors;
  }, [validateField, scrollToError]);

  const setError = useCallback((fieldName: string, error: string) => {
    setErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
  }, []);

  const clearError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  const scrollToError = useCallback((fieldName: string) => {
    const elementRef = errorElementsRef.current.get(fieldName);
    if (elementRef) {
      scrollToElement(elementRef);
    }
  }, [scrollToElement]);

  const registerErrorElement = useCallback((fieldName: string, ref: React.RefObject<View>) => {
    errorElementsRef.current.set(fieldName, ref);
  }, []);

  const hasErrors = Object.keys(errors).length > 0;

  const getFirstError = useCallback((): string | null => {
    const firstErrorField = Object.keys(errors)[0];
    return firstErrorField ? errors[firstErrorField] : null;
  }, [errors]);

  return {
    errors,
    validateField,
    validateForm,
    setError,
    clearError,
    clearAllErrors,
    scrollToError,
    registerErrorElement,
    hasErrors,
    getFirstError
  };
}
