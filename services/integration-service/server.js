const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./db');
const calendar = require('./calendar');

const PROTO_PATH = path.join(__dirname, '../../proto/integration.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const integrationProto = grpc.loadPackageDefinition(packageDefinition).integration;

// gRPC Service implementations
async function SyncToCalendar(call, callback) {
    const { dealer_id, booking_id, service_name, action } = call.request;

    if (service_name !== 'google_calendar') {
        callback({
            code: grpc.status.UNIMPLEMENTED,
            message: 'Only Google Calendar is currently supported',
        });
        return;
    }

    try {
        // Get booking details
        const bookingResult = await pool.query(
            `SELECT b.*, c.make as car_make, c.model as car_model 
       FROM bookings b 
       JOIN cars c ON b.car_id = c.id 
       WHERE b.id = $1`,
            [booking_id]
        );

        if (bookingResult.rows.length === 0) {
            callback({
                code: grpc.status.NOT_FOUND,
                message: 'Booking not found',
            });
            return;
        }

        const booking = bookingResult.rows[0];

        if (action === 'create') {
            const eventId = await calendar.createCalendarEvent(dealer_id, {
                car_make: booking.car_make,
                car_model: booking.car_model,
                customer_name: booking.customer_name,
                customer_email: booking.customer_email,
                customer_phone: booking.customer_phone,
                booking_start: booking.booking_start.toISOString(),
                booking_end: booking.booking_end.toISOString(),
            });

            callback(null, {
                success: true,
                message: 'Event synced to Google Calendar',
                external_event_id: eventId,
            });
        } else if (action === 'delete') {
            // In a real implementation, you'd store the event ID with the booking
            callback(null, {
                success: true,
                message: 'Event deletion requested (event ID needed)',
                external_event_id: '',
            });
        } else {
            callback({
                code: grpc.status.INVALID_ARGUMENT,
                message: 'Invalid action. Use "create" or "delete"',
            });
        }
    } catch (error) {
        console.error('Error syncing to calendar:', error);
        callback({
            code: grpc.status.INTERNAL,
            message: 'Failed to sync to calendar: ' + error.message,
        });
    }
}

async function GetIntegrationStatus(call, callback) {
    const { dealer_id, service_name } = call.request;

    try {
        let query = 'SELECT id, dealer_id, service_name, status, created_at FROM integrations WHERE dealer_id = $1';
        const params = [dealer_id];

        if (service_name) {
            query += ' AND service_name = $2';
            params.push(service_name);
        }

        const result = await pool.query(query, params);

        const integrations = result.rows.map(row => ({
            id: row.id,
            dealer_id: row.dealer_id,
            service_name: row.service_name,
            status: row.status,
            created_at: row.created_at.toISOString(),
        }));

        callback(null, { integrations });
    } catch (error) {
        console.error('Error getting integration status:', error);
        callback({
            code: grpc.status.INTERNAL,
            message: 'Failed to get integration status: ' + error.message,
        });
    }
}

async function ConfigureIntegration(call, callback) {
    const { dealer_id, service_name, credentials } = call.request;

    try {
        const credentialsObj = JSON.parse(credentials);

        const result = await pool.query(
            `INSERT INTO integrations (dealer_id, service_name, credentials, status) 
       VALUES ($1, $2, $3, 'active') 
       ON CONFLICT (dealer_id, service_name) 
       DO UPDATE SET credentials = $3, status = 'active'
       RETURNING *`,
            [dealer_id, service_name, credentialsObj]
        );

        const integration = result.rows[0];

        callback(null, {
            success: true,
            message: 'Integration configured successfully',
            integration: {
                id: integration.id,
                dealer_id: integration.dealer_id,
                service_name: integration.service_name,
                status: integration.status,
                created_at: integration.created_at.toISOString(),
            },
        });
    } catch (error) {
        console.error('Error configuring integration:', error);
        callback({
            code: grpc.status.INTERNAL,
            message: 'Failed to configure integration: ' + error.message,
        });
    }
}

async function RemoveIntegration(call, callback) {
    const { dealer_id, service_name } = call.request;

    try {
        const result = await pool.query(
            'DELETE FROM integrations WHERE dealer_id = $1 AND service_name = $2 RETURNING id',
            [dealer_id, service_name]
        );

        if (result.rows.length === 0) {
            callback({
                code: grpc.status.NOT_FOUND,
                message: 'Integration not found',
            });
            return;
        }

        callback(null, {
            success: true,
            message: 'Integration removed successfully',
        });
    } catch (error) {
        console.error('Error removing integration:', error);
        callback({
            code: grpc.status.INTERNAL,
            message: 'Failed to remove integration: ' + error.message,
        });
    }
}

// Start gRPC server
function startGrpcServer() {
    const server = new grpc.Server();

    server.addService(integrationProto.IntegrationService.service, {
        SyncToCalendar,
        GetIntegrationStatus,
        ConfigureIntegration,
        RemoveIntegration,
    });

    const port = process.env.GRPC_PORT || '50053';
    server.bindAsync(
        `0.0.0.0:${port}`,
        grpc.ServerCredentials.createInsecure(),
        (error, port) => {
            if (error) {
                console.error('Failed to start gRPC server:', error);
                return;
            }
            console.log(`Integration Service (gRPC) running on port ${port}`);
            server.start();
        }
    );
}

// Start REST API server for external apps
function startRestServer() {
    const app = express();
    app.use(cors());
    app.use(express.json());

    // External API endpoints
    app.get('/external/health', (req, res) => {
        res.json({ status: 'ok', service: 'integration-service' });
    });

    // Get OAuth URL for Google Calendar
    app.get('/external/google-calendar/auth-url', (req, res) => {
        try {
            const authUrl = calendar.getAuthUrl();
            res.json({ authUrl });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // OAuth callback handler
    app.get('/external/google-calendar/callback', async (req, res) => {
        const { code, state } = req.query; // state would contain dealer_id

        try {
            const tokens = await calendar.getTokensFromCode(code);

            // Store tokens in database
            const dealer_id = state || 'dealer1'; // In production, decode state parameter
            await pool.query(
                `INSERT INTO integrations (dealer_id, service_name, credentials, status) 
         VALUES ($1, 'google_calendar', $2, 'active') 
         ON CONFLICT (dealer_id, service_name) 
         DO UPDATE SET credentials = $2, status = 'active'`,
                [dealer_id, tokens]
            );

            res.send('<h1>Google Calendar Connected!</h1><p>You can close this window.</p>');
        } catch (error) {
            console.error('OAuth callback error:', error);
            res.status(500).send('<h1>Error connecting to Google Calendar</h1><p>' + error.message + '</p>');
        }
    });

    // External booking API (for third-party apps)
    app.post('/external/bookings', async (req, res) => {
        // This would integrate with the booking service
        // For now, return a placeholder
        res.json({
            message: 'External booking API - integrate with booking service via gRPC',
            note: 'Requires API key authentication in production'
        });
    });

    // Webhook registration
    app.post('/external/webhook/register', async (req, res) => {
        const { url, events } = req.body;
        res.json({
            message: 'Webhook registration endpoint',
            registered: { url, events },
            note: 'Store webhook configurations in database'
        });
    });

    const port = process.env.REST_PORT || 5003;
    app.listen(port, () => {
        console.log(`Integration Service (REST) running on port ${port}`);
    });
}

// Start both servers
function main() {
    startGrpcServer();
    startRestServer();
}

main();
