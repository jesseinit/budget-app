import apiClient from './api';

export const financialGoalService = {
  /**
   * Fetch all financial goals for the current user.
   * @param {boolean} isActive - Filter by active status (default: true)
   * @returns {Promise<Array>} List of financial goals.
   */
  async list(isActive = true) {
    const response = await apiClient.get('/api/v1/goals/', {
      params: { is_active: isActive },
    });
    return response.result || [];
  },

  /**
   * Create a new financial goal.
   * @param {Object} goalData - Goal data
   * @param {string} goalData.name - Goal name
   * @param {number} goalData.target_amount - Target amount
   * @param {string} goalData.target_date - Target date (optional)
   * @param {string} goalData.category - Category (optional)
   * @returns {Promise<Object>} Created financial goal.
   */
  async create(goalData) {
    const response = await apiClient.post('/api/v1/goals/', goalData);
    return response.result;
  },

  /**
   * Get a specific financial goal by ID.
   * @param {string} goalId - Goal ID
   * @returns {Promise<Object>} Financial goal.
   */
  async getById(goalId) {
    const response = await apiClient.get(`/api/v1/goals/${goalId}`);
    return response.result;
  },

  /**
   * Update a financial goal.
   * @param {string} goalId - Goal ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated financial goal.
   */
  async update(goalId, updates) {
    const response = await apiClient.put(`/api/v1/goals/${goalId}`, updates);
    return response.result;
  },

  /**
   * Delete a financial goal.
   * @param {string} goalId - Goal ID
   * @returns {Promise<Object>} Deletion response.
   */
  async delete(goalId) {
    const response = await apiClient.delete(`/api/v1/goals/${goalId}`);
    return response.result;
  },

  /**
   * Add a contribution to a financial goal.
   * @param {string} goalId - Goal ID
   * @param {number} amount - Contribution amount
   * @returns {Promise<Object>} Contribution response.
   */
  async contribute(goalId, amount) {
    const response = await apiClient.patch(`/api/v1/goals/${goalId}/contribute`, null, {
      params: { amount },
    });
    return response.result;
  },
};
