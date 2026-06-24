import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Header({ collapsed, setCollapsed }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || 'U';

  return (
    <div className="header">
      <button className="header-toggle" onClick={() => setCollapsed(!collapsed)} title="Toggle Sidebar">
        ☰
      </button>
      <div className="header-search">
        <span className="search-icon">🔍</span>
        <input type="text" placeholder="Cari kendaraan, driver, order..." />
      </div>
      <div className="header-right">
        <button className="header-notif" title="Notifikasi">
          🔔
          <span className="notif-badge">3</span>
        </button>
        <div className="header-user">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role_display_name}</div>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Keluar</button>
      </div>
    </div>
  );
}
