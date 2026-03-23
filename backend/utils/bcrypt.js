import bcrypt from 'bcryptjs';
import config from '../config/env.js';


export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(config.security.bcryptRounds);
  return await bcrypt.hash(password, salt);
};


export const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};


export const validatePasswordStrength = (password) => {

  if (password.length < 8) return false;

 
  if (!/[A-Z]/.test(password)) return false;


  if (!/[a-z]/.test(password)) return false;


  if (!/[0-9]/.test(password)) return false;


  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return false;

  return true;
};


export const generateRandomPassword = (length = 12) => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}';
  
  const allChars = uppercase + lowercase + numbers + special;
  
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

export default {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
  generateRandomPassword
};