const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { carClient, bookingClient, integrationClient } = require('./grpc-clients');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    },
});

// Serve static files (uploaded images)
app.use('/uploads', express.static(uploadsDir));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'api-gateway' });
});

// ===== CAR ENDPOINTS =====

// Get all cars
app.get('/api/cars', (req, res) => {
    const dealer_id = req.query.dealer_id || '';

    carClient.GetCars({ dealer_id }, (error, response) => {
        if (error) {
            console.error('Error getting cars:', error);
            return res.status(500).json({ error: error.message });
        }
        res.json(response.cars);
    });
});

// Get single car
app.get('/api/cars/:id', (req, res) => {
    const id = parseInt(req.params.id);

    carClient.GetCar({ id }, (error, response) => {
        if (error) {
            console.error('Error getting car:', error);
            return res.status(404).json({ error: 'Car not found' });
        }
        res.json(response.car);
    });
});

// Add new car (with image upload)
app.post('/api/cars', upload.single('image'), (req, res) => {
    const { make, model, year, color, description, dealer_id } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : '';

    carClient.AddCar({
        make,
        model,
        year: parseInt(year),
        color,
        description,
        image_url,
        dealer_id: dealer_id || 'dealer1',
    }, (error, response) => {
        if (error) {
            console.error('Error adding car:', error);
            return res.status(500).json({ error: error.message });
        }
        res.json(response.car);
    });
});

// Update car
app.put('/api/cars/:id', upload.single('image'), (req, res) => {
    const id = parseInt(req.params.id);
    const { make, model, year, color, description } = req.body;
    let { image_url } = req.body;

    if (req.file) {
        image_url = `/uploads/${req.file.filename}`;
    }

    carClient.UpdateCar({
        id,
        make,
        model,
        year: parseInt(year),
        color,
        description,
        image_url,
    }, (error, response) => {
        if (error) {
            console.error('Error updating car:', error);
            return res.status(500).json({ error: error.message });
        }
        res.json(response.car);
    });
});

// Delete car
app.delete('/api/cars/:id', (req, res) => {
    const id = parseInt(req.params.id);

    carClient.DeleteCar({ id }, (error, response) => {
        if (error) {
            console.error('Error deleting car:', error);
            return res.status(500).json({ error: error.message });
        }
        res.json({ success: true, message: response.message });
    });
});

// Block availability
app.post('/api/cars/:id/block', (req, res) => {
    const car_id = parseInt(req.params.id);
    const { start_time, end_time, reason } = req.body;

    carClient.BlockAvailability({
        car_id,
        start_time,
        end_time,
        reason,
    }, (error, response) => {
        if (error) {
            console.error('Error blocking availability:', error);
            return res.status(500).json({ error: error.message });
        }
        res.json(response.blocked_slot);
    });
});

// Get blocked slots
app.get('/api/cars/:id/blocked-slots', (req, res) => {
    const car_id = parseInt(req.params.id);

    carClient.GetBlockedSlots({ car_id }, (error, response) => {
        if (error) {
            console.error('Error getting blocked slots:', error);
            return res.status(500).json({ error: error.message });
        }
        res.json(response.blocked_slots);
    });
});

// ===== BOOKING ENDPOINTS =====

// Get all bookings
app.get('/api/bookings', (req, res) => {
    const car_id = req.query.car_id ? parseInt(req.query.car_id) : 0;
    const status = req.query.status || '';
    const dealer_id = req.query.dealer_id || '';

    bookingClient.GetBookings({ car_id, status, dealer_id }, (error, response) => {
        if (error) {
            console.error('Error getting bookings:', error);
            return res.status(500).json({ error: error.message });
        }
        res.json(response.bookings);
    });
});

// Create booking
app.post('/api/bookings', (req, res) => {
    const { car_id, customer_name, customer_email, customer_phone, booking_start, booking_end } = req.body;

    bookingClient.CreateBooking({
        car_id: parseInt(car_id),
        customer_name,
        customer_email,
        customer_phone,
        booking_start,
        booking_end,
    }, (error, response) => {
        if (error) {
            console.error('Error creating booking:', error);
            return res.status(500).json({ error: error.message });
        }

        if (!response.success) {
            return res.status(400).json({ error: response.message });
        }

        res.json(response.booking);
    });
});

// Cancel booking (dealer)
app.delete('/api/bookings/:id', (req, res) => {
    const id = parseInt(req.params.id);

    bookingClient.CancelBooking({ id, cancellation_token: '' }, (error, response) => {
        if (error) {
            console.error('Error cancelling booking:', error);
            return res.status(500).json({ error: error.message });
        }
        res.json({ success: true, message: response.message });
    });
});

// Cancel booking (customer with token)
app.post('/api/bookings/cancel', (req, res) => {
    const { id, cancellation_token } = req.body;

    bookingClient.CancelBooking({
        id: parseInt(id),
        cancellation_token
    }, (error, response) => {
        if (error) {
            console.error('Error cancelling booking:', error);
            return res.status(500).json({ error: error.message });
        }
        res.json({ success: true, message: response.message });
    });
});

// Check availability
app.get('/api/availability/:carId', (req, res) => {
    const car_id = parseInt(req.params.carId);
    const { start_time, end_time } = req.query;

    bookingClient.CheckAvailability({
        car_id,
        start_time,
        end_time,
    }, (error, response) => {
        if (error) {
            console.error('Error checking availability:', error);
            return res.status(500).json({ error: error.message });
        }
        res.json(response);
    });
});

// ===== INTEGRATION ENDPOINTS =====

// Get integrations
app.get('/api/integrations', (req, res) => {
    const dealer_id = req.query.dealer_id || 'dealer1';
    const service_name = req.query.service_name || '';

    integrationClient.GetIntegrationStatus({ dealer_id, service_name }, (error, response) => {
        if (error) {
            console.error('Error getting integrations:', error);
            return res.status(500).json({ error: error.message });
        }
        res.json(response.integrations);
    });
});

// Configure integration
app.post('/api/integrations/configure', (req, res) => {
    const { dealer_id, service_name, credentials } = req.body;

    integrationClient.ConfigureIntegration({
        dealer_id,
        service_name,
        credentials: JSON.stringify(credentials),
    }, (error, response) => {
        if (error) {
            console.error('Error configuring integration:', error);
            return res.status(500).json({ error: error.message });
        }
        res.json(response.integration);
    });
});

// Sync to calendar
app.post('/api/integrations/sync-calendar', (req, res) => {
    const { dealer_id, booking_id, service_name, action } = req.body;

    integrationClient.SyncToCalendar({
        dealer_id,
        booking_id: parseInt(booking_id),
        service_name,
        action,
    }, (error, response) => {
        if (error) {
            console.error('Error syncing to calendar:', error);
            return res.status(500).json({ error: error.message });
        }
        res.json(response);
    });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});
