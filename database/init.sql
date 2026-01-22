-- Database initialization script for car booking application

-- Create cars table
CREATE TABLE IF NOT EXISTS cars (
    id SERIAL PRIMARY KEY,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    color VARCHAR(50),
    description TEXT,
    image_url VARCHAR(500),
    dealer_id VARCHAR(100) DEFAULT 'dealer1',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    car_id INTEGER NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    customer_name VARCHAR(200) NOT NULL,
    customer_email VARCHAR(200) NOT NULL,
    customer_phone VARCHAR(50),
    booking_start TIMESTAMP NOT NULL,
    booking_end TIMESTAMP NOT NULL,
    cancellation_token UUID DEFAULT gen_random_uuid(),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_booking_time CHECK (booking_end > booking_start)
);

-- Create blocked_slots table for maintenance and unavailability
CREATE TABLE IF NOT EXISTS blocked_slots (
    id SERIAL PRIMARY KEY,
    car_id INTEGER NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    reason VARCHAR(200) DEFAULT 'maintenance',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_block_time CHECK (end_time > start_time)
);

-- Create integrations table for external service connections
CREATE TABLE IF NOT EXISTS integrations (
    id SERIAL PRIMARY KEY,
    dealer_id VARCHAR(100) NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    credentials JSONB,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(dealer_id, service_name)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_car_id ON bookings(car_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_time ON bookings(booking_start, booking_end);
CREATE INDEX IF NOT EXISTS idx_bookings_cancellation_token ON bookings(cancellation_token);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_car_id ON blocked_slots(car_id);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_time ON blocked_slots(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_cars_dealer_id ON cars(dealer_id);
CREATE INDEX IF NOT EXISTS idx_integrations_dealer_id ON integrations(dealer_id);

-- Insert sample car data
INSERT INTO cars (make, model, year, color, description, image_url, dealer_id) VALUES
('Tesla', 'Model 3', 2023, 'Pearl White', 'Electric sedan with autopilot, premium interior, and long range battery. Perfect for city driving and long trips.', '/uploads/tesla-model3.jpg', 'dealer1'),
('BMW', 'X5', 2024, 'Alpine White', 'Luxury SUV with advanced safety features, spacious interior, and powerful engine. Ideal for families.', '/uploads/bmw-x5.jpg', 'dealer1'),
('Mercedes-Benz', 'C-Class', 2023, 'Obsidian Black', 'Elegant sedan with cutting-edge technology, comfortable ride, and premium sound system.', '/uploads/mercedes-c-class.jpg', 'dealer1'),
('Audi', 'Q7', 2024, 'Glacier White', 'Premium 7-seater SUV with quattro all-wheel drive, virtual cockpit, and panoramic sunroof.', '/uploads/audi-q7.jpg', 'dealer1'),
('Porsche', '911', 2024, 'Guards Red', 'Iconic sports car with exceptional performance, precision handling, and timeless design.', '/uploads/porsche-911.jpg', 'dealer1'),
('Ford', 'Mustang', 2023, 'Race Red', 'American muscle car with powerful V8 engine, aggressive styling, and thrilling driving experience.', '/uploads/ford-mustang.jpg', 'dealer1')
ON CONFLICT DO NOTHING;

-- Insert a sample blocked slot (for demonstration)
INSERT INTO blocked_slots (car_id, start_time, end_time, reason) VALUES
(1, CURRENT_TIMESTAMP + INTERVAL '7 days', CURRENT_TIMESTAMP + INTERVAL '8 days', 'Scheduled maintenance')
ON CONFLICT DO NOTHING;

-- Grant permissions (if needed for specific database users)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_db_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_db_user;
