import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { 
  FaBars, FaSearch, FaBell, FaSignOutAlt, FaCheckDouble, 
  FaInfoCircle, FaExclamationTriangle, FaCheckCircle, FaCalendarAlt 
} from 'react-icons/fa';

const breadcrumbMap = {
  '/': ['Dashboard'],
  '/vehicles/units': ['Kendaraan', 'Unit Kendaraan'],
  '/vehicles/legality': ['Kendaraan', 'Legalitas'],
  '/vehicles/km': ['Kendaraan', 'Monitoring KM'],
  '/hr/drivers': ['SDM / Driver', 'Data Driver'],
  '/hr/legality': ['SDM / Driver', 'Legalitas Driver'],
  '/hr/management': ['SDM / Driver', 'Assignment'],
  '/trips/create-dinas': ['Perjalanan Dinas', 'Create Dinas'],
  '/trips/approval': ['Perjalanan Dinas', 'Approval Dinas'],
  '/trips/monitoring': ['Perjalanan Dinas', 'Monitoring Dinas'],
  '/trips/report': ['Perjalanan Dinas', 'Report Dinas'],
  '/services/work-orders': ['Maintenance', 'WO Service'],
  '/services/routine': ['Maintenance', 'Service Rutin'],
  '/services/history': ['Maintenance', 'History Service'],
  '/reimbursements/monitoring': ['Keuangan', 'Monitoring Reimbursement'],
  '/reimbursements/history': ['Keuangan', 'History Reimbursement'],
  '/settings/organizations': ['Pengaturan', 'Company'],
  '/settings/roles': ['Pengaturan', 'Manajemen Role'],
  '/settings/users/web': ['Pengaturan', 'Pengguna', 'User Web'],
  '/settings/users/mobile': ['Pengaturan', 'Pengguna', 'User Mobile']
};

export default function Header({ collapsed, setCollapsed }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => { logout(); navigate('/login'); };
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || 'U';

  const breadcrumbs = breadcrumbMap[location.pathname] || [];

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data && res.data.success) {
        setNotifications(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Click outside dropdown handler
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif) => {
    try {
      await api.put(`/notifications/${notif.id}/read`);
      // Update local list state
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: 1 } : n));
      
      // Navigate to correct page
      if (notif.module === 'trips') {
        navigate('/trips/monitoring');
      } else if (notif.module === 'services') {
        navigate('/services/work-orders');
      } else if (notif.module === 'hr') {
        navigate('/hr/legality');
      } else if (notif.module === 'vehicles') {
        navigate('/vehicles/legality');
      }
      setShowDropdown(false);
    } catch (err) {
      console.error('Error marking read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const unreadCount = notifications.filter(n => n.is_read === 0).length;

  const getNotifIcon = (type) => {
    switch (type) {
      case 'danger':
        return <FaExclamationTriangle style={{ color: 'var(--danger)' }} />;
      case 'warning':
        return <FaExclamationTriangle style={{ color: 'var(--warning)' }} />;
      case 'success':
        return <FaCheckCircle style={{ color: 'var(--success)' }} />;
      default:
        return <FaInfoCircle style={{ color: 'var(--accent)' }} />;
    }
  };

  return (
    <div className="header">
      <button className="header-toggle" onClick={() => setCollapsed(!collapsed)} title="Toggle Sidebar">
        <FaBars size={16} />
      </button>
      
      <div className="header-breadcrumb">
        <span className="bc-app">PT. Sinar Alam Plantations</span>
        {breadcrumbs.map((bc, idx) => (
          <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="bc-sep">/</span>
            <span>{bc}</span>
          </span>
        ))}
      </div>

      <div className="header-right">
        {/* Notifications Icon and Dropdown */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button 
            className="header-notif" 
            title="Notifikasi"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <FaBell size={16} />
            {unreadCount > 0 && (
              <span className="notif-badge">{unreadCount}</span>
            )}
          </button>

          {showDropdown && (
            <div style={{
              position: 'absolute',
              top: '40px',
              right: 0,
              width: '340px',
              background: '#ffffff',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              zIndex: 9999,
              overflow: 'hidden'
            }}>
              {/* Dropdown Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-color)',
                background: '#f8fafc'
              }}>
                <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>Notifikasi</span>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <FaCheckDouble size={10} /> Tandai semua dibaca
                  </button>
                )}
              </div>

              {/* Notifications List */}
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    Tidak ada notifikasi baru
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        background: n.is_read === 0 ? 'rgba(59,130,246,0.04)' : '#ffffff',
                        display: 'flex',
                        gap: '12px',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = n.is_read === 0 ? 'rgba(59,130,246,0.04)' : '#ffffff'}
                    >
                      <div style={{ marginTop: '3px', fontSize: '16px' }}>
                        {getNotifIcon(n.type)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          fontWeight: n.is_read === 0 ? 700 : 500, 
                          fontSize: '13px', 
                          color: 'var(--text-primary)' 
                        }}>
                          {n.title}
                        </div>
                        <div style={{ 
                          fontSize: '11.5px', 
                          color: 'var(--text-secondary)',
                          marginTop: '2px',
                          lineHeight: '1.4'
                        }}>
                          {n.message}
                        </div>
                        <div style={{ 
                          fontSize: '10px', 
                          color: 'var(--text-muted)',
                          marginTop: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <FaCalendarAlt size={9} />
                          {new Date(n.created_at).toLocaleString('id-ID', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="header-user">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role_display_name}</div>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handleLogout} style={{ display:'flex', alignItems:'center', gap:6 }}>
          <FaSignOutAlt size={13} /> Keluar
        </button>
      </div>
    </div>
  );
}

