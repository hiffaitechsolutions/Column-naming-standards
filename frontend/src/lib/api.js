import axios from './axios';


export const authAPI = {
  register: (data) => axios.post('/auth/register', data),
  verifyEmail: (data) => axios.post('/auth/verify-email', data),
  resendEmailOtp: (data) => axios.post('/auth/resend-email-otp', data),
  login: (data) => axios.post('/auth/login', data),
  logout: () => axios.post('/auth/logout'),
  getCurrentUser: () => {
    console.log('Calling getCurrentUser API...');
    return axios.get('/auth/me');
  },
  changePassword: (data) => axios.post('/auth/change-password', data),
  updateProfile: (data) => axios.put('/auth/profile', data),
};


export const userAPI = {
  getDashboard: () => {
    console.log('Calling getDashboard API...');
    return axios.get('/user/dashboard');
  },
  getUsage: () => axios.get('/user/usage'),
  canValidate: () => axios.get('/user/can-validate'),
  getValidations: (params) => axios.get('/user/validations', { params }),
  getPayments: (params) => axios.get('/user/payments', { params }),
  getProfile: () => axios.get('/user/profile'),
};


export const standardsAPI = {
  upload: (formData) => axios.post('/standards/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getAll: () => axios.get('/standards'),
  getParsed: () => axios.get('/standards/parsed'),
  getById: (id) => axios.get(`/standards/${id}`),
  delete: (id) => axios.delete(`/standards/${id}`),
};


export const classwordsAPI = {
  upload: (formData) => axios.post('/classwords/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getAll: () => axios.get('/classwords'),
  getParsed: () => axios.get('/classwords/parsed'),
  getById: (id) => axios.get(`/classwords/${id}`),
  delete: (id) => axios.delete(`/classwords/${id}`),
};


export const abbreviationsAPI = {
  upload: (formData) => axios.post('/abbreviations/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getAll: () => axios.get('/abbreviations'),
  getLatest: () => axios.get('/abbreviations/latest'),
  getById: (id) => axios.get(`/abbreviations/${id}`),
  delete: (id) => axios.delete(`/abbreviations/${id}`),
};


export const validationAPI = {
  uploadData: (formData) => axios.post('/validation/upload-data', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getColumns: (data) => axios.post('/validation/get-columns', data),
  validate: (data) => axios.post('/validation/validate', data),
  validateWithPayment: (data) => axios.post('/validation/validate-with-payment', data),
  getById: (id) => axios.get(`/validation/${id}`),
  getErrors: (id) => axios.get(`/validation/${id}/errors`),
  getSummary: (id) => axios.get(`/validation/${id}/summary`),
  delete: (id) => axios.delete(`/validation/${id}`),
};


export const paymentAPI = {
  createOrder: (data) => axios.post('/payment/create-order', data),
  verifyPayment: (data) => axios.post('/payment/verify', data),
  getById: (id) => axios.get(`/payment/${id}`),
  getAll: (params) => axios.get('/payment', { params }),
};

export default {
  authAPI,
  userAPI,
  standardsAPI,
  classwordsAPI,
  abbreviationsAPI,
  validationAPI,
  paymentAPI,
};