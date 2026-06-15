import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import CreatePollPage from './pages/CreatePollPage';
import PollPage from './pages/PollPage';
import MyPollsPage from './pages/MyPollsPage';
import ResultsPage from './pages/ResultsPage';
import { getFingerprint } from './utils';

export default function App() {
  useEffect(() => {
    getFingerprint().catch(console.error);
  }, []);

  return (
    <div className="app">
      <nav className="nav">
        <NavLink to="/" end>
          创建投票
        </NavLink>
        <NavLink to="/my-polls">我的投票</NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<CreatePollPage />} />
        <Route path="/poll/:id" element={<PollPage />} />
        <Route path="/poll/:id/results" element={<ResultsPage />} />
        <Route path="/my-polls" element={<MyPollsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
