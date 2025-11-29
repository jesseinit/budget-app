import { useState, useEffect } from 'react';
import apiClient from '../services/api';
import { formatCurrency } from '../utils/currency';

function Transactions({ user }) {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [periodsLoading, setPeriodsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [jumpToPage, setJumpToPage] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false,
  });

  // Form state for creating transaction
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    transacted_at: new Date().toISOString().split('T')[0],
    transacted_time: new Date().toTimeString().split(' ')[0].substring(0, 5), // HH:MM format
    type: 'expense',
    category_id: '',
    payment_method: '',
    tags: '',
    is_recurring: false,
    recurring_frequency: '',
  });

  const userCurrency = user?.currency || 'USD';

  // Fetch categories and periods on component mount
  useEffect(() => {
    fetchCategories();
    fetchPeriods();
  }, []);

  // Fetch transactions when filters change
  useEffect(() => {
    fetchTransactions(pagination.page);
  }, [pagination.page, selectedCategory, selectedPeriod, selectedType, startDate, endDate]);

  // Handle Escape key to close modals
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        if (showCreateModal) {
          setShowCreateModal(false);
          resetForm();
        } else if (showDetailModal) {
          setShowDetailModal(false);
          setSelectedTransaction(null);
        }
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [showCreateModal, showDetailModal]);

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await apiClient.get('/api/v1/categories/');
      setCategories(response.result || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchPeriods = async () => {
    try {
      setPeriodsLoading(true);
      const response = await apiClient.get('/api/v1/periods/');
      setPeriods(response.result || []);
    } catch (err) {
      console.error('Error fetching periods:', err);
    } finally {
      setPeriodsLoading(false);
    }
  };

  const fetchTransactions = async (page) => {
    try {
      setLoading(true);
      let url = `/api/v1/transactions/?page=${page}&limit=${pagination.limit}`;

      // Add filters to URL
      if (selectedCategory) {
        url += `&category_id=${selectedCategory}`;
      }
      if (selectedPeriod) {
        url += `&period_id=${selectedPeriod}`;
      }
      if (selectedType) {
        url += `&transaction_type=${selectedType}`;
      }
      if (startDate) {
        url += `&start_date=${startDate}`;
      }
      if (endDate) {
        url += `&end_date=${endDate}`;
      }

      const response = await apiClient.get(url);
      setTransactions(response.result);
      setPagination({
        ...pagination,
        ...response.meta.pagination,
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterType, value) => {
    // Reset to page 1 when any filter changes
    setPagination({ ...pagination, page: 1 });

    switch (filterType) {
      case 'category':
        setSelectedCategory(value);
        break;
      case 'period':
        setSelectedPeriod(value);
        break;
      case 'type':
        setSelectedType(value);
        break;
      case 'startDate':
        setStartDate(value);
        break;
      case 'endDate':
        setEndDate(value);
        break;
      default:
        break;
    }
  };

  const clearAllFilters = () => {
    setSelectedCategory('');
    setSelectedPeriod('');
    setSelectedType('');
    setStartDate('');
    setEndDate('');
    setPagination({ ...pagination, page: 1 });
  };

  const hasActiveFilters = selectedCategory || selectedPeriod || selectedType || startDate || endDate;

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      description: '',
      transacted_at: new Date().toISOString().split('T')[0],
      transacted_time: new Date().toTimeString().split(' ')[0].substring(0, 5),
      type: 'expense',
      category_id: '',
      payment_method: '',
      tags: '',
      is_recurring: false,
      recurring_frequency: '',
    });
    setCreateError(null);
  };

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      // Prepare the data - combine date and time and preserve as ISO string without timezone conversion
      const dateTimeString = `${formData.transacted_at}T${formData.transacted_time}:00.000Z`;
      const transactionData = {
        amount: formData.amount,
        description: formData.description || null,
        transacted_at: dateTimeString,
        type: formData.type,
        category_id: formData.category_id,
        payment_method: formData.payment_method || null,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : null,
        is_recurring: formData.is_recurring,
        recurring_frequency: formData.is_recurring ? formData.recurring_frequency : null,
      };

      await apiClient.post('/api/v1/transactions/', transactionData);

      // Success - close modal and refresh transactions
      setShowCreateModal(false);
      resetForm();
      fetchTransactions(pagination.page);
    } catch (err) {
      console.error('Error creating transaction:', err);
      setCreateError(err.response?.data?.detail || 'Failed to create transaction. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination({ ...pagination, page: newPage });
  };

  const handleJumpToPage = (e) => {
    e.preventDefault();
    const pageNum = parseInt(jumpToPage);
    if (pageNum >= 1 && pageNum <= pagination.total_pages) {
      handlePageChange(pageNum);
      setJumpToPage('');
    }
  };

  const handleViewTransaction = (transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailModal(true);
  };

  const getTransactionIcon = (type) => {
    if (type === 'income') {
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
      );
    }
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
        <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      </div>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getPaymentMethodBadge = (method) => {
    if (!method) return null;
    const methodLabels = {
      cash: 'Cash',
      credit_card: 'Credit Card',
      debit_card: 'Debit Card',
      bank_transfer: 'Bank Transfer',
      direct_debit: 'Direct Debit',
      digital_wallet: 'Digital Wallet',
      direct_credit: 'Direct Credit',
    };
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:text-gray-200">
        {methodLabels[method] || method}
      </span>
    );
  };

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mx-auto max-w-7xl pb-5">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">Transactions</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 sm:mt-2">
              View and manage all your financial transactions
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="sm:inline">Add Transaction</span>
          </button>
        </div>

        {/* Filters and Stats Bar */}
        <div className="mb-6 space-y-4">
          {/* Filters */}
          <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear all filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Category Filter */}
              <div>
                <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <div className="relative">
                  <select
                    id="category-filter"
                    value={selectedCategory}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    disabled={categoriesLoading}
                    className="block w-full appearance-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 pr-10 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">All Categories</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Period Filter */}
              <div>
                <label htmlFor="period-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Budget Period
                </label>
                <div className="relative">
                  <select
                    id="period-filter"
                    value={selectedPeriod}
                    onChange={(e) => handleFilterChange('period', e.target.value)}
                    disabled={periodsLoading}
                    className="block w-full appearance-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 pr-10 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">All Periods</option>
                    {periods.map((period) => (
                      <option key={period.id} value={period.id}>
                        {period.period_name} ({period.status})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Type Filter */}
              <div>
                <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Transaction Type
                </label>
                <div className="relative">
                  <select
                    id="type-filter"
                    value={selectedType}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                    className="block w-full appearance-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 pr-10 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Types</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                    <option value="saving">Saving</option>
                    <option value="investment">Investment</option>
                    <option value="adjustment">Adjustment</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Start Date Filter */}
              <div>
                <label htmlFor="start-date-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  id="start-date-filter"
                  value={startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* End Date Filter */}
              <div>
                <label htmlFor="end-date-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  id="end-date-filter"
                  value={endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="rounded-lg bg-white dark:bg-gray-800 p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {hasActiveFilters ? 'Filtered Transactions' : 'Total Transactions'}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{pagination.total}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">Page</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {pagination.page} of {pagination.total_pages || 1}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading transactions...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-6 text-red-800 dark:text-red-300 shadow-sm">
            <div className="flex items-center gap-3">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Transactions List */}
        {!loading && !error && (
          <>
            <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {transactions.length === 0 ? (
                  <li className="px-6 py-12 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">No transactions found</p>
                  </li>
                ) : (
                  transactions.map((transaction) => (
                    <li
                      key={transaction.id}
                      className="px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer sm:px-6"
                      onClick={() => handleViewTransaction(transaction)}
                    >
                      <div className="flex items-start gap-3 sm:items-center sm:gap-4">
                        {/* Icon */}
                        <div className="flex-shrink-0">
                          {transaction.category?.icon ? (
                            <div
                              className="flex h-10 w-10 items-center justify-center rounded-full text-xl"
                              style={{ backgroundColor: `${transaction.category.color}20` }}
                            >
                              {transaction.category.icon}
                            </div>
                          ) : (
                            getTransactionIcon(transaction.type)
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {transaction.description}
                              </p>
                              {transaction.is_recurring && (
                                <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-medium text-blue-800 dark:text-blue-400 flex-shrink-0">
                                  Recurring
                                </span>
                              )}
                            </div>
                            {/* Amount - aligned with description */}
                            <div className="flex-shrink-0">
                              <p
                                className={`text-base font-semibold sm:text-lg ${transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                  }`}
                              >
                                {transaction.type === 'income' ? '+' : ''}
                                {formatCurrency(transaction.amount, userCurrency)}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                            <span className="whitespace-nowrap">{formatDate(transaction.transacted_at)}</span>
                            {transaction.category && (
                              <>
                                <span className="hidden sm:inline">•</span>
                                <span className="flex items-center gap-1">
                                  <span
                                    className="inline-block h-2 w-2 rounded-full"
                                    style={{ backgroundColor: transaction.category.color }}
                                  />
                                  <span className="truncate">{transaction.category.name}</span>
                                </span>
                              </>
                            )}
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <div className="flex flex-wrap gap-1">
                              {getPaymentMethodBadge(transaction.payment_method)}
                              {transaction.tags && transaction.tags.length > 0 && (
                                <>
                                  {transaction.tags.slice(0, 2).map((tag, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center rounded bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-300"
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                  {transaction.tags.length > 2 && (
                                    <span className="inline-flex items-center rounded bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-300">
                                      +{transaction.tags.length - 2}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                            {transaction.period_name && (
                              <span className="inline-flex items-center rounded bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 text-xs text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                Period: {transaction.period_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 sm:px-6 rounded-lg shadow-sm">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.has_prev}
                    className="relative inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.has_next}
                    className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Showing page <span className="font-medium">{pagination.page}</span> of{' '}
                      <span className="font-medium">{pagination.total_pages}</span> (
                      <span className="font-medium">{pagination.total}</span> total transactions)
                    </p>
                    <form onSubmit={handleJumpToPage} className="flex items-center gap-2">
                      <label htmlFor="jump-to-page" className="text-sm text-gray-600 dark:text-gray-400">
                        Go to:
                      </label>
                      <input
                        id="jump-to-page"
                        type="number"
                        min="1"
                        max={pagination.total_pages}
                        value={jumpToPage}
                        onChange={(e) => setJumpToPage(e.target.value)}
                        placeholder="Page"
                        className="w-16 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="submit"
                        disabled={!jumpToPage || parseInt(jumpToPage) < 1 || parseInt(jumpToPage) > pagination.total_pages}
                        className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Go
                      </button>
                    </form>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={!pagination.has_prev}
                        className="relative inline-flex items-center rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>

                      {/* Page numbers */}
                      {[...Array(Math.min(5, pagination.total_pages))].map((_, idx) => {
                        let pageNum;
                        if (pagination.total_pages <= 5) {
                          pageNum = idx + 1;
                        } else if (pagination.page <= 3) {
                          pageNum = idx + 1;
                        } else if (pagination.page >= pagination.total_pages - 2) {
                          pageNum = pagination.total_pages - 4 + idx;
                        } else {
                          pageNum = pagination.page - 2 + idx;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`relative inline-flex items-center border px-4 py-2 text-sm font-medium ${pageNum === pagination.page
                              ? 'z-10 border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                              }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={!pagination.has_next}
                        className="relative inline-flex items-center rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Next</span>
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Create Transaction Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex min-h-screen items-center justify-center p-4">
              {/* Backdrop with blur */}
              <div
                className="fixed inset-0 bg-black/40 backdrop-blur-md transition-all duration-300"
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                aria-hidden="true"
              />

              {/* Modal */}
              <div className="relative z-10 w-full max-w-2xl animate-in zoom-in-95 duration-300 rounded-lg bg-white dark:bg-gray-800 p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between" id="modal-title">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Transaction</h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {createError && (
                  <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-red-800 dark:text-red-300">
                    <p>{createError}</p>
                  </div>
                )}

                <form onSubmit={handleCreateTransaction} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* Amount */}
                    <div>
                      <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Amount *
                      </label>
                      <input
                        type="number"
                        id="amount"
                        name="amount"
                        value={formData.amount}
                        onChange={handleFormChange}
                        step="0.01"
                        required
                        className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>

                    {/* Transaction Type */}
                    <div>
                      <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Type *
                      </label>
                      <select
                        id="type"
                        name="type"
                        value={formData.type}
                        onChange={handleFormChange}
                        required
                        className="block w-full appearance-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 pr-10 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                        <option value="saving">Saving</option>
                        <option value="investment">Investment</option>
                        <option value="adjustment">Adjustment</option>
                      </select>
                    </div>

                    {/* Category */}
                    <div>
                      <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Category *
                      </label>
                      <select
                        id="category_id"
                        name="category_id"
                        value={formData.category_id}
                        onChange={handleFormChange}
                        required
                        className="block w-full appearance-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 pr-10 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select a category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.icon} {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Date */}
                    <div>
                      <label htmlFor="transacted_at" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Date *
                      </label>
                      <input
                        type="date"
                        id="transacted_at"
                        name="transacted_at"
                        value={formData.transacted_at}
                        onChange={handleFormChange}
                        required
                        className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Time */}
                    <div>
                      <label htmlFor="transacted_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Time *
                      </label>
                      <input
                        type="time"
                        id="transacted_time"
                        name="transacted_time"
                        value={formData.transacted_time}
                        onChange={handleFormChange}
                        required
                        className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Payment Method */}
                    <div>
                      <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Payment Method
                      </label>
                      <select
                        id="payment_method"
                        name="payment_method"
                        value={formData.payment_method}
                        onChange={handleFormChange}
                        className="block w-full appearance-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 pr-10 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select method</option>
                        <option value="cash">Cash</option>
                        <option value="credit_card">Credit Card</option>
                        <option value="debit_card">Debit Card</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="direct_debit">Direct Debit</option>
                        <option value="digital_wallet">Digital Wallet</option>
                        <option value="direct_credit">Direct Credit</option>
                      </select>
                    </div>

                    {/* Description */}
                    <div className="md:col-span-2">
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Description
                      </label>
                      <input
                        type="text"
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleFormChange}
                        className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Grocery shopping"
                      />
                    </div>

                    {/* Tags */}
                    <div className="md:col-span-2">
                      <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Tags
                      </label>
                      <input
                        type="text"
                        id="tags"
                        name="tags"
                        value={formData.tags}
                        onChange={handleFormChange}
                        className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., groceries, weekly (comma-separated)"
                      />
                    </div>

                    {/* Is Recurring */}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_recurring"
                        name="is_recurring"
                        checked={formData.is_recurring}
                        onChange={handleFormChange}
                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="is_recurring" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                        Recurring Transaction
                      </label>
                    </div>

                    {/* Recurring Frequency */}
                    {formData.is_recurring && (
                      <div>
                        <label htmlFor="recurring_frequency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Frequency *
                        </label>
                        <select
                          id="recurring_frequency"
                          name="recurring_frequency"
                          value={formData.recurring_frequency}
                          onChange={handleFormChange}
                          required={formData.is_recurring}
                          className="block w-full appearance-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 pr-10 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select frequency</option>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="biweekly">Bi-weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        resetForm();
                      }}
                      className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                      disabled={creating}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creating ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                          Creating...
                        </>
                      ) : (
                        'Create Transaction'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Detail Modal */}
        {showDetailModal && selectedTransaction && (
          <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="detail-modal-title" role="dialog" aria-modal="true">
            <div className="flex min-h-screen items-center justify-center p-4">
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black/50 backdrop-blur-md transition-opacity duration-300"
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedTransaction(null);
                }}
                aria-hidden="true"
              />

              {/* Modal */}
              <div className="relative z-10 w-full max-w-2xl rounded-lg bg-white dark:bg-gray-800 p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between" id="detail-modal-title">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Transaction Details</h2>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setSelectedTransaction(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Amount and Type */}
                  <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Amount</p>
                      <p className={`text-3xl font-bold ${selectedTransaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedTransaction.type === 'income' ? '+' : ''}
                        {formatCurrency(selectedTransaction.amount, userCurrency)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Type</p>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                        selectedTransaction.type === 'income' ? 'bg-green-100 text-green-800' :
                        selectedTransaction.type === 'expense' ? 'bg-red-100 text-red-800' :
                        selectedTransaction.type === 'saving' ? 'bg-blue-100 text-blue-800' :
                        selectedTransaction.type === 'investment' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedTransaction.type.charAt(0).toUpperCase() + selectedTransaction.type.slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  {selectedTransaction.description && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Description</p>
                      <p className="mt-1 text-gray-900 dark:text-white">{selectedTransaction.description}</p>
                    </div>
                  )}

                  {/* Category */}
                  {selectedTransaction.category && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Category</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-full text-lg"
                          style={{ backgroundColor: `${selectedTransaction.category.color}20` }}
                        >
                          {selectedTransaction.category.icon}
                        </span>
                        <span className="text-gray-900 dark:text-white">{selectedTransaction.category.name}</span>
                      </div>
                    </div>
                  )}

                  {/* Date and Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Transaction Date</p>
                      <p className="mt-1 text-gray-900 dark:text-white">{formatDate(selectedTransaction.transacted_at)}</p>
                    </div>
                    {selectedTransaction.period_name && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Budget Period</p>
                        <p className="mt-1 text-gray-900 dark:text-white">{selectedTransaction.period_name}</p>
                      </div>
                    )}
                  </div>

                  {/* Payment Method */}
                  {selectedTransaction.payment_method && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Payment Method</p>
                      <div className="mt-1">{getPaymentMethodBadge(selectedTransaction.payment_method)}</div>
                    </div>
                  )}

                  {/* Tags */}
                  {selectedTransaction.tags && selectedTransaction.tags.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tags</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {selectedTransaction.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:text-gray-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recurring */}
                  {selectedTransaction.is_recurring && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Recurring</p>
                      <p className="mt-1 text-gray-900 dark:text-white">
                        Yes - {selectedTransaction.recurring_frequency && selectedTransaction.recurring_frequency.charAt(0).toUpperCase() + selectedTransaction.recurring_frequency.slice(1)}
                      </p>
                    </div>
                  )}

                  {/* Transaction ID */}
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Transaction ID</p>
                    <p className="mt-1 font-mono text-xs text-gray-500 dark:text-gray-500">{selectedTransaction.id}</p>
                  </div>

                  {/* Timestamps */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <div>
                        <p className="font-medium">Created</p>
                        <p>{new Date(selectedTransaction.created_at).toLocaleString()}</p>
                      </div>
                      {selectedTransaction.updated_at && (
                        <div>
                          <p className="font-medium">Updated</p>
                          <p>{new Date(selectedTransaction.updated_at).toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Close Button */}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setSelectedTransaction(null);
                    }}
                    className="rounded-lg bg-gray-100 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Transactions;
