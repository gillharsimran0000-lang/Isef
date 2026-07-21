import { Navigate, Route, Routes } from 'react-router-dom';
import Landing from '@/pages/Landing';
import Dashboard from '@/pages/Dashboard';
import Reactor from '@/pages/Reactor';
import Predictions from '@/pages/Predictions';
import Timeline from '@/pages/Timeline';
import Science from '@/pages/Science';
import NotFound from '@/pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/reactor" element={<Reactor />} />
      <Route path="/predictions" element={<Predictions />} />
      <Route path="/timeline" element={<Timeline />} />
      <Route path="/science" element={<Science />} />
      <Route path="*" element={<NotFound />} />
      <Route path="/welcome" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
