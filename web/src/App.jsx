import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import VehicleList from './pages/vehicles/VehicleList';
import VehicleLegality from './pages/vehicles/VehicleLegality';
import VehicleKm from './pages/vehicles/VehicleKm';
import DriverList from './pages/hr/DriverList';
import DriverLegality from './pages/hr/DriverLegality';
import DriverManagement from './pages/hr/DriverManagement';
import TripMonitoring from './pages/trips/TripMonitoring';
import TripReport from './pages/trips/TripReport';
import CreateDinas from './pages/trips/CreateDinas';
import ApprovalDinas from './pages/trips/ApprovalDinas';
import WorkOrder from './pages/services/WorkOrder';
import RoutineService from './pages/services/RoutineService';
import ServiceManagement from './pages/services/ServiceManagement';
import ServiceHistory from './pages/services/ServiceHistory';
import ReimburseMonitoring from './pages/reimbursement/ReimburseMonitoring';
import ReimburseHistory from './pages/reimbursement/ReimburseHistory';
import Organizations from './pages/settings/Organizations';
import Roles from './pages/settings/Roles';
import UserWeb from './pages/settings/UserWeb';
import UserMobile from './pages/settings/UserMobile';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="vehicles/units" element={<VehicleList />} />
        <Route path="vehicles/legality" element={<VehicleLegality />} />
        <Route path="vehicles/km" element={<VehicleKm />} />
        <Route path="hr/drivers" element={<DriverList />} />
        <Route path="hr/legality" element={<DriverLegality />} />
        <Route path="hr/management" element={<DriverManagement />} />
        <Route path="trips/create-dinas" element={<CreateDinas />} />
        <Route path="trips/approval" element={<ApprovalDinas />} />
        <Route path="trips/monitoring" element={<TripMonitoring />} />
        <Route path="trips/report" element={<TripReport />} />
        <Route path="services/work-orders" element={<WorkOrder />} />
        <Route path="services/routine" element={<RoutineService />} />
        <Route path="services/management" element={<ServiceManagement />} />
        <Route path="services/history" element={<ServiceHistory />} />
        <Route path="reimbursements/monitoring" element={<ReimburseMonitoring />} />
        <Route path="reimbursements/history" element={<ReimburseHistory />} />
        <Route path="settings/organizations" element={<Organizations />} />
        <Route path="settings/roles" element={<Roles />} />
        <Route path="settings/users/web" element={<UserWeb />} />
        <Route path="settings/users/mobile" element={<UserMobile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
