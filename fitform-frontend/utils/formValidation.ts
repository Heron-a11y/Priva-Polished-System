// Comprehensive form validation utility
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

export interface FieldValidation {
  key: string;
  label: string;
  value: string;
  rules: ValidationRule;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

export class FormValidator {
  // Common validation patterns
  static patterns = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^[\+]?[1-9][\d]{0,15}$/,
    date: /^\d{4}-\d{2}-\d{2}$/,
    url: /^https?:\/\/.+/,
    alphanumeric: /^[a-zA-Z0-9\s]+$/,
  };

  // Validate a single field
  static validateField(value: string, rules: ValidationRule, label: string): string | null {
    const trimmedValue = value?.trim() || '';

    // Required validation
    if (rules.required && !trimmedValue) {
      return `${label} is required`;
    }

    // Skip other validations if field is empty and not required
    if (!trimmedValue && !rules.required) {
      return null;
    }

    // Min length validation
    if (rules.minLength && trimmedValue.length < rules.minLength) {
      return `${label} must be at least ${rules.minLength} characters`;
    }

    // Max length validation
    if (rules.maxLength && trimmedValue.length > rules.maxLength) {
      return `${label} must be no more than ${rules.maxLength} characters`;
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(trimmedValue)) {
      return `${label} format is invalid`;
    }

    // Custom validation
    if (rules.custom) {
      const customError = rules.custom(trimmedValue);
      if (customError) {
        return customError;
      }
    }

    return null;
  }

  // Validate multiple fields
  static validateFields(fields: FieldValidation[]): ValidationResult {
    const errors: Record<string, string> = {};
    const warnings: Record<string, string> = {};

    let hasErrors = false;
    let hasWarnings = false;

    fields.forEach(field => {
      const error = this.validateField(field.value, field.rules, field.label);
      if (error) {
        errors[field.key] = error;
        hasErrors = true;
      }

      // Check for warnings (empty but not required fields)
      if (!field.value?.trim() && !field.rules.required) {
        warnings[field.key] = `${field.label} is empty`;
        hasWarnings = true;
      }
    });

    return {
      isValid: !hasErrors,
      errors,
      warnings,
    };
  }

  // Get validation rules for common field types
  static getFieldRules(fieldType: string, required: boolean = false): ValidationRule {
    const baseRules: ValidationRule = { required };

    switch (fieldType) {
      case 'email':
        return {
          ...baseRules,
          pattern: this.patterns.email,
          custom: (value: string) => {
            if (value && !this.patterns.email.test(value)) {
              return 'Please enter a valid email address';
            }
            return null;
          },
        };

      case 'phone':
        return {
          ...baseRules,
          pattern: this.patterns.phone,
          custom: (value: string) => {
            if (value && !this.patterns.phone.test(value.replace(/[\s\-\(\)]/g, ''))) {
              return 'Please enter a valid phone number';
            }
            return null;
          },
        };

      case 'date':
        return {
          ...baseRules,
          pattern: this.patterns.date,
          custom: (value: string) => {
            if (value && !this.patterns.date.test(value)) {
              return 'Please enter date in YYYY-MM-DD format';
            }
            return null;
          },
        };

      case 'name':
        return {
          ...baseRules,
          minLength: 2,
          maxLength: 50,
          pattern: this.patterns.alphanumeric,
        };

      case 'address':
        return {
          ...baseRules,
          minLength: 10,
          maxLength: 200,
        };

      case 'city':
      case 'state':
      case 'country':
        return {
          ...baseRules,
          minLength: 2,
          maxLength: 50,
          pattern: this.patterns.alphanumeric,
        };

      case 'zip_code':
        return {
          ...baseRules,
          minLength: 3,
          maxLength: 10,
          pattern: /^[a-zA-Z0-9\s\-]+$/,
        };

      case 'gender':
        return {
          ...baseRules,
          custom: (value: string) => {
            if (value && !['male', 'female', 'other', 'prefer_not_to_say'].includes(value.toLowerCase())) {
              return 'Please enter male, female, other, or prefer not to say';
            }
            return null;
          },
        };

      default:
        return baseRules;
    }
  }

  // Check for empty required fields
  static checkEmptyRequiredFields(fields: FieldValidation[]): string[] {
    const emptyFields: string[] = [];

    fields.forEach(field => {
      if (field.rules.required && (!field.value || !field.value.trim())) {
        emptyFields.push(field.label);
      }
    });

    return emptyFields;
  }

  // Generate validation summary
  static generateValidationSummary(result: ValidationResult): string {
    const { errors, warnings } = result;
    const errorCount = Object.keys(errors).length;
    const warningCount = Object.keys(warnings).length;

    if (errorCount === 0 && warningCount === 0) {
      return 'All fields are valid';
    }

    let summary = '';
    
    if (errorCount > 0) {
      summary += `${errorCount} error${errorCount > 1 ? 's' : ''} found:\n`;
      Object.values(errors).forEach(error => {
        summary += `• ${error}\n`;
      });
    }

    if (warningCount > 0) {
      if (summary) summary += '\n';
      summary += `${warningCount} warning${warningCount > 1 ? 's' : ''}:\n`;
      Object.values(warnings).forEach(warning => {
        summary += `• ${warning}\n`;
      });
    }

    return summary.trim();
  }
}

// Export validation helper functions
export const validateForm = (fields: FieldValidation[]) => FormValidator.validateFields(fields);
export const getFieldRules = (fieldType: string, required: boolean = false) => 
  FormValidator.getFieldRules(fieldType, required);
export const checkEmptyRequiredFields = (fields: FieldValidation[]) => 
  FormValidator.checkEmptyRequiredFields(fields);
export const generateValidationSummary = (result: ValidationResult) => 
  FormValidator.generateValidationSummary(result);
