import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('admin@sap.co.id');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login gagal');
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-icon">🚛</div>
          <h1>Fleet Management</h1>
          <p>Sistem Order Kendaraan & Maintenance</p>
        </div>

        {error && <div className="alert alert-danger">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="email@perusahaan.com" required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button className="btn btn-primary login-btn" type="submit" disabled={loading}>
            {loading ? '⏳ Masuk...' : '🔐 Masuk'}
          </button>
        </form>

        <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-glass)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)' }}>
          <strong>Demo Akun:</strong><br />
          Admin: admin@sap.co.id<br />
          HRGA: hrga@sap.co.id<br />
          Gudang: gudang@sap.co.id<br />
          Password: <em>password</em>
        </div>
      </div>
    </div>
  );
}
