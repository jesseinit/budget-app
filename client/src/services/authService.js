import apiClient from './api';

export const authService = {
  /**
   * Get Google OAuth URL
   * @returns {Promise<string>} The Google OAuth authorization URL
   */
  async getGoogleAuthUrl() {
    const response = await apiClient.get('/auth/google');
    return response.result.auth_url;
  },

  /**
   * Handle Google OAuth callback
   * @param {URLSearchParams} params - URL search params from OAuth redirect
   * @returns {Promise<string>} Access token
   */
  async handleGoogleCallback(params) {
    const queryString = params.toString();
    const response = await apiClient.get(`/auth/google/callback?${queryString}`);
    const accessToken = response.result.access_token;

    // Store token in localStorage
    if (accessToken) {
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', response.result.refresh_token);
    }

    return accessToken;
  },

  /**
   * Refresh access token using refresh token
   * @returns {Promise<string|null>} New access token or null if refresh fails
   */
  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        return null;
      }

      const response = await apiClient.post(`/auth/refresh?refresh_token=${refreshToken}`);
      const newAccessToken = response.result.access_token;

      if (newAccessToken) {
        localStorage.setItem('access_token', newAccessToken);
        // Update refresh token if a new one is provided
        if (response.result.refresh_token) {
          localStorage.setItem('refresh_token', response.result.refresh_token);
        }
        return newAccessToken;
      }
      return null;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  },

  /**
   * Get current user profile
   * @returns {Promise<Object>} User profile data
   */
  async getUserProfile() {
    const response = await apiClient.get('/api/v1/users/profile');
    return response.result;
  },

  /**
   * Logout user
   */
  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/';
  },

  /**
   * Check if user is authenticated (has access token or refresh token)
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!(localStorage.getItem('access_token') || localStorage.getItem('refresh_token'));
  },
};
