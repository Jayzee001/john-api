// Token Service for managing JWT token blacklisting
// This provides proper logout functionality by blacklisting tokens

class TokenService {
  constructor() {
    // In-memory blacklist (in production, use Redis or database)
    this.blacklistedTokens = new Set();
  }

  // Add token to blacklist
  blacklistToken(token) {
    this.blacklistedTokens.add(token);
  }

  // Check if token is blacklisted
  isTokenBlacklisted(token) {
    return this.blacklistedTokens.has(token);
  }

  // Clean up expired tokens (optional - for memory management)
  cleanupBlacklist() {
    // In a real implementation, you'd check token expiration
    // For now, we'll keep it simple
    if (this.blacklistedTokens.size > 10000) {
      // Clear blacklist if it gets too large
      this.blacklistedTokens.clear();
    }
  }
}

export default new TokenService(); 