import express from 'express';
import authService from '../services/authService.js';
import { authenticate } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { trackIP, trackSignupAttempts, trackLoginAttempts } from '../middleware/ipTracker.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validateRegistration, validateLogin, validatePasswordChange } from '../middleware/validator.js';
import { setAuthCookie, clearAuthCookie } from '../utils/jwt.js';
import { HTTP_STATUS, SUCCESS_MESSAGES } from '../utils/constants.js';
import abuseDetectionService from '../services/abuseDetectionService.js';

const router = express.Router();


router.post(
  '/register',
  authRateLimiter,
  trackIP,
  trackSignupAttempts,
  validateRegistration,
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    const result = await authService.register(
      { name, email, password },
      req.userIp
    );

    setAuthCookie(res, result.token);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: SUCCESS_MESSAGES.USER_CREATED,
      data: {
        user:  result.user,
        token: result.token
      }
    });
  })
);


router.post(
  '/login',
  authRateLimiter,
  trackIP,
  trackLoginAttempts,   // ← blocks IPs that login with too many different accounts
  validateLogin,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const result = await authService.login(
      { email, password },
      req.userIp,
      req.headers['user-agent']
    );

    // Record this login so future IP checks can count distinct accounts
    await abuseDetectionService.recordLogin(req.userIp, result.user.id || result.user._id);

    setAuthCookie(res, result.token);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
      data: {
        user:  result.user,
        token: result.token
      }
    });
  })
);


router.post(
  '/logout',
  authenticate,
  trackIP,
  asyncHandler(async (req, res) => {
    await authService.logout(req.user.userId, req.userIp);
    clearAuthCookie(res);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.LOGOUT_SUCCESS
    });
  })
);


router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await authService.getCurrentUser(req.user.userId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { user }
    });
  })
);


router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error:   'REFRESH_TOKEN_REQUIRED',
        message: 'Refresh token is required'
      });
    }

    const result = await authService.refreshAccessToken(refreshToken);
    setAuthCookie(res, result.token);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: result.token,
        user:  result.user
      }
    });
  })
);


router.post(
  '/change-password',
  authenticate,
  trackIP,
  validatePasswordChange,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    await authService.changePassword(
      req.user.userId,
      currentPassword,
      newPassword,
      req.userIp
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Password changed successfully'
    });
  })
);


router.put(
  '/profile',
  authenticate,
  asyncHandler(async (req, res) => {
    const { name, email } = req.body;

    const user = await authService.updateProfile(req.user.userId, { name, email });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  })
);


router.delete(
  '/account',
  authenticate,
  trackIP,
  asyncHandler(async (req, res) => {
    const { password } = req.body;

    if (!password) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error:   'PASSWORD_REQUIRED',
        message: 'Password is required to delete account'
      });
    }

    await authService.deleteAccount(req.user.userId, password, req.userIp);
    clearAuthCookie(res);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Account deleted successfully'
    });
  })
);

export default router;