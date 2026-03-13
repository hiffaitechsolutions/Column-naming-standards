
class ApiResponse {
  constructor(statusCode, data, message = 'Success') {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }
}


const sendSuccess = (res, statusCode, data, message = 'Success') => {
  return res.status(statusCode).json(new ApiResponse(statusCode, data, message));
};


const sendError = (res, statusCode, message = 'Something went wrong', errors = []) => {
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors,
    data: null,
  });
};

module.exports = { ApiResponse, sendSuccess, sendError };