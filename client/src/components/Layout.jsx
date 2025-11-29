import { useState, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

function Layout({ user }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const mainContentRef = useRef(null);

  const handleLogout = () => {
    authService.logout();
    navigate('/');
  };

  const handleNavClick = () => {
    // Scroll to top with smooth animation
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  const navigation = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: 'Transactions',
      path: '/transactions',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar for desktop */}
      <aside className="hidden w-64 flex-col border-r border-gray-200 bg-white lg:flex">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600">
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Budget App</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-md ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <span className="transition-transform duration-200 group-hover:-translate-y-0.5">
                {item.icon}
              </span>
              <span className="transition-transform duration-200 group-hover:-translate-y-0.5">
                {item.name}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* User Profile */}
        <div className="border-t border-gray-200 p-4">
          <div className="mb-3 flex items-center gap-3">
            <img
              src={user.avatar_url}
              alt={user.name}
              className="h-10 w-10 rounded-full ring-2 ring-gray-200"
            />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">{user.name}</p>
              <p className="truncate text-xs text-gray-500">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
            <div className="flex h-16 items-center justify-between border-b border-gray-200 px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h1 className="text-xl font-bold text-gray-900">Budget App</h1>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 space-y-1 px-3 py-4">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={() => {
                    setSidebarOpen(false);
                    handleNavClick();
                  }}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-md ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  <span className="transition-transform duration-200 group-hover:-translate-y-0.5">
                    {item.icon}
                  </span>
                  <span className="transition-transform duration-200 group-hover:-translate-y-0.5">
                    {item.name}
                  </span>
                </NavLink>
              ))}
            </nav>

            <div className="border-t border-gray-200 p-4">
              <div className="mb-3 flex items-center gap-3">
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="h-10 w-10 rounded-full ring-2 ring-gray-200"
                />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="truncate text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-gray-900">Budget App</h1>
          </div>
          <div className="w-6" />
        </header>

        {/* Page content */}
        <main ref={mainContentRef} className="flex-1 overflow-y-auto scroll-smooth">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
