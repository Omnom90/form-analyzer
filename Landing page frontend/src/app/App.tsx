import { BrowserRouter, Routes, Route } from 'react-router';
import HomePage from './pages/HomePage';
import WorkoutPage from './pages/WorkoutPage';
import NextStepsPage from './pages/NextStepsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/workout" element={<WorkoutPage />} />
        <Route path="/next-steps" element={<NextStepsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
