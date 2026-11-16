import { useEffect, useState } from 'react';
import LandingPage from './pages/LandingPage';
import CameraPage from './pages/CameraPage';
import ResultPage from './pages/ResultPage';

export default function App() {
  const [view, setView] = useState('landing'); // 'landing' | 'camera' | 'result'
  const [scanResult, setScanResult] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
      : false
  );

  useEffect(() => {
    function handleBeforeInstallPrompt(e) {
      e.preventDefault();
      setInstallPrompt(e);
    }

    function handleAppInstalled() {
      setInstallPrompt(null);
      setIsInstalled(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  async function handleInstallApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  }

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

  return (
    <LandingPage
      onOpenCamera={handleOpenCamera}
      canInstall={Boolean(installPrompt) && !isInstalled}
      onInstallApp={handleInstallApp}
    />
  );
}
