import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const API_URL = '/api';

function CarManagement() {
    const [cars, setCars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showBlockModal, setShowBlockModal] = useState(false);
    const [selectedCar, setSelectedCar] = useState(null);
    const [editingCar, setEditingCar] = useState(null);

    // Form states
    const [formData, setFormData] = useState({
        make: '',
        model: '',
        year: new Date().getFullYear(),
        color: '',
        description: '',
    });
    const [imageFile, setImageFile] = useState(null);

    // Block availability states
    const [blockStart, setBlockStart] = useState(new Date());
    const [blockEnd, setBlockEnd] = useState(new Date());
    const [blockReason, setBlockReason] = useState('maintenance');

    useEffect(() => {
        fetchCars();
    }, []);

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

    const handleSubmit = async (e) => {
        e.preventDefault();

        const formDataToSend = new FormData();
        formDataToSend.append('make', formData.make);
        formDataToSend.append('model', formData.model);
        formDataToSend.append('year', formData.year);
        formDataToSend.append('color', formData.color);
        formDataToSend.append('description', formData.description);
        formDataToSend.append('dealer_id', 'dealer1');

        if (imageFile) {
            formDataToSend.append('image', imageFile);
        }

        try {
            const url = editingCar ? `${API_URL}/cars/${editingCar.id}` : `${API_URL}/cars`;
            const method = editingCar ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                body: formDataToSend,
            });

            if (response.ok) {
                setMessage({ type: 'success', text: `Car ${editingCar ? 'updated' : 'added'} successfully` });
                setShowAddModal(false);
                setEditingCar(null);
                setFormData({ make: '', model: '', year: new Date().getFullYear(), color: '', description: '' });
                setImageFile(null);
                fetchCars();
            } else {
                const data = await response.json();
                setMessage({ type: 'error', text: data.error || 'Operation failed' });
            }
        } catch (error) {
            console.error('Error saving car:', error);
            setMessage({ type: 'error', text: 'Failed to save car' });
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this car?')) return;

        try {
            const response = await fetch(`${API_URL}/cars/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Car deleted successfully' });
                fetchCars();
            } else {
                setMessage({ type: 'error', text: 'Failed to delete car' });
            }
        } catch (error) {
            console.error('Error deleting car:', error);
            setMessage({ type: 'error', text: 'Failed to delete car' });
        }
    };

    const handleBlockAvailability = async (e) => {
        e.preventDefault();

        try {
            const response = await fetch(`${API_URL}/cars/${selectedCar.id}/block`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    start_time: blockStart.toISOString(),
                    end_time: blockEnd.toISOString(),
                    reason: blockReason,
                }),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Availability blocked successfully' });
                setShowBlockModal(false);
                setSelectedCar(null);
            } else {
                setMessage({ type: 'error', text: 'Failed to block availability' });
            }
        } catch (error) {
            console.error('Error blocking availability:', error);
            setMessage({ type: 'error', text: 'Failed to block availability' });
        }
    };

    const openEditModal = (car) => {
        setEditingCar(car);
        setFormData({
            make: car.make,
            model: car.model,
            year: car.year,
            color: car.color,
            description: car.description || '',
        });
        setShowAddModal(true);
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
                <h1 className="page-title">Car Management</h1>
                <p className="page-subtitle">Manage your vehicle inventory</p>
            </div>

            {message && (
                <div className={`alert alert-${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="mb-4">
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                    + Add New Car
                </button>
            </div>

            <div className="card-grid">
                {cars.map((car) => (
                    <div key={car.id} className="car-card">
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
                            <div className="flex gap-2 mt-3">
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => openEditModal(car)}
                                >
                                    Edit
                                </button>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => {
                                        setSelectedCar(car);
                                        setShowBlockModal(true);
                                    }}
                                >
                                    Block Time
                                </button>
                                <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => handleDelete(car.id)}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add/Edit Car Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editingCar ? 'Edit Car' : 'Add New Car'}</h2>
                            <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Make</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.make}
                                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Model</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.model}
                                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Year</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.year}
                                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Color</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea
                                    className="form-textarea"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Image</label>
                                <input
                                    type="file"
                                    className="form-input"
                                    accept="image/*"
                                    onChange={(e) => setImageFile(e.target.files[0])}
                                />
                            </div>
                            <button type="submit" className="btn btn-primary w-full">
                                {editingCar ? 'Update Car' : 'Add Car'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Block Availability Modal */}
            {showBlockModal && selectedCar && (
                <div className="modal-overlay" onClick={() => setShowBlockModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Block Availability</h2>
                            <button className="modal-close" onClick={() => setShowBlockModal(false)}>×</button>
                        </div>
                        <p className="mb-3">
                            Block time for: <strong>{selectedCar.make} {selectedCar.model}</strong>
                        </p>
                        <form onSubmit={handleBlockAvailability}>
                            <div className="form-group">
                                <label className="form-label">Start Time</label>
                                <DatePicker
                                    selected={blockStart}
                                    onChange={(date) => setBlockStart(date)}
                                    showTimeSelect
                                    dateFormat="Pp"
                                    className="form-input"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">End Time</label>
                                <DatePicker
                                    selected={blockEnd}
                                    onChange={(date) => setBlockEnd(date)}
                                    showTimeSelect
                                    dateFormat="Pp"
                                    minDate={blockStart}
                                    className="form-input"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Reason</label>
                                <select
                                    className="form-select"
                                    value={blockReason}
                                    onChange={(e) => setBlockReason(e.target.value)}
                                >
                                    <option value="maintenance">Maintenance</option>
                                    <option value="repair">Repair</option>
                                    <option value="unavailable">Unavailable</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <button type="submit" className="btn btn-primary w-full">
                                Block Availability
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CarManagement;
