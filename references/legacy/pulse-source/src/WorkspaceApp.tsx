import { lazy, Suspense } from 'react';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
const MainLayout = lazy(() => import('./layout/MainLayout'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MainGallery = lazy(() => import('./pages/MainGallery'));
const Studio = lazy(() => import('./pages/Studio'));
const SwarmChat = lazy(() => import('./pages/SwarmChat'));
const QuantumMind = lazy(() => import('./pages/QuantumMind'));
const DNASequencer = lazy(() => import('./pages/DNASequencer'));
const RealityEngine = lazy(() => import('./pages/RealityEngine'));
const SystemBook = lazy(() => import('./pages/SystemBook'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const HistoryPage = lazy(() => import('./pages/History'));
const InfrastructureHub = lazy(() => import('./pages/InfrastructureHub'));
import { LanguageProvider } from './contexts/LanguageContext';
import { ModelsProvider } from './contexts/ModelsContext';
import { SystemStateProvider, useSystemState } from './contexts/SystemStateContext';
import { AudioProvider } from './contexts/AudioContext';
import { KnowledgeHubProvider } from './contexts/KnowledgeHubContext';
import { GlobalMotionProvider } from './contexts/GlobalMotionContext';
import { Toaster as SonnerToaster } from 'sonner';
import { Toaster as HotToaster } from 'react-hot-toast';
import ShortcutOverlay from './components/common/ShortcutOverlay';
import { WebContainerProvider } from './contexts/WebContainerContext';
import { StudioAIContextProvider } from './contexts/StudioAIContext';
import { UserProvider } from './contexts/UserContext';
import { HistoryProvider } from './contexts/HistoryContext';
import { PulseProvider } from './lib/PulseKernel';

function ToasterWrapper() {
  const { uiPreferences } = useSystemState();
  return (
    <>
      <SonnerToaster 
        theme={uiPreferences.theme}
        position="bottom-right"
        toastOptions={{
          className: 'bg-zinc-950/80 backdrop-blur-xl border-white/10 text-zinc-300 rounded-xl shadow-2xl',
          style: {
            fontSize: '13px',
          }
        }} 
      />
      <HotToaster />
    </>
  );
}

export default function App() {
  return (
    <PulseProvider>
      <AudioProvider>
        <UserProvider>
          <HistoryProvider>
            <ModelsProvider>
              <SystemStateProvider>
                <GlobalMotionProvider>
                  <LanguageProvider>
                    <KnowledgeHubProvider>
                      <WebContainerProvider>
                        <StudioAIContextProvider>
                          <div className="relative z-10 w-full h-full min-h-screen">
                            <ToasterWrapper />
                            <ShortcutOverlay />
                            <Suspense fallback={<div role="status" className="p-8 text-zinc-400">Загружаем рабочее пространство…</div>}><Routes>
                              <Route element={<MainLayout />}>
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/gallery" element={<MainGallery />} />
                                <Route path="/swarm-chat" element={<SwarmChat />} />
                                <Route path="/studio/:type" element={<Studio />} />
                                <Route path="/quantum" element={<QuantumMind />} />
                                <Route path="/dna" element={<DNASequencer />} />
                                <Route path="/reality" element={<RealityEngine />} />
                                <Route path="/book" element={<SystemBook />} />
                                <Route path="/infrastructure" element={<InfrastructureHub />} />
                                <Route path="/settings" element={<SettingsPage />} />
                                <Route path="/history" element={<HistoryPage />} />
                              </Route>
                              <Route path="*" element={<Navigate to="/dashboard" replace />} />
                            </Routes></Suspense>
                          </div>
                        </StudioAIContextProvider>
                      </WebContainerProvider>
                    </KnowledgeHubProvider>
                  </LanguageProvider>
                </GlobalMotionProvider>
              </SystemStateProvider>
            </ModelsProvider>
          </HistoryProvider>
        </UserProvider>
      </AudioProvider>
    </PulseProvider>
  );
}

