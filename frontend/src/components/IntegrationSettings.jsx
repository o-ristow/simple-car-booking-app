import { useState, useEffect } from 'react';

const API_URL = '/api';
const INTEGRATION_SERVICE_URL = 'http://localhost:5003';

function IntegrationSettings() {
    const [integrations, setIntegrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchIntegrations();
    }, []);

    const fetchIntegrations = async () => {
        try {
            const response = await fetch(`${API_URL}/integrations?dealer_id=dealer1`);
            const data = await response.json();
            setIntegrations(data);
        } catch (error) {
            console.error('Error fetching integrations:', error);
            setMessage({ type: 'error', text: 'Failed to load integrations' });
        } finally {
            setLoading(false);
        }
    };

    const handleConnectGoogleCalendar = async () => {
        try {
            // In a real implementation, this would redirect to OAuth flow
            const response = await fetch(`${INTEGRATION_SERVICE_URL}/external/google-calendar/auth-url`);
            const data = await response.json();

            if (data.authUrl) {
                window.open(data.authUrl, '_blank');
                setMessage({
                    type: 'info',
                    text: 'Please complete the authorization in the new window. Refresh this page after authorization.'
                });
            }
        } catch (error) {
            console.error('Error connecting Google Calendar:', error);
            setMessage({
                type: 'info',
                text: 'Google Calendar integration requires OAuth2 credentials to be configured in the integration service.'
            });
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
                <h1 className="page-title">Integration Settings</h1>
                <p className="page-subtitle">Connect external services and APIs</p>
            </div>

            {message && (
                <div className={`alert alert-${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="card mb-4">
                <h2 className="mb-3">🗓️ Google Calendar</h2>
                <p className="mb-3" style={{ color: 'var(--text-secondary)' }}>
                    Sync your bookings to Google Calendar automatically. Requires OAuth2 authentication.
                </p>

                {integrations.find(i => i.service_name === 'google_calendar') ? (
                    <div>
                        <div className="alert alert-success mb-3">
                            ✓ Google Calendar is connected
                        </div>
                        <button className="btn btn-secondary">
                            Disconnect
                        </button>
                    </div>
                ) : (
                    <button className="btn btn-primary" onClick={handleConnectGoogleCalendar}>
                        Connect Google Calendar
                    </button>
                )}
            </div>

            <div className="card mb-4">
                <h2 className="mb-3">🔌 External API Access</h2>
                <p className="mb-3" style={{ color: 'var(--text-secondary)' }}>
                    Allow third-party applications to access your booking data via REST API.
                </p>

                <div className="alert alert-info mb-3">
                    <strong>API Endpoint:</strong> <code>http://localhost:5003/external</code>
                </div>

                <h3 className="mb-2" style={{ fontSize: '1.125rem' }}>Available Endpoints:</h3>
                <ul style={{ color: 'var(--text-secondary)', paddingLeft: '1.5rem' }}>
                    <li><code>POST /external/bookings</code> - Create booking from external app</li>
                    <li><code>GET /external/bookings/:id</code> - Get booking details</li>
                    <li><code>DELETE /external/bookings/:id</code> - Cancel booking</li>
                    <li><code>GET /external/availability/:carId</code> - Check availability</li>
                    <li><code>POST /external/webhook/register</code> - Register webhook for events</li>
                </ul>

                <div className="mt-3">
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        Note: In production, implement API key authentication for external access.
                    </p>
                </div>
            </div>

            <div className="card">
                <h2 className="mb-3">📊 Integration Status</h2>

                {integrations.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No integrations configured</p>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Service</th>
                                    <th>Status</th>
                                    <th>Connected</th>
                                </tr>
                            </thead>
                            <tbody>
                                {integrations.map((integration) => (
                                    <tr key={integration.id}>
                                        <td>
                                            <strong>{integration.service_name.replace('_', ' ').toUpperCase()}</strong>
                                        </td>
                                        <td>
                                            <span className={`badge ${integration.status === 'active' ? 'badge-success' : 'badge-error'}`}>
                                                {integration.status}
                                            </span>
                                        </td>
                                        <td>{new Date(integration.created_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="card mt-4">
                <h2 className="mb-3">📖 Documentation</h2>
                <p className="mb-2" style={{ color: 'var(--text-secondary)' }}>
                    For detailed API documentation and integration guides, please refer to the API.md file in the project root.
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    The integration service runs on port 5003 and provides both gRPC (internal) and REST (external) interfaces.
                </p>
            </div>
        </div>
    );
}

export default IntegrationSettings;
