import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { SessionProvider, RequireSession } from './contexts/SessionContext';
import CloudflareEntry from './pages/CloudflareEntry';
import { ErrorBoundary } from './components/common/ErrorBoundary';
const WorkspaceApp = lazy(() => import('./WorkspaceApp'));
export default function App() {
  return <ErrorBoundary><SessionProvider><Routes>
    <Route path="/" element={<CloudflareEntry />} />
    <Route path="/auth" element={<CloudflareEntry />} />
    <Route path="*" element={<RequireSession><Suspense fallback={<div className="pulse-loading" role="status">Открываем пространство…</div>}><WorkspaceApp /></Suspense></RequireSession>} />
  </Routes></SessionProvider></ErrorBoundary>;
}
