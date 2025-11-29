import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import { formatCurrency } from '../utils/currency';

function Transactions({ user }) {
  const location = useLocation();
  const navigate = useNavigate();
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
  const [showFilters, setShowFilters] = useState(false);
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

  useEffect(() => {
    if (location.state?.openCreate) {
      setShowCreateModal(true);
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, location.state, navigate]);

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
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
          <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
      );
    }
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
        <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
        {methodLabels[method] || method}
      </span>
    );
  };

  return (
    <div className="h-full bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl pb-5">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Transactions</h1>
            <p className="mt-1 text-sm text-gray-600 sm:mt-2">
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

        {/* Filters and Stats - Compact Design */}
        <div className="mb-6 rounded-lg bg-white shadow-sm border border-gray-200">
          {/* Header Bar with Stats and Filter Toggle */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-gray-500">
                  {hasActiveFilters ? 'Filtered' : 'Total'}
                </p>
                <p className="text-lg font-bold text-gray-900">{pagination.total}</p>
              </div>
              <div className="hidden sm:block h-8 w-px bg-gray-200" />
              <div className="hidden sm:block">
                <p className="text-xs text-gray-500">Page</p>
                <p className="text-lg font-bold text-gray-900">
                  {pagination.page} / {pagination.total_pages || 1}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear
                </button>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
                {hasActiveFilters && (
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                    {[selectedCategory, selectedPeriod, selectedType, startDate, endDate].filter(Boolean).length}
                  </span>
                )}
                <svg
                  className={`h-3.5 w-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Collapsible Filters */}
          {showFilters && (
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Category Filter */}
                <div className="relative">
                  <select
                    id="category-filter"
                    value={selectedCategory}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    disabled={categoriesLoading}
                    className="block w-full appearance-none rounded-md border border-gray-300 bg-white pl-3 pr-8 py-2 text-xs text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">All Categories</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Period Filter */}
                <div className="relative">
                  <select
                    id="period-filter"
                    value={selectedPeriod}
                    onChange={(e) => handleFilterChange('period', e.target.value)}
                    disabled={periodsLoading}
                    className="block w-full appearance-none rounded-md border border-gray-300 bg-white pl-3 pr-8 py-2 text-xs text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">All Periods</option>
                    {periods.map((period) => (
                      <option key={period.id} value={period.id}>
                        {period.period_name} ({period.status})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Type Filter */}
                <div className="relative">
                  <select
                    id="type-filter"
                    value={selectedType}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                    className="block w-full appearance-none rounded-md border border-gray-300 bg-white pl-3 pr-8 py-2 text-xs text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">All Types</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                    <option value="saving">Saving</option>
                    <option value="investment">Investment</option>
                    <option value="adjustment">Adjustment</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Start Date Filter */}
                <div>
                  <input
                    type="date"
                    id="start-date-filter"
                    value={startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    placeholder="Start Date"
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* End Date Filter */}
                <div>
                  <input
                    type="date"
                    id="end-date-filter"
                    value={endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    placeholder="End Date"
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <p className="mt-4 text-gray-600">Loading transactions...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-lg bg-red-50 p-6 text-red-800 shadow-sm">
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
            <div className="overflow-hidden rounded-lg bg-white shadow-sm border border-gray-200">
              <ul className="divide-y divide-gray-200">
                {transactions.length === 0 ? (
                  <li className="px-6 py-12 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
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
                    <p className="mt-2 text-sm text-gray-600">No transactions found</p>
                  </li>
                ) : (
                  transactions.map((transaction) => (
                    <li
                      key={transaction.id}
                      className="px-4 py-4 hover:bg-gray-50 transition-colors cursor-pointer sm:px-6"
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
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {transaction.description}
                              </p>
                              {transaction.is_recurring && (
                                <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 flex-shrink-0">
                                  Recurring
                                </span>
                              )}
                            </div>
                            {/* Amount - aligned with description */}
                            <div className="flex-shrink-0">
                              <p
                                className={`text-base font-semibold sm:text-lg ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                                  }`}
                              >
                                {transaction.type === 'income' ? '+' : ''}
                                {formatCurrency(transaction.amount, userCurrency)}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
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
                                      className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                  {transaction.tags.length > 2 && (
                                    <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                      +{transaction.tags.length - 2}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                            {transaction.period_name && (
                              <span className="inline-flex items-center rounded bg-purple-50 px-2 py-0.5 text-xs text-purple-700 border border-purple-200">
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
              <div className="mt-6 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg shadow-sm">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.has_prev}
                    className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.has_next}
                    className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-700">
                      Showing page <span className="font-medium">{pagination.page}</span> of{' '}
                      <span className="font-medium">{pagination.total_pages}</span> (
                      <span className="font-medium">{pagination.total}</span> total transactions)
                    </p>
                    <form onSubmit={handleJumpToPage} className="flex items-center gap-2">
                      <label htmlFor="jump-to-page" className="text-sm text-gray-600">
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
                        className="w-16 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                        className="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                              ? 'z-10 border-blue-500 bg-blue-50 text-blue-600'
                              : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                              }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={!pagination.has_next}
                        className="relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className="relative z-10 w-full max-w-2xl animate-in zoom-in-95 duration-300 rounded-lg bg-white p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between" id="modal-title">
                  <h2 className="text-2xl font-bold text-gray-900">Add New Transaction</h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {createError && (
                  <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-800">
                    <p>{createError}</p>
                  </div>
                )}

                <form onSubmit={handleCreateTransaction} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* Amount */}
                    <div>
                      <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
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
                        className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>

                    {/* Transaction Type */}
                    <div>
                      <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                        Type *
                      </label>
                      <select
                        id="type"
                        name="type"
                        value={formData.type}
                        onChange={handleFormChange}
                        required
                        className="block w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-2">
                        Category *
                      </label>
                      <select
                        id="category_id"
                        name="category_id"
                        value={formData.category_id}
                        onChange={handleFormChange}
                        required
                        className="block w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      <label htmlFor="transacted_at" className="block text-sm font-medium text-gray-700 mb-2">
                        Date *
                      </label>
                      <input
                        type="date"
                        id="transacted_at"
                        name="transacted_at"
                        value={formData.transacted_at}
                        onChange={handleFormChange}
                        required
                        className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Time */}
                    <div>
                      <label htmlFor="transacted_time" className="block text-sm font-medium text-gray-700 mb-2">
                        Time *
                      </label>
                      <input
                        type="time"
                        id="transacted_time"
                        name="transacted_time"
                        value={formData.transacted_time}
                        onChange={handleFormChange}
                        required
                        className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Payment Method */}
                    <div>
                      <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Method
                      </label>
                      <select
                        id="payment_method"
                        name="payment_method"
                        value={formData.payment_method}
                        onChange={handleFormChange}
                        className="block w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <input
                        type="text"
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleFormChange}
                        className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Grocery shopping"
                      />
                    </div>

                    {/* Tags */}
                    <div className="md:col-span-2">
                      <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                        Tags
                      </label>
                      <input
                        type="text"
                        id="tags"
                        name="tags"
                        value={formData.tags}
                        onChange={handleFormChange}
                        className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="is_recurring" className="ml-2 block text-sm text-gray-700">
                        Recurring Transaction
                      </label>
                    </div>

                    {/* Recurring Frequency */}
                    {formData.is_recurring && (
                      <div>
                        <label htmlFor="recurring_frequency" className="block text-sm font-medium text-gray-700 mb-2">
                          Frequency *
                        </label>
                        <select
                          id="recurring_frequency"
                          name="recurring_frequency"
                          value={formData.recurring_frequency}
                          onChange={handleFormChange}
                          required={formData.is_recurring}
                          className="block w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
              <div className="relative z-10 w-full max-w-lg rounded-xl bg-white shadow-2xl">
                {/* Header with gradient background */}
                <div className={`rounded-t-xl px-6 py-5 ${
                  selectedTransaction.type === 'income' ? 'bg-gradient-to-r from-green-50 to-emerald-50' :
                  selectedTransaction.type === 'expense' ? 'bg-gradient-to-r from-red-50 to-rose-50' :
                  selectedTransaction.type === 'saving' ? 'bg-gradient-to-r from-blue-50 to-cyan-50' :
                  selectedTransaction.type === 'investment' ? 'bg-gradient-to-r from-purple-50 to-indigo-50' :
                  'bg-gradient-to-r from-gray-50 to-slate-50'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        {selectedTransaction.category?.icon ? (
                          <div
                            className="flex h-12 w-12 items-center justify-center rounded-full text-2xl shadow-sm"
                            style={{ backgroundColor: `${selectedTransaction.category.color}30` }}
                          >
                            {selectedTransaction.category.icon}
                          </div>
                        ) : (
                          getTransactionIcon(selectedTransaction.type)
                        )}
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            {selectedTransaction.type}
                          </p>
                          <p className={`text-2xl font-bold ${
                            selectedTransaction.type === 'income' ? 'text-green-600' :
                            selectedTransaction.type === 'expense' ? 'text-red-600' :
                            selectedTransaction.type === 'saving' ? 'text-blue-600' :
                            selectedTransaction.type === 'investment' ? 'text-purple-600' :
                            'text-gray-600'
                          }`}>
                            {selectedTransaction.type === 'income' ? '+' : ''}
                            {formatCurrency(selectedTransaction.amount, userCurrency)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        setSelectedTransaction(null);
                      }}
                      className="rounded-lg p-1 text-gray-400 hover:bg-white hover:text-gray-600 transition-colors"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 py-5 space-y-4">
                  {/* Description */}
                  {selectedTransaction.description && (
                    <div className="flex items-start gap-3">
                      <svg className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Description</p>
                        <p className="text-sm text-gray-900">{selectedTransaction.description}</p>
                      </div>
                    </div>
                  )}

                  {/* Category */}
                  {selectedTransaction.category && (
                    <div className="flex items-start gap-3">
                      <svg className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Category</p>
                        <div className="flex items-center gap-2">
                          <span
                            className="flex h-6 w-6 items-center justify-center rounded-full text-sm"
                            style={{ backgroundColor: `${selectedTransaction.category.color}20` }}
                          >
                            {selectedTransaction.category.icon}
                          </span>
                          <span className="text-sm text-gray-900">{selectedTransaction.category.name}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Date */}
                  <div className="flex items-start gap-3">
                    <svg className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Date</p>
                      <p className="text-sm text-gray-900">{formatDate(selectedTransaction.transacted_at)}</p>
                    </div>
                  </div>

                  {/* Budget Period */}
                  {selectedTransaction.period_name && (
                    <div className="flex items-start gap-3">
                      <svg className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Budget Period</p>
                        <p className="text-sm text-gray-900">{selectedTransaction.period_name}</p>
                      </div>
                    </div>
                  )}

                  {/* Payment Method */}
                  {selectedTransaction.payment_method && (
                    <div className="flex items-start gap-3">
                      <svg className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Payment Method</p>
                        {getPaymentMethodBadge(selectedTransaction.payment_method)}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {selectedTransaction.tags && selectedTransaction.tags.length > 0 && (
                    <div className="flex items-start gap-3">
                      <svg className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Tags</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedTransaction.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recurring */}
                  {selectedTransaction.is_recurring && (
                    <div className="flex items-start gap-3">
                      <svg className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Recurring</p>
                        <p className="text-sm text-gray-900">
                          {selectedTransaction.recurring_frequency && selectedTransaction.recurring_frequency.charAt(0).toUpperCase() + selectedTransaction.recurring_frequency.slice(1)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 rounded-b-xl">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{new Date(selectedTransaction.created_at).toLocaleDateString()}</span>
                    </div>
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        setSelectedTransaction(null);
                      }}
                      className="rounded-lg bg-white border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Close
                    </button>
                  </div>
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
