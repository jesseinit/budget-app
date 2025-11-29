import apiClient from './api';

export const periodService = {
  /**
   * Fetch all budget periods for the current user.
   * @returns {Promise<Array>} List of budget periods.
   */
  async list() {
    const response = await apiClient.get('/api/v1/periods/');
    return response.result || [];
  },

  /**
   * Complete/close a budget period.
   * @param {string} periodId
   * @param {string} endedAt ISO timestamp (e.g. 2025-07-25T12:00:00)
   */
  async complete(periodId, endedAt) {
    const response = await apiClient.post(`/api/v1/periods/${periodId}/complete`, {
      ended_at: endedAt,
    });
    return response.result;
  },
};
