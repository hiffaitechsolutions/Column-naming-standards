import { HTTP_STATUS } from '../utils/constants.js';


export class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, HTTP_STATUS.BAD_REQUEST, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, HTTP_STATUS.UNAUTHORIZED, 'UNAUTHORIZED');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, HTTP_STATUS.FORBIDDEN, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message) {
    super(message, HTTP_STATUS.CONFLICT, 'CONFLICT');
  }
}

export class FileUploadError extends AppError {
  constructor(message = 'File upload failed') {
    super(message, HTTP_STATUS.BAD_REQUEST, 'FILE_UPLOAD_ERROR');
  }
}


export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};


export const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl}`);
  next(error);
};


export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  
  if (err.name === 'CastError') {
    error = new AppError('Invalid ID format', HTTP_STATUS.BAD_REQUEST, 'INVALID_ID');
  }

  
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    error = new ConflictError(`${field} already exists`);
  }

  
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    error = new ValidationError('Validation failed', errors);
  }

  
  if (err.name === 'JsonWebTokenError') {
    error = new AuthenticationError('Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    error = new AuthenticationError('Token expired');
  }

  
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      error = new AppError('File too large', HTTP_STATUS.BAD_REQUEST, 'FILE_TOO_LARGE');
    } else {
      error = new AppError(err.message, HTTP_STATUS.BAD_REQUEST, 'FILE_UPLOAD_ERROR');
    }
  }

  
  
  const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const errorCode = error.errorCode || 'INTERNAL_ERROR';

  res.status(statusCode).json({
    success: false,
    error: errorCode,
    message: error.message || 'Internal server error',
    ...(error.errors && { errors: error.errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

export default {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  FileUploadError,
  asyncHandler,
  notFoundHandler,
  errorHandler
};