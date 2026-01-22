import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import BookingPage from './components/BookingPage';
import DealerDashboard from './components/DealerDashboard';
import CarManagement from './components/CarManagement';
import IntegrationSettings from './components/IntegrationSettings';

function Navigation() {
    const location = useLocation();

    return (
        <nav className="nav">
            <div className="nav-container">
                <div className="nav-brand">🚗 CarBook</div>
                <ul className="nav-links">
                    <li>
                        <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
                            Book a Car
                        </Link>
                    </li>
                    <li>
                        <Link to="/dealer" className={`nav-link ${location.pathname === '/dealer' ? 'active' : ''}`}>
                            Dealer Dashboard
                        </Link>
                    </li>
                    <li>
                        <Link to="/cars" className={`nav-link ${location.pathname === '/cars' ? 'active' : ''}`}>
                            Manage Cars
                        </Link>
                    </li>
                    <li>
                        <Link to="/integrations" className={`nav-link ${location.pathname === '/integrations' ? 'active' : ''}`}>
                            Integrations
                        </Link>
                    </li>
                </ul>
            </div>
        </nav>
    );
}

function App() {
    return (
        <Router>
            <div className="app">
                <Navigation />
                <Routes>
                    <Route path="/" element={<BookingPage />} />
                    <Route path="/dealer" element={<DealerDashboard />} />
                    <Route path="/cars" element={<CarManagement />} />
                    <Route path="/integrations" element={<IntegrationSettings />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
