# Budget App

A full-stack personal budget tracking and analytics application with investment data integration, deployed on Kubernetes.

## Overview

Budget App is a comprehensive financial management platform that helps you track expenses, set financial goals, analyze spending patterns, and monitor investments. Built with modern technologies and deployed on a production-ready Kubernetes infrastructure.

### Key Features

- **Transaction Management**: Track income and expenses with categories and tags
- **Budget Periods**: Define and monitor budget periods with carry-over support
- **Financial Goals**: Set and track progress toward financial objectives
- **Analytics Dashboard**: Visualize spending patterns and trends
- **Investment Tracking**: Integration with Trading212 API for portfolio monitoring
- **OAuth Authentication**: Secure Google OAuth 2.0 authentication
- **Real-time Caching**: Redis-backed caching for investment data
- **RESTful API**: Well-documented FastAPI backend with automatic OpenAPI docs

## Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.13)
- **Database**: PostgreSQL 15 with SQLAlchemy ORM
- **Caching**: Redis 7
- **Authentication**: OAuth 2.0 (Google) + JWT tokens
- **API Documentation**: OpenAPI/Swagger
- **Database Migrations**: Alembic
- **Package Management**: UV

### Frontend
- **Framework**: React 19.1
- **Routing**: React Router v7
- **Styling**: Tailwind CSS v4
- **Build Tool**: Vite 7
- **Language**: JavaScript (ES modules)

### Infrastructure
- **Cloud Provider**: Hetzner Cloud
- **Orchestration**: Kubernetes (K3s)
- **Ingress**: Nginx Ingress Controller
- **Load Balancer**: Hetzner Cloud Load Balancer
- **Secrets Management**: Sealed Secrets
- **Infrastructure as Code**: Terraform
- **Container Registry**: GitHub Container Registry (GHCR)

## Project Structure

```
budget-app/
├── client/                 # React frontend application
│   ├── src/               # Source files
│   ├── public/            # Static assets
│   ├── Dockerfile         # Production container
│   └── Dockerfile.dev     # Development container
│
├── server/                # FastAPI backend application
│   ├── app/
│   │   ├── api/v1/       # API route handlers
│   │   ├── auth/         # Authentication logic
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # Business logic layer
│   │   └── utils/        # Utility functions
│   ├── alembic/          # Database migrations
│   ├── scripts/          # Utility scripts
│   └── tests/            # Test suite
│
├── iac/                   # Infrastructure as Code (Terraform)
│   ├── modules/
│   │   ├── k8s-cluster/  # K3s cluster configuration
│   │   ├── network/      # VPC and firewall rules
│   │   └── loadbalancer/ # Load balancer setup
│   └── scripts/          # Deployment scripts
│
├── k8s/                   # Kubernetes manifests
│   ├── base/             # Base application manifests
│   └── overlays/         # Environment-specific overlays
│
├── docker-compose.yml     # Local development environment
├── Makefile              # Common operations shortcuts
└── SETUP.md              # Detailed setup guide
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Python 3.13+
- Node.js 18+
- PostgreSQL 15
- Redis 7

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd budget-app
   ```

2. **Start the development environment**
   ```bash
   docker-compose up -d
   ```

   This will start:
   - PostgreSQL database on port 5432
   - Redis cache on port 6379
   - Backend API on port 9000
   - Frontend development server on port 5173

3. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:9000
   - API Documentation: http://localhost:9000/docs

### Manual Setup (Without Docker)

#### Backend Setup

```bash
cd server

# Install UV package manager (if not installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies
uv sync

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
uv run alembic upgrade head

# Start the development server
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend Setup

```bash
cd client

# Install dependencies
npm install

# Start development server
npm run dev
```

## Environment Variables

### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql+asyncpg://budgetuser:budgetpass@localhost:5432/budgetdb

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
SECRET_KEY=your-secret-key-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Trading212 API
TRADING212_API_KEY=your-api-key

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

## API Documentation

Once the backend is running, access the interactive API documentation at:

- **Swagger UI**: http://localhost:9000/docs
- **ReDoc**: http://localhost:9000/redoc

### Main API Endpoints

- `POST /auth/login` - User authentication
- `POST /auth/google` - Google OAuth login
- `GET /api/v1/users/me` - Get current user
- `GET /api/v1/transactions` - List transactions
- `POST /api/v1/transactions` - Create transaction
- `GET /api/v1/categories` - List categories
- `GET /api/v1/periods` - List budget periods
- `GET /api/v1/goals` - List financial goals
- `GET /api/v1/analytics/*` - Various analytics endpoints

## Database Schema

The application uses PostgreSQL with the following main entities:

- **Users**: User accounts and authentication
- **Transactions**: Income and expense records
- **Categories**: Transaction categorization
- **Budget Periods**: Time-based budget tracking
- **Financial Goals**: Savings and financial targets
- **Reference Data**: Currencies, transaction types, etc.

See [server/init.sql](server/init.sql) for the complete schema.

## Deployment

### Production Deployment on Kubernetes

For detailed deployment instructions, see [SETUP.md](SETUP.md) and [DEPLOYMENT.md](DEPLOYMENT.md).

**Quick deployment:**

```bash
# Setup cluster on Hetzner Cloud
make setup-cluster

# Deploy application
cd k8s
./deploy.sh

# Get load balancer IP
terraform -chdir=iac output loadbalancer_ip
```

### Infrastructure Costs

Approximate monthly costs on Hetzner Cloud:
- Master node (CX21): ~€5/month
- Worker nodes (2x CX21): ~€10/month
- Load balancer (LB11): ~€5/month
- **Total: ~€20/month**

## Development

### Running Tests

```bash
# Backend tests
cd server
uv run pytest

# Frontend tests (if configured)
cd client
npm test
```

### Code Formatting

```bash
# Backend
cd server
uv run black .
uv run isort .
uv run ruff check .

# Frontend
cd client
npm run lint
```

### Database Migrations

```bash
cd server

# Create a new migration
uv run alembic revision --autogenerate -m "Description of changes"

# Apply migrations
uv run alembic upgrade head

# Rollback one migration
uv run alembic downgrade -1
```

## Architecture

### System Architecture

```
┌─────────────────┐
│  Load Balancer  │ (Hetzner Cloud LB)
└────────┬────────┘
         │
         ├──────────────────────────┐
         │                          │
┌────────▼────────┐        ┌────────▼────────┐
│ Nginx Ingress   │        │ Nginx Ingress   │
│  (Node 1)       │        │  (Node 2)       │
└────────┬────────┘        └────────┬────────┘
         │                          │
    ┌────┴─────┬────────────────────┴─────┐
    │          │                          │
┌───▼──┐  ┌────▼──┐  ┌────────────┐  ┌────▼────┐
│React │  │FastAPI│  │ PostgreSQL │  │ Redis   │
│ App  │  │ API   │  │            │  │         │
└──────┘  └───────┘  └────────────┘  └─────────┘
```

### Authentication Flow

1. User initiates Google OAuth login
2. Backend exchanges authorization code for tokens
3. JWT access token issued to client
4. Client includes JWT in subsequent API requests
5. Backend validates JWT and authorizes requests

### Data Caching Strategy

- Investment data cached in Redis with configurable TTL
- Cache invalidation on user-initiated refresh
- Fallback to API on cache miss

## Troubleshooting

### Common Issues

**Database connection errors**
```bash
# Check if PostgreSQL is running
docker-compose ps db

# View database logs
docker-compose logs db
```

**Redis connection errors**
```bash
# Check if Redis is running
docker-compose ps redis

# Test Redis connection
redis-cli -h localhost ping
```

**Frontend can't connect to backend**
- Verify CORS settings in backend [.env](server/.env)
- Check that backend is running on the expected port
- Ensure API URL is correctly configured in frontend

**OAuth login fails**
- Verify Google OAuth credentials in backend [.env](server/.env)
- Check redirect URIs in Google Cloud Console
- Ensure client and server have matching OAuth configuration

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Author

**Jesse Egbosionu**
- Email: me@jesseinit.dev
- GitHub: [@jesseinit](https://github.com/jesseinit)

## Acknowledgments

- FastAPI for the excellent Python web framework
- React team for the modern frontend library
- Hetzner Cloud for affordable infrastructure
- Trading212 for investment data API access

## Support

For detailed setup and deployment instructions, see:
- [SETUP.md](SETUP.md) - Complete infrastructure setup guide
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment procedures
- API Documentation: http://localhost:9000/docs (when running)

---

Built with care by Jesse Egbosionu
