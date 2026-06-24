import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="app-layout">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className={`main-wrapper ${collapsed ? 'collapsed' : ''}`}>
        <Header collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
