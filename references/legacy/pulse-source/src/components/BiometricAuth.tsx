import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Fingerprint, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';

interface BiometricAuthProps {
  onSuccess: () => void;
  onCancel: () => void;
  isLight?: boolean;
}

export default function BiometricAuth({ onSuccess, onCancel, isLight = false }: BiometricAuthProps) {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [isIframe] = useState(() => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  });

  const startScan = () => {
    setStatus('scanning');
    // Simulate biometric delay
    setTimeout(() => {
      setStatus('success');
    }, 1500);
  };

  const modalContent = (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className={`w-full max-w-sm rounded-3xl border p-8 text-center shadow-[0_0_50px_rgba(0,0,0,0.5)] ${
          isLight ? 'bg-white border-gray-200' : 'bg-[#0a0a0a] border-white/10'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-6">
          <div className={`p-4 rounded-2xl ${isLight ? 'bg-indigo-50 text-indigo-600' : 'bg-indigo-500/10 text-indigo-400'}`}>
            <ShieldCheck className="w-8 h-8" />
          </div>
        </div>

        <h3 className={`text-xl font-bold mb-3 ${isLight ? 'text-gray-900' : 'text-white'}`}>
          Secure Access
        </h3>
        
        {isIframe && status !== 'success' && (
          <div className="mb-6 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs text-left leading-relaxed font-mono">
            <strong>⚠️ PREVIEW MODE DETECTED</strong>
            <p className="mt-1 opacity-80">
              Biometric auth & popups are restricted in iframes. For real Google data, use <strong>Open in New Tab</strong>.
            </p>
          </div>
        )}

        <p className={`text-sm mb-10 px-4 leading-relaxed ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
          {status === 'success' ? (
            <span className="text-emerald-500 font-medium italic">Identity verified. You can now proceed to Google Sign-In.</span>
          ) : (
            'Scan your fingerprint or use biometric data to authorize this session.'
          )}
        </p>

        <div className="relative flex justify-center mb-10">
          <motion.div 
            animate={status === 'scanning' ? { 
              scale: [1, 1.1, 1],
            } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className={`p-12 rounded-full border-2 border-dashed transition-all duration-500 ${
              status === 'success' ? 'border-emerald-500 bg-emerald-500/5' : 
              status === 'error' ? 'border-rose-500 bg-rose-500/5' :
              isLight ? 'border-indigo-200 bg-indigo-50/50' : 'border-indigo-500/30 bg-indigo-500/5'
            }`}
          >
            <div className={`relative w-24 h-24 flex items-center justify-center rounded-full transition-all duration-500 ${
              status === 'success' ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' :
              status === 'error' ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]' :
              isLight ? 'bg-white text-indigo-600 shadow-md' : 'bg-white/5 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.2)]'
            }`}>
              <AnimatePresence mode="wait">
                {status === 'success' ? (
                  <motion.div key="success" initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}>
                    <CheckCircle2 className="w-12 h-12" />
                  </motion.div>
                ) : status === 'error' ? (
                  <motion.div key="error" initial={{ scale: 0, rotate: 20 }} animate={{ scale: 1, rotate: 0 }}>
                    <XCircle className="w-12 h-12" />
                  </motion.div>
                ) : (
                  <motion.div key="idle" animate={status === 'scanning' ? { opacity: [1, 0.4, 1] } : {}}>
                    <Fingerprint className="w-12 h-12" />
                  </motion.div>
                )}
              </AnimatePresence>

              {status === 'scanning' && (
                <motion.div 
                  initial={{ top: '10%' }}
                  animate={{ top: '90%' }}
                  transition={{ repeat: Infinity, repeatType: 'reverse', duration: 1.2, ease: "easeInOut" }}
                  className="absolute left-0 right-0 h-1 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,1)] z-10"
                />
              )}
            </div>
          </motion.div>
        </div>

        <div className="flex flex-col gap-3">
          {status === 'success' ? (
            <button 
              onClick={onSuccess}
              className="w-full py-4 rounded-2xl font-mono text-sm uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg hover:shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <CheckCircle2 className="w-4 h-4" />
              Complete Authorization
            </button>
          ) : (
            <>
              <button 
                onClick={startScan}
                disabled={status === 'scanning'}
                className="w-full py-4 rounded-2xl font-mono text-sm uppercase tracking-widest bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg hover:shadow-indigo-500/20 disabled:opacity-50 active:scale-[0.98]"
              >
                {status === 'idle' ? 'Verify Identity' : 'Authenticating...'}
              </button>
              <button 
                onClick={onCancel}
                className={`w-full py-3 rounded-2xl font-mono text-xs uppercase tracking-widest border transition-colors ${
                  isLight ? 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(modalContent, document.getElementById('root') || document.body);
}

