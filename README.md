# 🚗 Car Booking Application

A modern, microservices-based car booking platform built with Node.js, React, gRPC, and PostgreSQL. Features include real-time availability checking, booking conflict prevention, dealer car management, and external calendar integration.

## 🏗️ Architecture

This application follows a **microservices architecture** with gRPC for inter-service communication:

```
┌─────────────┐
│   Frontend  │ (React + Vite)
│   Port 3000 │
└──────┬──────┘
       │ REST API
┌──────▼──────────┐
│  API Gateway    │ (Express)
│   Port 5000     │
└────┬─────┬──────┘
     │ gRPC│
     ▼     ▼
┌────────┐ ┌──────────┐ ┌──────────────┐
│  Car   │ │ Booking  │ │ Integration  │
│Service │ │ Service  │ │   Service    │
│ :50051 │ │  :50052  │ │:50053 & :5003│
└───┬────┘ └────┬─────┘ └──────┬───────┘
    │           │               │
    └───────────┴───────────────┘
                │
         ┌──────▼───────┐
         │  PostgreSQL  │
         │   Port 5432  │
         └──────────────┘
```

### Services

- **Frontend**: React SPA with premium UI/UX
- **API Gateway**: REST to gRPC translation layer
- **Car Service**: Vehicle inventory management (gRPC)
- **Booking Service**: Booking management with conflict detection (gRPC)
- **Integration Service**: External API and calendar sync (gRPC + REST)
- **PostgreSQL**: Relational database for all data

## ✨ Features

### For Customers
- 🚗 Browse premium car inventory with images and descriptions
- 📅 Select booking dates with interactive calendar
- ✅ Real-time availability checking
- 🔒 Booking conflict prevention
- 🎫 Self-service cancellation with unique tokens
- 📱 Responsive, mobile-friendly design

### For Dealers
- 🏢 Comprehensive booking dashboard
- 🚙 Full car inventory management (CRUD)
- 📸 Image upload for vehicles
- 🔧 Block availability for maintenance
- 📊 Booking statistics and filters
- 🗓️ Google Calendar integration
- 🔌 External API for third-party integrations

## 🚀 Quick Start

### Prerequisites

- Docker (v20.10+)
- Docker Compose (v2.0+)

### Installation

1. **Clone the repository**
   ```bash
   cd "/home/olli/Documents/antigravity/First test"
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   ```

3. **Start all services**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - API Gateway: http://localhost:5000
   - Integration Service (External API): http://localhost:5003

### First Time Setup

The database will be automatically initialized with sample car data on first run.

## 📖 Usage Guide

### Booking a Car (Customer)

1. Navigate to http://localhost:3000
2. Browse available cars
3. Click on a car to select it
4. Choose pickup and return dates
5. Fill in your contact information
6. Click "Confirm Booking"
7. Save your cancellation token for later use

### Managing Bookings (Dealer)

1. Go to "Dealer Dashboard" in the navigation
2. View all active/cancelled bookings
3. Filter bookings by status
4. Cancel bookings if needed

### Managing Cars (Dealer)

1. Go to "Manage Cars" in the navigation
2. Click "Add New Car" to add a vehicle
3. Upload images and add descriptions
4. Edit or delete existing cars
5. Block availability for maintenance periods

### Setting Up Integrations

1. Go to "Integrations" in the navigation
2. Connect Google Calendar (requires OAuth2 setup)
3. View external API documentation
4. Configure webhooks for third-party apps

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Database
DB_NAME=carbooking
DB_USER=postgres
DB_PASSWORD=postgres

# Google Calendar (Optional)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5003/external/google-calendar/callback
```

### Google Calendar Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:5003/external/google-calendar/callback`
6. Copy Client ID and Client Secret to `.env`

## 🛠️ Development

### Running Services Individually

**Car Service:**
```bash
cd services/car-service
npm install
npm start
```

**Booking Service:**
```bash
cd services/booking-service
npm install
npm start
```

**Integration Service:**
```bash
cd services/integration-service
npm install
npm start
```

**API Gateway:**
```bash
cd api-gateway
npm install
npm start
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Database Access

Connect to PostgreSQL:
```bash
docker exec -it carbooking-postgres psql -U postgres -d carbooking
```

## 📡 API Documentation

### REST API (via API Gateway - Port 5000)

**Cars:**
- `GET /api/cars` - List all cars
- `GET /api/cars/:id` - Get car details
- `POST /api/cars` - Add new car (multipart/form-data)
- `PUT /api/cars/:id` - Update car
- `DELETE /api/cars/:id` - Delete car
- `POST /api/cars/:id/block` - Block availability
- `GET /api/cars/:id/blocked-slots` - Get blocked slots

**Bookings:**
- `GET /api/bookings` - List bookings
- `POST /api/bookings` - Create booking
- `DELETE /api/bookings/:id` - Cancel booking (dealer)
- `POST /api/bookings/cancel` - Cancel booking (customer with token)
- `GET /api/availability/:carId` - Check availability

**Integrations:**
- `GET /api/integrations` - List integrations
- `POST /api/integrations/configure` - Configure integration
- `POST /api/integrations/sync-calendar` - Sync to calendar

### External API (Port 5003)

For third-party applications:
- `POST /external/bookings` - Create booking
- `GET /external/bookings/:id` - Get booking details
- `DELETE /external/bookings/:id` - Cancel booking
- `GET /external/availability/:carId` - Check availability
- `POST /external/webhook/register` - Register webhook

See [API.md](./API.md) for detailed documentation.

## 🗄️ Database Schema

### Tables

**cars**
- id, make, model, year, color, description, image_url, dealer_id, created_at

**bookings**
- id, car_id, customer_name, customer_email, customer_phone
- booking_start, booking_end, cancellation_token, status, created_at

**blocked_slots**
- id, car_id, start_time, end_time, reason, created_at

**integrations**
- id, dealer_id, service_name, credentials, status, created_at

## 🐛 Troubleshooting

### Services won't start

1. Check if ports are available:
   ```bash
   lsof -i :3000,5000,5003,5432,50051,50052,50053
   ```

2. Check Docker logs:
   ```bash
   docker-compose logs [service-name]
   ```

3. Rebuild containers:
   ```bash
   docker-compose down -v
   docker-compose up --build
   ```

### Database connection errors

1. Ensure PostgreSQL is healthy:
   ```bash
   docker-compose ps
   ```

2. Check database logs:
   ```bash
   docker-compose logs postgres
   ```

### gRPC connection errors

1. Verify all services are running:
   ```bash
   docker-compose ps
   ```

2. Check service logs for errors
3. Ensure services are on the same Docker network

## 📦 Tech Stack

- **Frontend**: React 18, Vite, React Router, React DatePicker
- **API Gateway**: Express.js, gRPC clients
- **Microservices**: Node.js, gRPC, Protocol Buffers
- **Database**: PostgreSQL 15
- **External Integration**: Google Calendar API
- **Containerization**: Docker, Docker Compose

## 🎨 Design

The application features a premium dark theme with:
- Modern gradient backgrounds
- Smooth animations and transitions
- Responsive design for all devices
- Glassmorphism effects
- Interactive hover states

## 📝 License

This project is provided as-is for demonstration purposes.

## 🤝 Contributing

This is a demonstration project. For production use, consider:
- Adding authentication and authorization
- Implementing API rate limiting
- Adding comprehensive error handling
- Setting up monitoring and logging
- Using environment-specific configurations
- Implementing automated testing
- Adding CI/CD pipelines

## 📧 Support

For issues or questions, please refer to the documentation or check the service logs.
