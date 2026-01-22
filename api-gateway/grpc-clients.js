const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Load proto files
const CAR_PROTO_PATH = path.join(__dirname, '../proto/car.proto');
const BOOKING_PROTO_PATH = path.join(__dirname, '../proto/booking.proto');
const INTEGRATION_PROTO_PATH = path.join(__dirname, '../proto/integration.proto');

const protoOptions = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
};

// Load package definitions
const carPackageDef = protoLoader.loadSync(CAR_PROTO_PATH, protoOptions);
const bookingPackageDef = protoLoader.loadSync(BOOKING_PROTO_PATH, protoOptions);
const integrationPackageDef = protoLoader.loadSync(INTEGRATION_PROTO_PATH, protoOptions);

// Load proto definitions
const carProto = grpc.loadPackageDefinition(carPackageDef).car;
const bookingProto = grpc.loadPackageDefinition(bookingPackageDef).booking;
const integrationProto = grpc.loadPackageDefinition(integrationPackageDef).integration;

// Create gRPC clients
const carServiceHost = process.env.CAR_SERVICE_HOST || 'car-service:50051';
const bookingServiceHost = process.env.BOOKING_SERVICE_HOST || 'booking-service:50052';
const integrationServiceHost = process.env.INTEGRATION_SERVICE_HOST || 'integration-service:50053';

const carClient = new carProto.CarService(
    carServiceHost,
    grpc.credentials.createInsecure()
);

const bookingClient = new bookingProto.BookingService(
    bookingServiceHost,
    grpc.credentials.createInsecure()
);

const integrationClient = new integrationProto.IntegrationService(
    integrationServiceHost,
    grpc.credentials.createInsecure()
);

module.exports = {
    carClient,
    bookingClient,
    integrationClient,
};
