import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Prediction from './pages/Prediction';
import MapPage from './pages/Map';
import Simulation from './pages/Simulation';
import EmergencyPlan from './pages/EmergencyPlan';
import Contacts from './pages/Contacts';
import Settings from './pages/Settings';
import ARView from './pages/ARView';
import SplashScreen from './components/SplashScreen';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/prediction" element={<Prediction />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/simulation" element={<Simulation />} />
          <Route path="/emergency-plan" element={<EmergencyPlan />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/ar-view" element={<ARView />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;