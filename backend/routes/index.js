import express from 'express';
import authRoutes from './auth.js';
import userRoutes from './user.js';
import standardsRoutes from './standards.js';
import classwordsRoutes from './classwords.js';
import abbreviationsRoutes from './Abbreviations.js';
import validationRoutes from './validation.js';
import paymentRoutes from './payment.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/standards', standardsRoutes);
router.use('/classwords', classwordsRoutes);
router.use('/abbreviations', abbreviationsRoutes);
router.use('/validation', validationRoutes);
router.use('/payment', paymentRoutes);

router.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'API is running', version: '1.0.0', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

router.get('/', (req, res) => {
  res.status(200).json({ success: true, message: 'Data Validation Platform API', version: '1.0.0', endpoints: { auth: '/api/v1/auth', user: '/api/v1/user', standards: '/api/v1/standards', classwords: '/api/v1/classwords', abbreviations: '/api/v1/abbreviations', validation: '/api/v1/validation', payment: '/api/v1/payment' } });
});

export default router;