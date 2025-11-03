import apiClient from './api';

export const dashboardService = {
  /**
   * Fetch dashboard analytics data
   * @returns {Promise} Dashboard analytics data
   */
  getDashboardAnalytics: async () => {
    try {
      const response = await apiClient.get('/api/v1/analytics/dashboard');
      return response;
    } catch (error) {
      console.error('Error fetching dashboard analytics:', error);
      throw error;
    }
  },

  /**
   * Fetch yearly analytics data
   * @param {number} year - The year to fetch analytics for
   * @returns {Promise} Yearly analytics data
   */
  getYearlyAnalytics: async (year) => {
    try {
      const response = await apiClient.get(`/api/v1/analytics/yearly/${year}`);
      return response;
    } catch (error) {
      console.error('Error fetching yearly analytics:', error);
      throw error;
    }
  },
};
