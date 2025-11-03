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
    }

    return accessToken;
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
    window.location.href = '/';
  },

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!localStorage.getItem('access_token');
  },
};
