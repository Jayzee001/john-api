// Error handling middleware
export function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Default error
  let statusCode = 500;
  let message = 'Internal Server Error';
  let error = 'Server Error';

  // Handle different types of errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    error = err.message;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    error = 'The provided ID is not valid';
  } else if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate Error';
    error = 'A record with this information already exists';
  } else if (err.message && err.message.includes('not found')) {
    statusCode = 404;
    message = 'Not Found';
    error = err.message;
  } else if (err.message && err.message.includes('Validation failed')) {
    statusCode = 400;
    message = 'Validation Error';
    error = err.message;
  } else if (err.message && err.message.includes('already exists')) {
    statusCode = 409;
    message = 'Conflict';
    error = err.message;
  } else if (err.message && err.message.includes('Invalid token')) {
    statusCode = 401;
    message = 'Authentication Error';
    error = err.message;
  } else if (err.message) {
    // If error has a message, use it
    error = err.message;
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      details: error,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method
    }
  });
}

// 404 handler for unmatched routes
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      details: `The requested route ${req.originalUrl} does not exist`,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method
    }
  });
} 