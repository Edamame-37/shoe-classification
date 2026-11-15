import { useState } from 'react';
import LandingPage from './pages/LandingPage';
import CameraPage from './pages/CameraPage';
import ResultPage from './pages/ResultPage';

export default function App() {
  const [view, setView] = useState('landing'); // 'landing' | 'camera' | 'result'
  const [scanResult, setScanResult] = useState(null);

  function handleOpenCamera() {
    setView('camera');
  }

  function handleBackToLanding() {
    setView('landing');
  }

  function handleClassificationResult(result) {
    setScanResult(result);
    setView('result');
  }

  function handleRescan() {
    setScanResult(null);
    setView('camera');
  }

  if (view === 'camera') {
    return <CameraPage onBack={handleBackToLanding} onResult={handleClassificationResult} />;
  }

  if (view === 'result' && scanResult) {
    return <ResultPage result={scanResult} onRescan={handleRescan} />;
  }

  return <LandingPage onOpenCamera={handleOpenCamera} />;
}
