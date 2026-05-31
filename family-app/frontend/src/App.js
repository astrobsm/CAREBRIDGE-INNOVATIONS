import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Children from './pages/Children';
import ChildProfile from './pages/ChildProfile';
import Tasks from './pages/Tasks';
import Payroll from './pages/Payroll';
import Plans from './pages/Plans';
import Education from './pages/Education';
import Prayer from './pages/Prayer';
import Events from './pages/Events';
import Growth from './pages/Growth';
import Health from './pages/Health';
import Notifications from './pages/Notifications';
import Chores from './pages/Chores';
import Boarding from './pages/Boarding';
import Buckets from './pages/Buckets';
import Performance from './pages/Performance';
import Needs from './pages/Needs';
import FamilyEvents from './pages/FamilyEvents';
import ChoreLibrary from './pages/ChoreLibrary';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="children" element={<Children />} />
          <Route path="children/:id" element={<ChildProfile />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="payroll" element={<Payroll />} />
          <Route path="plans" element={<Plans />} />
          <Route path="education" element={<Education />} />
          <Route path="prayer" element={<Prayer />} />
          <Route path="events" element={<Events />} />
          <Route path="growth" element={<Growth />} />
          <Route path="health" element={<Health />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="chores" element={<Chores />} />
          <Route path="boarding" element={<Boarding />} />
          <Route path="buckets" element={<Buckets />} />
          <Route path="performance" element={<Performance />} />
          <Route path="needs" element={<Needs />} />
          <Route path="family-events" element={<FamilyEvents />} />
          <Route path="chore-library" element={<ChoreLibrary />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
