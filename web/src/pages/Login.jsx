import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaExclamationTriangle, FaLock, FaUser, FaEye, FaEyeSlash, FaChevronRight, FaTruck, FaChartLine } from 'react-icons/fa';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login gagal. Silakan periksa username & password Anda.');
    } finally { setLoading(false); }
  };

  const fillCredentials = (roleEmail) => {
    setEmail(roleEmail);
    setPassword('password');
  };

  return (
    <div className="modern-login-viewport">
      {/* Background patterns */}
      <div className="bg-grid-overlay"></div>
      <div className="bg-glow-one"></div>
      <div className="bg-glow-two"></div>
      
      {/* Premium Vector Logistics Map Background (Natively Rendered, 100% Crisp) */}
      <div className="logistics-routes-bg">
        <svg width="100%" height="100%" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {/* Background gradient */}
            <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#eff6ff" />
            </linearGradient>

            {/* Soft shadow definition for pins */}
            <filter id="pin-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#0284c7" floodOpacity="0.15" />
            </filter>
            
            {/* Reusable Map Pin Component */}
            <g id="map-pin">
              {/* Pin Base Shadow */}
              <ellipse cx="0" cy="2" rx="7" ry="2.5" fill="rgba(15, 23, 42, 0.15)" />
              {/* Main Pin Shape */}
              <path d="M 0 0 C -14 -22 -18 -38 0 -48 C 18 -38 14 -22 0 0 Z" fill="#0284c7" />
              {/* Outer stroke accent */}
              <path d="M 0 0 C -14 -22 -18 -38 0 -48 C 18 -38 14 -22 0 0 Z" fill="none" stroke="#ffffff" strokeWidth="1.5" />
              {/* Inner White Core Hole */}
              <circle cx="0" cy="-33" r="6" fill="#ffffff" />
            </g>
            
            {/* Secondary Light Blue Pin */}
            <g id="map-pin-secondary">
              <ellipse cx="0" cy="2" rx="5" ry="2" fill="rgba(15, 23, 42, 0.1)" />
              <path d="M 0 0 C -11 -18 -14 -32 0 -40 C 14 -32 11 -18 0 0 Z" fill="#0ea5e9" />
              <path d="M 0 0 C -11 -18 -14 -32 0 -40 C 14 -32 11 -18 0 0 Z" fill="none" stroke="#ffffff" strokeWidth="1" />
              <circle cx="0" cy="-27" r="4.5" fill="#ffffff" />
            </g>
          </defs>

          {/* Background Solid Gradient */}
          <rect width="100%" height="100%" fill="url(#bgGrad)" />

          {/* Winding Blue Logistics Rivers/Highways */}
          <path d="M -100 650 Q 250 550 500 700 T 1000 600 T 1600 750" fill="none" stroke="#e0f2fe" strokeWidth="32" opacity="0.7" />
          <path d="M -100 650 Q 250 550 500 700 T 1000 600 T 1600 750" fill="none" stroke="#0ea5e9" strokeWidth="2.5" opacity="0.16" strokeDasharray="8 6" />

          <path d="M -100 400 Q 400 300 700 500 T 1300 450 T 1600 350" fill="none" stroke="#e0f2fe" strokeWidth="18" opacity="0.4" />
          <path d="M -100 400 Q 400 300 700 500 T 1300 450 T 1600 350" fill="none" stroke="#0ea5e9" strokeWidth="1.5" opacity="0.1" strokeDasharray="6 4" />

          {/* City Road Network Grid */}
          <g opacity="0.75">
            {/* Grid street lines */}
            <path d="M 100 200 L 100 950 M 250 200 L 250 950 M 400 200 L 400 950 M 600 200 L 600 950 M 800 200 L 800 950 M 1000 200 L 1000 950 M 1200 200 L 1200 950 M 1350 200 L 1350 950" fill="none" stroke="#cbd5e1" strokeWidth="1.2" opacity="0.35" />
            <path d="M 0 300 L 1600 300 M 0 450 L 1600 450 M 0 580 L 1600 580 M 0 700 L 1600 700 M 0 800 L 1600 800 M 0 900 L 1600 900" fill="none" stroke="#cbd5e1" strokeWidth="1.2" opacity="0.35" />

            {/* Diagonal secondary streets */}
            <path d="M -100 300 L 1600 850 M -100 850 L 1600 300" fill="none" stroke="#cbd5e1" strokeWidth="1" opacity="0.25" />
            <path d="M 200 200 L 1400 950 M 1200 200 L 0 950" fill="none" stroke="#cbd5e1" strokeWidth="1" opacity="0.2" />
          </g>

          {/* Location Pins styled like custom checkpoints (with soft drop-shadow filters) */}
          {/* Primary Big Pins */}
          <use href="#map-pin" transform="translate(320, 580) scale(1.35)" filter="url(#pin-shadow)" />
          <use href="#map-pin" transform="translate(1080, 680) scale(1.4)" filter="url(#pin-shadow)" />
          <use href="#map-pin" transform="translate(860, 420) scale(1.2)" filter="url(#pin-shadow)" />

          {/* Secondary smaller Pins in background */}
          <use href="#map-pin-secondary" transform="translate(180, 480) scale(0.95)" opacity="0.8" />
          <use href="#map-pin-secondary" transform="translate(740, 540) scale(0.9)" opacity="0.75" />
          <use href="#map-pin-secondary" transform="translate(1250, 460) scale(0.85)" opacity="0.7" />
          <use href="#map-pin-secondary" transform="translate(980, 320) scale(0.8)" opacity="0.6" />
        </svg>
      </div>

      {/* Floating Decorative Badges (Desktop only) */}
      <div className="floating-badge badge-left">
        <span className="badge-icon">
          <FaTruck style={{ color: '#0284c7' }} />
        </span>
        <div className="badge-info">
          <h4>SAP Fleet</h4>
          <p>Real-time Tracked</p>
        </div>
      </div>

      <div className="floating-badge badge-right">
        <span className="badge-icon">
          <FaChartLine style={{ color: '#0ea5e9' }} />
        </span>
        <div className="badge-info">
          <h4>Operations</h4>
          <p>99.8% On-Time</p>
        </div>
      </div>

      <div className="login-card-container">
        {/* Brand Logo Wrapper */}
        <div className="brand-header">
          <img src="/logohalaman.png" alt="PT. SAP Logo" className="brand-logo-img" />
          <h2>Sistem Operasional & Maintenance</h2>
          <p>PT. Sinar Alam Plantations</p>
          <div className="system-status-indicator">
            <span className="status-dot"></span>
            <span>Sistem Online</span>
          </div>
        </div>

        {/* Card Body */}
        <div className="login-card-body">
          {error && (
            <div className="login-alert alert-error">
              <FaExclamationTriangle className="alert-icon" />
              <span>{error}</span>
            </div>
          )}

          <div style={{
            background: 'rgba(2, 132, 199, 0.04)',
            border: '1px solid rgba(2, 132, 199, 0.12)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '20px',
            textAlign: 'center',
            fontSize: '13px',
            fontWeight: 600,
            color: '#0284c7',
            lineHeight: '1.4'
          }}>
            Silakan login menggunakan Username dan Password
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="input-field-wrapper-premium">
              <input 
                type="text" 
                id="username"
                value={username}
                onChange={e => setUsername(e.target.value)} 
                placeholder=" "
                required 
              />
              <label htmlFor="username">Username</label>
              <FaUser className="field-icon-premium" />
            </div>

            <div className="input-field-wrapper-premium">
              <input 
                type={showPassword ? "text" : "password"} 
                id="password"
                value={password}
                onChange={e => setPassword(e.target.value)} 
                placeholder=" "
                required 
              />
              <label htmlFor="password">Kata Sandi</label>
              <FaLock className="field-icon-premium" />
              <button 
                type="button" 
                className="show-password-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <button type="submit" className="login-submit-button" disabled={loading}>
              {loading ? (
                <div className="login-button-spinner"></div>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <FaChevronRight className="arrow-icon" />
                </>
              )}
            </button>
          </form>
        </div>
        
        {/* Footer */}
        <div className="login-card-footer">
          <span>Sistem Informasi Internal PT. Sinar Alam Plantations. Hak Cipta Dilindungi Undang-Undang.</span>
        </div>
      </div>
    </div>
  );
}
