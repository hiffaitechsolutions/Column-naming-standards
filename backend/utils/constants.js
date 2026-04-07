export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
  PAYMENT_REQUIRED: 402
};


export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin'
};

export const RATE_LIMIT_KEYS = {
  LOGIN: "login",
  REGISTER: "register",
  API: "api"
};



export const VALIDATION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};


export const PAYMENT_STATUS = {
  PENDING: 'pending',
  AUTHORIZED: 'authorized',
  CAPTURED: 'captured',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};


export const FILE_TYPES = {
  XLSX: '.xlsx',
  XLS: '.xls',
  CSV: '.csv'
};


export const DATA_TYPES = {
  STRING: 'string',
  NUMBER: 'number',
  INTEGER: 'integer',
  DECIMAL: 'decimal',
  BOOLEAN: 'boolean',
  DATE: 'date',
  DATETIME: 'datetime',
  EMAIL: 'email',
  URL: 'url',
  PHONE: 'phone',
  ALPHANUMERIC: 'alphanumeric',
  ALPHA: 'alpha',
  NUMERIC: 'numeric',
  UUID: 'uuid',
  JSON: 'json',
  ENUM: 'enum'
};


export const RULE_TYPES = {
  REQUIRED: 'required',
  MIN_LENGTH: 'min_length',
  MAX_LENGTH: 'max_length',
  MIN_VALUE: 'min_value',
  MAX_VALUE: 'max_value',
  PATTERN: 'pattern',
  ENUM: 'enum',
  UNIQUE: 'unique'
};


export const ERROR_CODES = {
 
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  ACCOUNT_BLOCKED: 'ACCOUNT_BLOCKED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  
  
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PARSE_ERROR: 'PARSE_ERROR',
  INVALID_FILE: 'INVALID_FILE',
  

  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  NO_FREE_VALIDATIONS: 'NO_FREE_VALIDATIONS',
  
  
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  
  
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
 
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR'
};


export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_EXISTS: 'Email already registered',
  WEAK_PASSWORD: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
  ACCOUNT_BLOCKED: 'Your account has been blocked. Please contact support.',
  UNAUTHORIZED: 'You are not authorized to access this resource',
  FORBIDDEN: 'You do not have permission to perform this action',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Validation failed',
  PARSE_ERROR: 'Failed to parse file',
  INVALID_FILE: 'Invalid file format',
  PAYMENT_REQUIRED: 'Payment required to continue',
  PAYMENT_FAILED: 'Payment processing failed',
  NO_FREE_VALIDATIONS: 'No free validations remaining',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later.',
  INTERNAL_ERROR: 'Internal server error',
  DATABASE_ERROR: 'Database operation failed'
};


export const SUCCESS_MESSAGES = {
  USER_CREATED: 'User registered successfully',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  PASSWORD_CHANGED: 'Password changed successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
  STANDARDS_UPLOADED: 'Standards file uploaded and parsed successfully',
  CLASSWORDS_UPLOADED: 'Classwords file uploaded and parsed successfully',
  VALIDATION_COMPLETED: 'Validation completed successfully',
  PAYMENT_SUCCESS: 'Payment processed successfully',
  FILE_UPLOADED: 'File uploaded successfully',
  FILE_DELETED: 'File deleted successfully'
};


export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  ALPHA: /^[a-zA-Z]+$/,
  NUMERIC: /^[0-9]+$/,
  URL: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/
};


export const VALIDATION_CONSTRAINTS = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  EMAIL_MAX_LENGTH: 255,
  FILE_MAX_SIZE: 10485760,
  MAX_COLUMNS: 50,
  MAX_ROWS: 100000
};


export const AUDIT_ACTIONS = {
  USER_REGISTERED: 'USER_REGISTERED',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  PASSWORD_CHANGE_FAILED: 'PASSWORD_CHANGE_FAILED',
  PROFILE_UPDATED: 'PROFILE_UPDATED',
  ACCOUNT_DELETED: 'ACCOUNT_DELETED',
  USER_BLOCKED: 'USER_BLOCKED',
  USER_UNBLOCKED: 'USER_UNBLOCKED',
  STANDARDS_UPLOADED: 'STANDARDS_UPLOADED',
  STANDARDS_DELETED: 'STANDARDS_DELETED',
  CLASSWORDS_UPLOADED: 'CLASSWORDS_UPLOADED',
  CLASSWORDS_DELETED: 'CLASSWORDS_DELETED',
  VALIDATION_CREATED: 'VALIDATION_CREATED',
  VALIDATION_COMPLETED: 'VALIDATION_COMPLETED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  PAYMENT_INITIATED: 'PAYMENT_INITIATED',
  PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_REFUNDED: 'PAYMENT_REFUNDED',
  ABUSE_REPORTED: 'ABUSE_REPORTED',
  IP_BLOCKED: 'IP_BLOCKED',
  IP_UNBLOCKED: 'IP_UNBLOCKED',
  FILE_UPLOADED: 'FILE_UPLOADED',
  FILE_DELETED: 'FILE_DELETED',
  ADMIN_ACTION: 'ADMIN_ACTION',
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  OTHER: 'OTHER'
};


export const EXCEL_CONSTANTS = {
  MAX_HEADER_ROW_SCAN: 10,
  DEFAULT_SHEET_INDEX: 0,
  MAX_SHEETS: 100
};

export default {
  HTTP_STATUS,
  USER_ROLES,
  VALIDATION_STATUS,
  PAYMENT_STATUS,
  FILE_TYPES,
  DATA_TYPES,
  RULE_TYPES,
  ERROR_CODES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  REGEX_PATTERNS,
  VALIDATION_CONSTRAINTS,
  AUDIT_ACTIONS,
  EXCEL_CONSTANTS
};