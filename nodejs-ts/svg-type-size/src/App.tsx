import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

const BenchmarkPage = lazy(() => import('./pages/BenchmarkPage'));
const BenchmarkReport = lazy(() => import('./pages/BenchmarkReport'));

const App = () => {
  return (
    <Suspense fallback={<div className="page">読み込み中...</div>}>
      <Routes>
        <Route path="/" element={<BenchmarkPage />} />
        <Route path="/benchmark" element={<BenchmarkPage />} />
        <Route path="/report" element={<BenchmarkReport />} />
      </Routes>
    </Suspense>
  );
};

export default App;
