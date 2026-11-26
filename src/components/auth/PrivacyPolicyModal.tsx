import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        key="privacy-policy-overlay"
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#163323]/60 backdrop-blur-sm"
        />

        {/* Modal Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
          className="relative w-full max-w-[600px] max-h-[85vh] bg-[#F6F4EB] rounded-[24px] shadow-2xl overflow-hidden flex flex-col border border-white/40"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#163323]/10 bg-white">
            <h2 className="text-xl font-serif text-[#163323] font-bold tracking-tight">{t.privacy.title}</h2>
            <button 
              onClick={onClose}
              aria-label={t.common.close}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-[#163323]/5 hover:bg-[#163323]/10 text-[#163323]/60 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 1L1 13M1 1L13 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-6 overflow-y-auto font-mono text-sm text-[#163323]/80 space-y-6 bg-white/50">
            {t.privacy.sections.map((section, idx) => (
              <section key={idx}>
                <h3 className="font-bold text-[#163323] text-base mb-2">{section.heading}</h3>
                <p>{section.body}</p>
                {Array.isArray((section as any).bullets) && (section as any).bullets.length > 0 && (
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    {(section as any).bullets.map((b: string, bi: number) => (
                      <li key={bi}>{b}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t border-[#163323]/10 bg-white flex justify-end">
            <button 
              onClick={onClose}
              className="px-6 py-[10px] bg-gradient-to-b from-[#5c8263] to-[#2a4e35] hover:from-[#4e7255] hover:to-[#21422b] text-white rounded-full font-mono text-[13.5px] shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.45),_0_6px_12px_rgba(22,51,35,0.25)] border-[2.5px] border-[#1a3825] transition-all flex items-center justify-center tracking-wide"
            >
              {t.privacy.iUnderstand}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
