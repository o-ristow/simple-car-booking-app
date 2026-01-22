const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const pool = require('./db');

const PROTO_PATH = path.join(__dirname, '../../proto/car.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const carProto = grpc.loadPackageDefinition(packageDefinition).car;

// Service implementations
async function AddCar(call, callback) {
    const { make, model, year, color, description, image_url, dealer_id } = call.request;

    try {
        const result = await pool.query(
            `INSERT INTO cars (make, model, year, color, description, image_url, dealer_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
            [make, model, year, color, description, image_url, dealer_id || 'dealer1']
        );

        const car = result.rows[0];
        callback(null, {
            success: true,
            message: 'Car added successfully',
            car: {
                id: car.id,
                make: car.make,
                model: car.model,
                year: car.year,
                color: car.color,
                description: car.description,
                image_url: car.image_url,
                dealer_id: car.dealer_id,
                created_at: car.created_at.toISOString(),
            },
        });
    } catch (error) {
        console.error('Error adding car:', error);
        callback({
            code: grpc.status.INTERNAL,
            message: 'Failed to add car: ' + error.message,
        });
    }
}

async function UpdateCar(call, callback) {
    const { id, make, model, year, color, description, image_url } = call.request;

    try {
        const result = await pool.query(
            `UPDATE cars 
       SET make = $1, model = $2, year = $3, color = $4, description = $5, image_url = $6
       WHERE id = $7
       RETURNING *`,
            [make, model, year, color, description, image_url, id]
        );

        if (result.rows.length === 0) {
            callback({
                code: grpc.status.NOT_FOUND,
                message: 'Car not found',
            });
            return;
        }

        const car = result.rows[0];
        callback(null, {
            success: true,
            message: 'Car updated successfully',
            car: {
                id: car.id,
                make: car.make,
                model: car.model,
                year: car.year,
                color: car.color,
                description: car.description,
                image_url: car.image_url,
                dealer_id: car.dealer_id,
                created_at: car.created_at.toISOString(),
            },
        });
    } catch (error) {
        console.error('Error updating car:', error);
        callback({
            code: grpc.status.INTERNAL,
            message: 'Failed to update car: ' + error.message,
        });
    }
}

async function DeleteCar(call, callback) {
    const { id } = call.request;

    try {
        const result = await pool.query('DELETE FROM cars WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            callback({
                code: grpc.status.NOT_FOUND,
                message: 'Car not found',
            });
            return;
        }

        callback(null, {
            success: true,
            message: 'Car deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting car:', error);
        callback({
            code: grpc.status.INTERNAL,
            message: 'Failed to delete car: ' + error.message,
        });
    }
}

async function GetCars(call, callback) {
    const { dealer_id } = call.request;

    try {
        let query = 'SELECT * FROM cars';
        let params = [];

        if (dealer_id) {
            query += ' WHERE dealer_id = $1';
            params.push(dealer_id);
        }

        query += ' ORDER BY created_at DESC';

        const result = await pool.query(query, params);

        const cars = result.rows.map(car => ({
            id: car.id,
            make: car.make,
            model: car.model,
            year: car.year,
            color: car.color,
            description: car.description,
            image_url: car.image_url,
            dealer_id: car.dealer_id,
            created_at: car.created_at.toISOString(),
        }));

        callback(null, { cars });
    } catch (error) {
        console.error('Error getting cars:', error);
        callback({
            code: grpc.status.INTERNAL,
            message: 'Failed to get cars: ' + error.message,
        });
    }
}

async function GetCar(call, callback) {
    const { id } = call.request;

    try {
        const result = await pool.query('SELECT * FROM cars WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            callback({
                code: grpc.status.NOT_FOUND,
                message: 'Car not found',
            });
            return;
        }

        const car = result.rows[0];
        callback(null, {
            success: true,
            message: 'Car found',
            car: {
                id: car.id,
                make: car.make,
                model: car.model,
                year: car.year,
                color: car.color,
                description: car.description,
                image_url: car.image_url,
                dealer_id: car.dealer_id,
                created_at: car.created_at.toISOString(),
            },
        });
    } catch (error) {
        console.error('Error getting car:', error);
        callback({
            code: grpc.status.INTERNAL,
            message: 'Failed to get car: ' + error.message,
        });
    }
}

async function BlockAvailability(call, callback) {
    const { car_id, start_time, end_time, reason } = call.request;

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

        const result = await pool.query(
            `INSERT INTO blocked_slots (car_id, start_time, end_time, reason) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
            [car_id, start_time, end_time, reason || 'maintenance']
        );

        const slot = result.rows[0];
        callback(null, {
            success: true,
            message: 'Availability blocked successfully',
            blocked_slot: {
                id: slot.id,
                car_id: slot.car_id,
                start_time: slot.start_time.toISOString(),
                end_time: slot.end_time.toISOString(),
                reason: slot.reason,
                created_at: slot.created_at.toISOString(),
            },
        });
    } catch (error) {
        console.error('Error blocking availability:', error);
        callback({
            code: grpc.status.INTERNAL,
            message: 'Failed to block availability: ' + error.message,
        });
    }
}

async function GetBlockedSlots(call, callback) {
    const { car_id } = call.request;

    try {
        const result = await pool.query(
            'SELECT * FROM blocked_slots WHERE car_id = $1 ORDER BY start_time',
            [car_id]
        );

        const blocked_slots = result.rows.map(slot => ({
            id: slot.id,
            car_id: slot.car_id,
            start_time: slot.start_time.toISOString(),
            end_time: slot.end_time.toISOString(),
            reason: slot.reason,
            created_at: slot.created_at.toISOString(),
        }));

        callback(null, { blocked_slots });
    } catch (error) {
        console.error('Error getting blocked slots:', error);
        callback({
            code: grpc.status.INTERNAL,
            message: 'Failed to get blocked slots: ' + error.message,
        });
    }
}

// Start gRPC server
function main() {
    const server = new grpc.Server();

    server.addService(carProto.CarService.service, {
        AddCar,
        UpdateCar,
        DeleteCar,
        GetCars,
        GetCar,
        BlockAvailability,
        GetBlockedSlots,
    });

    const port = process.env.GRPC_PORT || '50051';
    server.bindAsync(
        `0.0.0.0:${port}`,
        grpc.ServerCredentials.createInsecure(),
        (error, port) => {
            if (error) {
                console.error('Failed to start server:', error);
                return;
            }
            console.log(`Car Service running on port ${port}`);
            server.start();
        }
    );
}

main();
