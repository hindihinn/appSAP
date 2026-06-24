import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

/* ── SVG Icon Components ── */
const Icon = ({ d, size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);

const icons = {
  dashboard: <Icon d={<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>} />,
  truck: <Icon d={<><path d="M1 3h15v13H1z" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></>} />,
  vehicleList: <Icon d={<><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></>} />,
  shield: <Icon d={<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></>} />,
  gauge: <Icon d={<><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="M12 6v6l4 2" /></>} />,
  users: <Icon d={<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></>} />,
  userCard: <Icon d={<><rect x="2" y="3" width="20" height="18" rx="2" /><circle cx="12" cy="10" r="3" /><path d="M7 21v-1a5 5 0 0110 0v1" /></>} />,
  award: <Icon d={<><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" /></>} />,
  userCheck: <Icon d={<><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" /></>} />,
  clipboard: <Icon d={<><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /></>} />,
  mapPin: <Icon d={<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></>} />,
  fileText: <Icon d={<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>} />,
  clock: <Icon d={<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>} />,
  wrench: <Icon d={<><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" /></>} />,
  tool: <Icon d={<><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" /></>} />,
  calendar: <Icon d={<><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>} />,
  settings2: <Icon d={<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></>} />,
  dollar: <Icon d={<><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></>} />,
  receipt: <Icon d={<><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" /><path d="M8 10h8" /><path d="M8 14h4" /></>} />,
  building: <Icon d={<><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /><path d="M9 9h1" /><path d="M9 13h1" /><path d="M9 17h1" /></>} />,
  shieldLock: <Icon d={<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><rect x="9" y="9" width="6" height="5" rx="1" /><path d="M10 9V7a2 2 0 114 0v2" /></>} />,
  userCog: <Icon d={<><circle cx="12" cy="7" r="4" /><path d="M3.5 21a8.5 8.5 0 0117 0" /><circle cx="19" cy="19" r="2" /><path d="M19 15v1" /><path d="M19 21v1" /><path d="M15.5 17.5l.7.7" /><path d="M21.8 20.8l.7.7" /><path d="M15.5 20.5l.7-.7" /><path d="M21.8 17.2l.7-.7" /></>} />,
  listChecks: <Icon d={<><path d="M10 6h11" /><path d="M10 12h11" /><path d="M10 18h11" /><polyline points="3 6 4 7 6 5" /><polyline points="3 12 4 13 6 11" /><polyline points="3 18 4 19 6 17" /></>} />,
  activity: <Icon d={<><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></>} />,
  barChart: <Icon d={<><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></>} />,
  dot: <Icon d={<><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" /></>} size={8} />,
  filePlus: <Icon d={<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" /></>} />,
  checkSquare: <Icon d={<><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></>} />,
};

const menuItems = [
  {
    label: 'MAIN',
    items: [{ icon: 'dashboard', text: 'Dashboard', path: '/' }]
  },
  {
    label: 'KENDARAAN',
    items: [
      {
        icon: 'truck', text: 'Kendaraan', path: '/vehicles',
        sub: [
          { icon: 'vehicleList', text: 'Unit Kendaraan', path: '/vehicles/units' },
          { icon: 'shield', text: 'Legalitas', path: '/vehicles/legality' },
          { icon: 'gauge', text: 'Monitoring KM', path: '/vehicles/km' },
        ]
      }
    ]
  },
  {
    label: 'SDM',
    items: [
      {
        icon: 'users', text: 'SDM / Driver', path: '/hr',
        sub: [
          { icon: 'userCard', text: 'Data Driver', path: '/hr/drivers' },
          { icon: 'award', text: 'Legalitas Driver', path: '/hr/legality' },
          { icon: 'userCheck', text: 'Assignment', path: '/hr/management' },
        ]
      }
    ]
  },
  {
    label: 'PERJALANAN DINAS',
    items: [
      {
        icon: 'clipboard', text: 'Manajemen Dinas', path: '/trips',
        sub: [
          { icon: 'mapPin', text: 'Monitoring Dinas', path: '/trips/monitoring' },
          { icon: 'filePlus', text: 'Create Dinas', path: '/trips/create-dinas' },
          { icon: 'checkSquare', text: 'Approval Dinas', path: '/trips/approval' },
          { icon: 'fileText', text: 'Report Dinas', path: '/trips/report' },
        ]
      }
    ]
  },
  {
    label: 'MAINTENANCE',
    items: [
      {
        icon: 'wrench', text: 'Service', path: '/services',
        sub: [
          { icon: 'tool', text: 'WO Service', path: '/services/work-orders' },
          { icon: 'calendar', text: 'Service Rutin', path: '/services/routine' },
          { icon: 'settings2', text: 'Manajemen', path: '/services/management' },
          { icon: 'clock', text: 'History Service', path: '/services/history' },
        ]
      }
    ]
  },
  {
    label: 'KEUANGAN',
    items: [
      {
        icon: 'dollar', text: 'Reimbursement', path: '/reimbursements',
        sub: [
          { icon: 'receipt', text: 'Monitoring', path: '/reimbursements/monitoring' },
          { icon: 'barChart', text: 'History', path: '/reimbursements/history' },
        ]
      }
    ]
  },
  {
    label: 'PENGATURAN',
    items: [
      { icon: 'building', text: 'Organisasi', path: '/settings/organizations' },
      { icon: 'shieldLock', text: 'Manajemen Role', path: '/settings/roles' },
      { 
        icon: 'userCog', text: 'Pengguna', path: '/settings/users',
        sub: [
          { icon: 'users', text: 'User Web', path: '/settings/users/web' },
          { icon: 'userCard', text: 'User Mobile', path: '/settings/users/mobile' }
        ]
      },
    ]
  }
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState({
    '/vehicles': true, '/hr': true, '/trips': true,
    '/services': false, '/reimbursements': false,
    '/settings/users': false
  });

  const toggleMenu = (path) => setOpenMenus(prev => ({ ...prev, [path]: !prev[path] }));
  const isParentActive = (sub) => sub?.some(s => location.pathname === s.path);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon-wrap">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="url(#logoGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <defs><linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#06b6d4" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient></defs>
            <path d="M1 3h15v13H1z" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
        </div>
        {!collapsed && (
          <div className="logo-text-wrap">
            <div className="logo-text">PT<span>.SAP</span></div>
            <div className="logo-sub">Management System</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {menuItems.map((group) => (
          <div key={group.label} className="menu-group">
            {!collapsed && <div className="menu-label">{group.label}</div>}
            {group.items.map((item) => (
              <div key={item.path}>
                {item.sub ? (
                  <>
                    <div
                      className={`menu-item ${isParentActive(item.sub) ? 'active' : ''}`}
                      onClick={() => toggleMenu(item.path)}
                    >
                      <span className="menu-icon">{icons[item.icon]}</span>
                      {!collapsed && <>
                        <span className="menu-text">{item.text}</span>
                        <span className={`menu-arrow ${openMenus[item.path] ? 'open' : ''}`}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                        </span>
                      </>}
                    </div>
                    {openMenus[item.path] && !collapsed && (
                      <div className="submenu">
                        {item.sub.map(s => (
                          <NavLink key={s.path} to={s.path} className={({ isActive }) => `submenu-item ${isActive ? 'active' : ''}`}>
                            <span className="submenu-icon">{icons[s.icon]}</span>
                            <span className="submenu-text">{s.text}</span>
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <NavLink to={item.path} end className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
                    <span className="menu-icon">{icons[item.icon]}</span>
                    {!collapsed && <span className="menu-text">{item.text}</span>}
                  </NavLink>
                )}
              </div>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="sidebar-footer">
          <div className="sidebar-version">v1.0.0 </div>
        </div>
      )}
    </aside>
  );
}
