const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const pool = require('./db');

const PROTO_PATH = path.join(__dirname, '../../proto/booking.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const bookingProto = grpc.loadPackageDefinition(packageDefinition).booking;

// Helper function to check for conflicts
async function checkConflicts(car_id, start_time, end_time, excludeBookingId = null) {
    const conflicts = [];

    // Check for existing bookings
    let bookingQuery = `
    SELECT booking_start, booking_end 
    FROM bookings 
    WHERE car_id = $1 
      AND status = 'active'
      AND (
        (booking_start < $3 AND booking_end > $2)
      )
  `;
    const bookingParams = [car_id, start_time, end_time];

    if (excludeBookingId) {
        bookingQuery += ' AND id != $4';
        bookingParams.push(excludeBookingId);
    }

    const bookingResult = await pool.query(bookingQuery, bookingParams);

    bookingResult.rows.forEach(row => {
        conflicts.push({
            type: 'booking',
            start_time: row.booking_start.toISOString(),
            end_time: row.booking_end.toISOString(),
            reason: 'Car is already booked for this time period',
        });
    });

    // Check for blocked slots
    const blockedQuery = `
    SELECT start_time, end_time, reason 
    FROM blocked_slots 
    WHERE car_id = $1 
      AND (
        (start_time < $3 AND end_time > $2)
      )
  `;
    const blockedResult = await pool.query(blockedQuery, [car_id, start_time, end_time]);

    blockedResult.rows.forEach(row => {
        conflicts.push({
            type: 'blocked',
            start_time: row.start_time.toISOString(),
            end_time: row.end_time.toISOString(),
            reason: row.reason || 'Car is unavailable',
        });
    });

    return conflicts;
}

// Service implementations
async function CreateBooking(call, callback) {
    const { car_id, customer_name, customer_email, customer_phone, booking_start, booking_end } = call.request;

    try {
        // Verify car exists
        const carCheck = await pool.query('SELECT id FROM cars WHERE id = $1', [car_id]);
        if (carCheck.rows.length === 0) {
            callback({
                code: grpc.status.NOT_FOUND,
                message: 'Car not found',
            });
            return;
        }

        // Check for conflicts
        const conflicts = await checkConflicts(car_id, booking_start, booking_end);

        if (conflicts.length > 0) {
            callback(null, {
                success: false,
                message: 'Car is not available for the selected time period',
                booking: null,
            });
            return;
        }

        // Create booking
        const result = await pool.query(
            `INSERT INTO bookings (car_id, customer_name, customer_email, customer_phone, booking_start, booking_end) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
            [car_id, customer_name, customer_email, customer_phone, booking_start, booking_end]
        );

        const booking = result.rows[0];

        // Get car details for response
        const carResult = await pool.query('SELECT make, model FROM cars WHERE id = $1', [car_id]);
        const car = carResult.rows[0];

        callback(null, {
            success: true,
            message: 'Booking created successfully',
            booking: {
                id: booking.id,
                car_id: booking.car_id,
                customer_name: booking.customer_name,
                customer_email: booking.customer_email,
                customer_phone: booking.customer_phone,
                booking_start: booking.booking_start.toISOString(),
                booking_end: booking.booking_end.toISOString(),
                cancellation_token: booking.cancellation_token,
                status: booking.status,
                created_at: booking.created_at.toISOString(),
                car_make: car.make,
                car_model: car.model,
            },
        });
    } catch (error) {
        console.error('Error creating booking:', error);
        callback({
            code: grpc.status.INTERNAL,
            message: 'Failed to create booking: ' + error.message,
        });
    }
}

async function GetBookings(call, callback) {
    const { car_id, status, dealer_id } = call.request;

    try {
        let query = `
      SELECT b.*, c.make as car_make, c.model as car_model 
      FROM bookings b
      JOIN cars c ON b.car_id = c.id
      WHERE 1=1
    `;
        const params = [];
        let paramIndex = 1;

        if (car_id) {
            query += ` AND b.car_id = $${paramIndex}`;
            params.push(car_id);
            paramIndex++;
        }

        if (status) {
            query += ` AND b.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (dealer_id) {
            query += ` AND c.dealer_id = $${paramIndex}`;
            params.push(dealer_id);
            paramIndex++;
        }

        query += ' ORDER BY b.booking_start DESC';

        const result = await pool.query(query, params);

        const bookings = result.rows.map(booking => ({
            id: booking.id,
            car_id: booking.car_id,
            customer_name: booking.customer_name,
            customer_email: booking.customer_email,
            customer_phone: booking.customer_phone,
            booking_start: booking.booking_start.toISOString(),
            booking_end: booking.booking_end.toISOString(),
            cancellation_token: booking.cancellation_token,
            status: booking.status,
            created_at: booking.created_at.toISOString(),
            car_make: booking.car_make,
            car_model: booking.car_model,
        }));

        callback(null, { bookings });
    } catch (error) {
        console.error('Error getting bookings:', error);
        callback({
            code: grpc.status.INTERNAL,
            message: 'Failed to get bookings: ' + error.message,
        });
    }
}

async function CancelBooking(call, callback) {
    const { id, cancellation_token } = call.request;

    try {
        let query = 'UPDATE bookings SET status = $1 WHERE id = $2';
        const params = ['cancelled', id];

        // If cancellation token is provided, verify it
        if (cancellation_token) {
            query += ' AND cancellation_token = $3';
            params.push(cancellation_token);
        }

        query += ' RETURNING *';

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            callback({
                code: grpc.status.NOT_FOUND,
                message: 'Booking not found or invalid cancellation token',
            });
            return;
        }

        callback(null, {
            success: true,
            message: 'Booking cancelled successfully',
        });
    } catch (error) {
        console.error('Error cancelling booking:', error);
        callback({
            code: grpc.status.INTERNAL,
            message: 'Failed to cancel booking: ' + error.message,
        });
    }
}

async function CheckAvailability(call, callback) {
    const { car_id, start_time, end_time } = call.request;

    try {
        // Verify car exists
        const carCheck = await pool.query('SELECT id FROM cars WHERE id = $1', [car_id]);
        if (carCheck.rows.length === 0) {
            callback({
                code: grpc.status.NOT_FOUND,
                message: 'Car not found',
            });
            return;
        }

        const conflicts = await checkConflicts(car_id, start_time, end_time);

        callback(null, {
            available: conflicts.length === 0,
            message: conflicts.length === 0
                ? 'Car is available'
                : 'Car is not available for the selected time period',
            conflicts,
        });
    } catch (error) {
        console.error('Error checking availability:', error);
        callback({
            code: grpc.status.INTERNAL,
            message: 'Failed to check availability: ' + error.message,
        });
    }
}

// Start gRPC server
function main() {
    const server = new grpc.Server();

    server.addService(bookingProto.BookingService.service, {
        CreateBooking,
        GetBookings,
        CancelBooking,
        CheckAvailability,
    });

    const port = process.env.GRPC_PORT || '50052';
    server.bindAsync(
        `0.0.0.0:${port}`,
        grpc.ServerCredentials.createInsecure(),
        (error, port) => {
            if (error) {
                console.error('Failed to start server:', error);
                return;
            }
            console.log(`Booking Service running on port ${port}`);
            server.start();
        }
    );
}

main();
