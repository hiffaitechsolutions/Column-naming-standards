import jwt from 'jsonwebtoken';
import config from '../config/env.js';


export const generateToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
};


export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: '30d'
  });
};


export const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
};


export const decodeToken = (token) => {
  return jwt.decode(token);
};


export const setAuthCookie = (res, token) => {
  const cookieOptions = {
    httpOnly: true,
    secure: config.app.isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, 
    path: '/'
  };

  res.cookie('authToken', token, cookieOptions);
};


export const clearAuthCookie = (res) => {
  res.cookie('authToken', '', {
    httpOnly: true,
    secure: config.app.isProduction,
    sameSite: 'lax',
    expires: new Date(0),
    path: '/'
  });
};


export const extractToken = (req) => {
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.substring(7);
  }

  
  if (req.cookies && req.cookies.authToken) {
    return req.cookies.authToken;
  }

  return null;
};

export default {
  generateToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  setAuthCookie,
  clearAuthCookie,
  extractToken
};