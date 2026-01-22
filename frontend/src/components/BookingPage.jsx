import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { addHours, addDays } from 'date-fns';

const API_URL = '/api';

function BookingPage() {
    const [cars, setCars] = useState([]);
    const [selectedCar, setSelectedCar] = useState(null);
    const [startDate, setStartDate] = useState(addHours(new Date(), 1));
    const [endDate, setEndDate] = useState(addDays(addHours(new Date(), 1), 1));
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [loading, setLoading] = useState(true);
    const [booking, setBooking] = useState(false);
    const [message, setMessage] = useState(null);
    const [availability, setAvailability] = useState(null);
    const [confirmedBooking, setConfirmedBooking] = useState(null);

    useEffect(() => {
        fetchCars();
    }, []);

    useEffect(() => {
        if (selectedCar && startDate && endDate) {
            checkAvailability();
        }
    }, [selectedCar, startDate, endDate]);

    const fetchCars = async () => {
        try {
            const response = await fetch(`${API_URL}/cars`);
            const data = await response.json();
            setCars(data);
        } catch (error) {
            console.error('Error fetching cars:', error);
            setMessage({ type: 'error', text: 'Failed to load cars' });
        } finally {
            setLoading(false);
        }
    };

    const checkAvailability = async () => {
        try {
            const response = await fetch(
                `${API_URL}/availability/${selectedCar.id}?start_time=${startDate.toISOString()}&end_time=${endDate.toISOString()}`
            );
            const data = await response.json();
            setAvailability(data);
        } catch (error) {
            console.error('Error checking availability:', error);
        }
    };

    const handleBooking = async (e) => {
        e.preventDefault();

        if (!selectedCar) {
            setMessage({ type: 'error', text: 'Please select a car' });
            return;
        }

        if (!availability?.available) {
            setMessage({ type: 'error', text: 'This car is not available for the selected time' });
            return;
        }

        setBooking(true);
        setMessage(null);

        try {
            const response = await fetch(`${API_URL}/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    car_id: selectedCar.id,
                    customer_name: customerName,
                    customer_email: customerEmail,
                    customer_phone: customerPhone,
                    booking_start: startDate.toISOString(),
                    booking_end: endDate.toISOString(),
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setConfirmedBooking(data);
                setMessage({ type: 'success', text: 'Booking confirmed!' });
                // Reset form
                setCustomerName('');
                setCustomerEmail('');
                setCustomerPhone('');
                setSelectedCar(null);
            } else {
                setMessage({ type: 'error', text: data.error || 'Booking failed' });
            }
        } catch (error) {
            console.error('Error creating booking:', error);
            setMessage({ type: 'error', text: 'Failed to create booking' });
        } finally {
            setBooking(false);
        }
    };

    const handleCancelBooking = async (bookingId, token) => {
        if (!confirm('Are you sure you want to cancel this booking?')) return;

        try {
            const response = await fetch(`${API_URL}/bookings/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: bookingId, cancellation_token: token }),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Booking cancelled successfully' });
                setConfirmedBooking(null);
            } else {
                setMessage({ type: 'error', text: 'Failed to cancel booking' });
            }
        } catch (error) {
            console.error('Error cancelling booking:', error);
            setMessage({ type: 'error', text: 'Failed to cancel booking' });
        }
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="page-header">
                <h1 className="page-title">Book Your Dream Car</h1>
                <p className="page-subtitle">Choose from our premium selection of vehicles</p>
            </div>

            {message && (
                <div className={`alert alert-${message.type}`}>
                    {message.text}
                </div>
            )}

            {confirmedBooking && (
                <div className="card mb-4">
                    <h2 className="mb-2">🎉 Booking Confirmed!</h2>
                    <p className="mb-2">
                        <strong>Car:</strong> {confirmedBooking.car_make} {confirmedBooking.car_model}
                    </p>
                    <p className="mb-2">
                        <strong>From:</strong> {new Date(confirmedBooking.booking_start).toLocaleString()}
                    </p>
                    <p className="mb-2">
                        <strong>To:</strong> {new Date(confirmedBooking.booking_end).toLocaleString()}
                    </p>
                    <p className="mb-3">
                        <strong>Cancellation Token:</strong> <code>{confirmedBooking.cancellation_token}</code>
                    </p>
                    <p className="text-muted mb-3" style={{ fontSize: '0.875rem' }}>
                        Save this token to cancel your booking later.
                    </p>
                    <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleCancelBooking(confirmedBooking.id, confirmedBooking.cancellation_token)}
                    >
                        Cancel Booking
                    </button>
                </div>
            )}

            <div className="card-grid">
                {cars.map((car) => (
                    <div
                        key={car.id}
                        className={`car-card ${selectedCar?.id === car.id ? 'selected' : ''}`}
                        onClick={() => setSelectedCar(car)}
                        style={{
                            border: selectedCar?.id === car.id ? '2px solid var(--primary)' : undefined,
                        }}
                    >
                        <img
                            src={car.image_url || 'https://via.placeholder.com/400x220?text=Car+Image'}
                            alt={`${car.make} ${car.model}`}
                            className="car-image"
                        />
                        <div className="car-content">
                            <h3 className="car-title">{car.make} {car.model}</h3>
                            <div className="car-details">
                                <span className="car-detail">📅 {car.year}</span>
                                <span className="car-detail">🎨 {car.color}</span>
                            </div>
                            {car.description && (
                                <p className="car-description">{car.description}</p>
                            )}
                            {selectedCar?.id === car.id && (
                                <div className="mt-2">
                                    <span className="badge badge-success">Selected</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {selectedCar && (
                <div className="card mt-4">
                    <h2 className="mb-3">Complete Your Booking</h2>

                    <form onSubmit={handleBooking}>
                        <div className="form-group">
                            <label className="form-label">Selected Car</label>
                            <div className="card" style={{ padding: '1rem' }}>
                                <strong>{selectedCar.make} {selectedCar.model}</strong> ({selectedCar.year})
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Pickup Date & Time</label>
                            <DatePicker
                                selected={startDate}
                                onChange={(date) => setStartDate(date)}
                                showTimeSelect
                                dateFormat="Pp"
                                minDate={new Date()}
                                className="form-input"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Return Date & Time</label>
                            <DatePicker
                                selected={endDate}
                                onChange={(date) => setEndDate(date)}
                                showTimeSelect
                                dateFormat="Pp"
                                minDate={startDate}
                                className="form-input"
                                required
                            />
                        </div>

                        {availability && (
                            <div className={`alert ${availability.available ? 'alert-success' : 'alert-error'} mb-3`}>
                                {availability.message}
                                {availability.conflicts && availability.conflicts.length > 0 && (
                                    <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                                        {availability.conflicts.map((conflict, idx) => (
                                            <li key={idx}>
                                                {conflict.type === 'booking' ? '📅' : '🔧'} {conflict.reason}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Your Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input
                                type="email"
                                className="form-input"
                                value={customerEmail}
                                onChange={(e) => setCustomerEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Phone Number</label>
                            <input
                                type="tel"
                                className="form-input"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg w-full"
                            disabled={booking || !availability?.available}
                        >
                            {booking ? 'Processing...' : 'Confirm Booking'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

export default BookingPage;
