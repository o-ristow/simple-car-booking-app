import { useState, useEffect } from 'react';
import { format } from 'date-fns';

const API_URL = '/api';

function DealerDashboard() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('active');
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchBookings();
    }, [filter]);

    const fetchBookings = async () => {
        try {
            const url = filter ? `${API_URL}/bookings?status=${filter}` : `${API_URL}/bookings`;
            const response = await fetch(url);
            const data = await response.json();
            setBookings(data);
        } catch (error) {
            console.error('Error fetching bookings:', error);
            setMessage({ type: 'error', text: 'Failed to load bookings' });
        } finally {
            setLoading(false);
        }
    };

    const handleCancelBooking = async (id) => {
        if (!confirm('Are you sure you want to cancel this booking?')) return;

        try {
            const response = await fetch(`${API_URL}/bookings/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Booking cancelled successfully' });
                fetchBookings();
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
                <h1 className="page-title">Dealer Dashboard</h1>
                <p className="page-subtitle">Manage all your bookings</p>
            </div>

            {message && (
                <div className={`alert alert-${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="card mb-4">
                <div className="flex items-center justify-between mb-3">
                    <h2>Bookings</h2>
                    <div className="flex gap-2">
                        <button
                            className={`btn btn-sm ${filter === 'active' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setFilter('active')}
                        >
                            Active
                        </button>
                        <button
                            className={`btn btn-sm ${filter === 'cancelled' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setFilter('cancelled')}
                        >
                            Cancelled
                        </button>
                        <button
                            className={`btn btn-sm ${filter === '' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setFilter('')}
                        >
                            All
                        </button>
                    </div>
                </div>

                {bookings.length === 0 ? (
                    <p className="text-center" style={{ color: 'var(--text-muted)', padding: '2rem' }}>
                        No bookings found
                    </p>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Car</th>
                                    <th>Customer</th>
                                    <th>Contact</th>
                                    <th>Pickup</th>
                                    <th>Return</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bookings.map((booking) => (
                                    <tr key={booking.id}>
                                        <td>#{booking.id}</td>
                                        <td>
                                            <strong>{booking.car_make} {booking.car_model}</strong>
                                        </td>
                                        <td>{booking.customer_name}</td>
                                        <td>
                                            <div style={{ fontSize: '0.875rem' }}>
                                                <div>{booking.customer_email}</div>
                                                <div style={{ color: 'var(--text-muted)' }}>{booking.customer_phone}</div>
                                            </div>
                                        </td>
                                        <td>{format(new Date(booking.booking_start), 'PPp')}</td>
                                        <td>{format(new Date(booking.booking_end), 'PPp')}</td>
                                        <td>
                                            <span className={`badge ${booking.status === 'active' ? 'badge-success' : 'badge-error'}`}>
                                                {booking.status}
                                            </span>
                                        </td>
                                        <td>
                                            {booking.status === 'active' && (
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => handleCancelBooking(booking.id)}
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="card">
                <h3 className="mb-2">📊 Statistics</h3>
                <div className="flex gap-4">
                    <div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>
                            {bookings.filter(b => b.status === 'active').length}
                        </div>
                        <div style={{ color: 'var(--text-muted)' }}>Active Bookings</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--error)' }}>
                            {bookings.filter(b => b.status === 'cancelled').length}
                        </div>
                        <div style={{ color: 'var(--text-muted)' }}>Cancelled</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                            {bookings.length}
                        </div>
                        <div style={{ color: 'var(--text-muted)' }}>Total Bookings</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DealerDashboard;
