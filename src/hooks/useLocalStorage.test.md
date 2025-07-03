# useLocalStorage Hook Test Cases

This document outlines the robust error handling implemented in the useLocalStorage hook:

## Error Handling Features

### 1. **Environment Safety**

- Checks if `window` and `localStorage` are available
- Gracefully handles server-side rendering environments
- Returns default value if localStorage is not accessible

### 2. **Type Validation**

- **Strings**: Direct storage and retrieval
- **Numbers**:
  - Uses `parseFloat` instead of `parseInt` for better decimal support
  - Validates against `NaN` and `Infinity`
  - Returns default value for invalid numbers
- **Booleans**:
  - Handles "true"/"false" strings
  - Supports legacy "1"/"0" values
  - Warns and returns default for invalid boolean strings
- **Objects/Arrays**:
  - Validates JSON parsing
  - Type checks parsed results against expected structure
  - Returns default value for parsing errors

### 3. **Storage Errors**

- **Quota Exceeded**: Specific handling for localStorage quota limits
- **Serialization Errors**: Catches JSON.stringify failures
- **Invalid Keys**: Validates key is non-empty string
- **General Errors**: Comprehensive error catching with logging

### 4. **Data Integrity**

- Validates stored data matches expected type structure
- Handles corrupted or manually modified localStorage data
- Provides detailed warning messages for debugging
- Always falls back to safe default values

## Example Edge Cases Handled

```typescript
// These will all safely return defaults instead of breaking:

// Invalid number
useLocalStorage("invalidNumber", 42); // localStorage contains "not-a-number"

// Invalid boolean
useLocalStorage("invalidBool", true); // localStorage contains "maybe"

// Corrupted JSON
useLocalStorage("invalidJSON", {}); // localStorage contains "{invalid json"

// Type mismatch
useLocalStorage("arrayKey", []); // localStorage contains "{}"

// Missing localStorage (SSR)
useLocalStorage("anyKey", "default"); // window.localStorage undefined
```

## Benefits

- **No Runtime Crashes**: All edge cases handled gracefully
- **Debugging Support**: Detailed console warnings for issues
- **Type Safety**: TypeScript types preserved with runtime validation
- **Backward Compatibility**: Handles legacy data formats
- **Performance**: Minimal overhead with efficient validation
