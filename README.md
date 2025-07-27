# Ecommerce API with Azure Services

A modern Express.js backend for ecommerce applications using Azure Cosmos DB and Azure Storage Blob.

## 🚀 Features

- **Express.js** - Fast, unopinionated web framework
- **Azure Cosmos DB** - Globally distributed, multi-model database
- **Azure Storage Blob** - Scalable cloud storage for files
- **JWT Authentication** - Secure token-based authentication
- **Input Validation** - Express-validator for request validation
- **Error Handling** - Comprehensive error handling middleware
- **Rate Limiting** - Protection against abuse
- **Security** - Helmet.js for security headers
- **CORS** - Cross-origin resource sharing support

## 📋 Prerequisites

- Node.js (v16 or higher)
- Azure account with:
  - Cosmos DB account
  - Storage account
- npm or yarn package manager

## 🛠️ Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Install dependencies
npm install
```

### 2. Azure Configuration

#### Azure Cosmos DB Setup

1. Create a Cosmos DB account in Azure Portal
2. Create a database named `ecommerce_db`
3. Get your Cosmos DB endpoint and key from the Azure Portal

#### Azure Storage Setup

1. Create a Storage account in Azure Portal
2. Create a blob container named `product-images`
3. Get your storage connection string from the Azure Portal

### 3. Environment Configuration

Copy the example environment file and configure your Azure credentials:

```bash
# Copy environment file
cp env.example .env
```

Edit `.env` file with your Azure credentials:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Azure Cosmos DB Configuration
COSMOS_ENDPOINT=https://your-cosmos-account.documents.azure.com:443/
COSMOS_KEY=your_cosmos_db_primary_key
COSMOS_DATABASE_NAME=ecommerce_db

# Azure Storage Blob Configuration
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=your-storage-account;AccountKey=your-storage-key;EndpointSuffix=core.windows.net
AZURE_STORAGE_CONTAINER_NAME=product-images

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. Initialize Azure Services

```bash
# Initialize Cosmos DB and Storage containers
node src/init.js
```

This will also create default admin users:

- **Super Admin**: <admin@ecommerce.com> / admin123456
- **Manager**: <manager@ecommerce.com> / manager123456

### 5. Start the Server

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start
```

The API will be available at `http://localhost:3000`

## 📚 API Endpoints

### Authentication

- `POST /api/auth/register` - Register new customer
- `POST /api/auth/login` - User login (customer or admin)
- `GET /api/auth/profile` - Get current user profile
- `POST /api/auth/logout` - User logout

### Customer Routes

- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update current user profile
- `DELETE /api/users/profile` - Delete current user account

### Admin Routes (Admin only)

- `GET /api/admin/dashboard` - Get admin dashboard stats
- `GET /api/admin/users` - Get all users (with pagination and search)
- `GET /api/admin/users/:id` - Get user by ID
- `PUT /api/admin/users/:id` - Update user by ID
- `DELETE /api/admin/users/:id` - Delete user by ID
- `GET /api/admin/admins` - List all admin users
- `POST /api/admin/admins` - Create new admin user
- `DELETE /api/admin/admins/:id` - Delete admin user

### Health Check

- `GET /health` - API health status

## 🔐 Authentication

The API uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer your_jwt_token_here
```

## 📁 Project Structure

```
src/
├── config/
│   ├── cosmos.js          # Azure Cosmos DB configuration
│   └── storage.js         # Azure Storage configuration
├── controllers/
│   ├── authController.js  # Authentication controller
│   ├── admin/             # Admin controllers
│   │   ├── adminController.js    # Main admin operations
│   │   ├── productController.js  # Product management (placeholder)
│   │   ├── orderController.js    # Order management (placeholder)
│   │   └── userController.js     # Advanced user management (placeholder)
│   └── users/             # User controllers
│       ├── userController.js     # Customer profile management
│       ├── profileController.js  # Advanced profile features (placeholder)
│       └── shoppingController.js # Shopping features (placeholder)
├── middleware/
│   ├── auth.js            # Authentication middleware
│   └── errorHandler.js    # Error handling middleware
├── models/
│   └── User.js            # User model
├── routes/
│   ├── auth.js            # Authentication routes
│   ├── users.js           # Customer profile routes
│   └── admin.js           # Admin management routes
├── seeders/
│   └── adminSeeder.js     # Admin user seeding
├── services/
│   └── userService.js     # User business logic
├── init.js                # Azure services initialization
└── server.js              # Main server file
```

## 🧪 Testing the API

### Register a new user

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890"
  }'
```

### Login as Customer

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Login as Admin

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ecommerce.com",
    "password": "admin123456"
  }'
```

### Get user profile (with token)

```bash
curl -X GET http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get admin dashboard (admin only)

```bash
curl -X GET http://localhost:3000/api/admin/dashboard \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

## 🔧 Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with hot reload
- `npm test` - Run tests (when implemented)

### Adding New Features

1. **Models**: Create new models in `src/models/`
2. **Services**: Add business logic in `src/services/`
3. **Routes**: Create new route files in `src/routes/`
4. **Middleware**: Add custom middleware in `src/middleware/`

## 🚀 Deployment

### Environment Variables for Production

Make sure to set these environment variables in your production environment:

- `NODE_ENV=production`
- `PORT` (your production port)
- All Azure credentials
- A strong `JWT_SECRET`

### Azure Deployment

This API is designed to work seamlessly with Azure services. Consider deploying to:

- Azure App Service
- Azure Container Instances
- Azure Kubernetes Service

## 📝 License

MIT License - feel free to use this project for your ecommerce needs!

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

If you encounter any issues or have questions:

1. Check the Azure documentation for service-specific issues
2. Review the error logs in your application
3. Ensure all environment variables are correctly set
4. Verify Azure service connectivity

---

**Happy coding! 🎉**
