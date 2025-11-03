# Budget App - Client

A React-based frontend application for the Budget App, featuring Google OAuth authentication and financial management.

## Features

- Google OAuth 2.0 Authentication
- User Profile Management
- Responsive UI with TailwindCSS
- Modern React with Hooks
- Protected Routes
- Token-based Authentication

## Tech Stack

- **React 19.1.0** - UI Framework
- **Vite 7.0.4** - Build Tool
- **React Router DOM 7.6.3** - Routing
- **Axios** - HTTP Client
- **TailwindCSS 4.1.11** - Styling

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Backend API running (see [server README](../server/README.md))

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
```

### Environment Variables

Create a `.env.local` file with the following:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8000
```

For Docker development:
```env
VITE_API_BASE_URL=http://backend:8000
```

For production:
```env
VITE_API_BASE_URL=https://budget.jesseinit.dev
```

### Development

```bash
# Start development server
npm run dev

# The app will be available at http://localhost:5173
```

### Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Authentication Flow

### 1. Initial Page Load
- App checks for `access_token` in localStorage
- If no token: Shows Login component
- If token exists: Fetches user profile and shows UserProfile component

### 2. Login Process

```
┌─────────────────────────────────────────────────────────┐
│ 1. User clicks "Sign in with Google"                    │
│    → GET /api/v1/auth/google                            │
│    ← Returns: { result: { auth_url: "..." } }          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Redirect to Google OAuth URL                         │
│    → User authenticates with Google                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Google redirects to /auth/callback?code=...&state=...│
│    → GET /api/v1/auth/google/callback?code=...         │
│    ← Returns: { result: { access_token: "..." } }      │
│    → Store access_token in localStorage                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Fetch user profile                                   │
│    → GET /api/v1/users/profile                         │
│    ← Returns: { result: { name, email, avatar_url } }  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Redirect to home (/) with UserProfile component     │
└─────────────────────────────────────────────────────────┘
```

### 3. Authenticated State
- UserProfile component displays:
  - User avatar
  - User name and email
  - Logout button
  - Dashboard placeholder (for future implementation)

### 4. Logout
- Removes `access_token` from localStorage
- Redirects to home (shows Login component)

## Project Structure

```
client/
├── src/
│   ├── components/
│   │   ├── Login.jsx           # Login page with Google OAuth button
│   │   └── UserProfile.jsx     # Authenticated user dashboard
│   ├── pages/
│   │   └── OAuthCallback.jsx   # OAuth callback handler
│   ├── services/
│   │   ├── api.js              # Axios instance with interceptors
│   │   └── authService.js      # Authentication service methods
│   ├── App.jsx                 # Main app component with routing
│   ├── main.jsx                # App entry point
│   └── index.css               # Global styles
├── public/                     # Static assets
├── .env.example                # Environment variables template
├── .env.local                  # Local environment variables (git-ignored)
├── package.json
└── vite.config.js
```

## API Client

The app uses Axios with interceptors for:

### Request Interceptor
- Automatically adds `Authorization: Bearer <token>` header to all requests
- Reads token from localStorage

### Response Interceptor
- Extracts `result` field from API responses
- Handles 401 errors by clearing token and redirecting to login

## Components

### Login Component
- Centered login form
- Google OAuth button with logo
- Loading and error states
- Responsive design

### UserProfile Component
- Navigation bar with user info
- Avatar display
- Logout functionality
- Dashboard placeholder with mock stats

### OAuthCallback Component
- Handles OAuth redirect from Google
- Processes authorization code
- Shows loading spinner
- Error handling with auto-redirect

## Development Notes

### API Response Structure
All API endpoints return responses in this format:
```json
{
  "result": { /* actual data */ },
  "meta": {
    "timestamp": "2024-01-01T12:00:00",
    "pagination": null,
    "message": null
  }
}
```

The API client automatically extracts the `result` field.

### Token Management
- Tokens are stored in localStorage
- Automatically included in all API requests
- Cleared on 401 errors or manual logout

### Error Handling
- Network errors are logged to console
- 401 errors trigger automatic logout
- OAuth errors show error message and redirect

## Docker

### Development
```bash
docker-compose up client
```

### Production
```bash
docker build -t budget-app-client .
docker run -p 80:80 budget-app-client
```

## Future Enhancements

- [ ] Add refresh token support
- [ ] Implement budget dashboard
- [ ] Add transaction management
- [ ] Add category management
- [ ] Add financial goals tracking
- [ ] Add analytics and charts
- [ ] Add dark mode toggle
- [ ] Add notification system
- [ ] Add offline support
- [ ] Add PWA features

## Contributing

See the main [README](../README.md) for contribution guidelines.

## License

See the main [README](../README.md) for license information.
