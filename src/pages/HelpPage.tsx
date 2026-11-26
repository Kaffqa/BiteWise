import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  ShieldCheck, 
  BookHeart, 
  Target, 
  ChevronDown, 
  Bug, 
  BookOpen, 
  Mail 
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function HelpPage() {
  const { t } = useLanguage();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const quickStartIcons = [Camera, ShieldCheck, BookHeart, Target];

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-7xl mx-auto p-4 md:p-8 pb-32"
    >
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-[#1e4832] mb-2">{t.help.title}</h1>
        <p className="font-mono text-sm text-[#5a7a68]">{t.help.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        
        {/* Top Left: Quick Start */}
        <div className="md:col-span-2 flex flex-col gap-6">
          <div className="bg-white rounded-[4px] border border-[#e8efe9] p-6 shadow-sm h-full">
            <h2 className="font-serif text-xl text-[#1e4832] mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#5c8b71]" /> {t.help.quickStartTitle}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {t.help.quickStartSteps.map((step, idx) => {
                const StepIcon = quickStartIcons[idx] || Camera;
                return (
                  <div key={idx} className="p-4 bg-[#f4f7f5] rounded-[4px] border border-[#e0e8e3]">
                    <StepIcon className="w-6 h-6 text-[#1e4832] mb-3" />
                    <h3 className="font-mono font-bold text-[#1e4832] text-sm mb-1">{step.title}</h3>
                    <p className="font-mono text-xs text-[#5a7a68]">{step.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top Right: Glossary */}
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-[4px] border border-[#e8efe9] p-6 shadow-sm flex-1">
            <h2 className="font-serif text-lg text-[#1e4832] mb-4">{t.help.glossaryTitle}</h2>
            <div className="space-y-4">
              {t.help.glossary.map((item, idx) => (
                <div key={idx}>
                  <div className="font-mono font-bold text-[13px] text-[#1e4832] mb-1">{item.term}</div>
                  <div className="font-mono text-xs text-[#6b8274]">{item.def}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Bottom Left: FAQs */}
        <div className="md:col-span-2 flex flex-col gap-6">
          <div className="bg-white rounded-[4px] border border-[#e8efe9] p-6 shadow-sm flex-1">
            <h2 className="font-serif text-xl text-[#1e4832] mb-4">{t.help.faqTitle}</h2>
            <div className="space-y-3">
              {t.help.faqs.map((faq, idx) => (
                <div key={idx} className="border border-[#e0e8e3] rounded-[4px] overflow-hidden">
                  <button 
                    onClick={() => toggleFaq(idx)}
                    className="w-full flex items-center justify-between p-4 bg-white hover:bg-[#f9faf9] transition-colors text-left"
                  >
                    <span className="font-mono font-bold text-[13px] text-[#1e4832]">{faq.question}</span>
                    <ChevronDown className={`w-4 h-4 text-[#8ba797] transition-transform duration-200 ${openFaqIndex === idx ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {openFaqIndex === idx && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 pt-0 text-[#5a7a68] font-mono text-xs leading-relaxed bg-[#f9faf9]">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Right: Still need help & Tips */}
        <div className="flex flex-col gap-6">
          {/* Pro Tips */}
          <div className="bg-[#f0f5f2] rounded-[4px] border border-[#cfdfd5] p-6 shadow-sm">
            <h2 className="font-serif text-lg text-[#1e4832] mb-3 flex items-center gap-2">
              {t.help.didYouKnowTitle}
            </h2>
            <p className="font-mono text-xs text-[#5a7a68] leading-relaxed">
              {t.help.didYouKnowDesc}
            </p>
          </div>

          <div className="bg-[#1a3825] rounded-[4px] p-6 text-white shadow-md flex-1 flex flex-col justify-center relative overflow-hidden">
            {/* Decorative pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10 blur-xl pointer-events-none"></div>
            
            <div className="relative z-10 mb-5">
              <h2 className="font-serif text-xl mb-2 text-[#e8efe9]">{t.help.stillNeedHelpTitle}</h2>
              <p className="font-mono text-xs text-[#a4b5aa] leading-relaxed">
                {t.help.stillNeedHelpDesc}
              </p>
            </div>
            
            <div className="flex flex-col gap-3 relative z-10">
              <a 
                href="mailto:support@bitewise.app?subject=Bug%20Report%20-%20BiteWise"
                className="flex items-center justify-center gap-2 bg-white text-[#1a3825] font-mono text-xs py-3 px-6 rounded-[4px] hover:bg-[#f0f5f2] transition-colors shadow-sm"
              >
                <Bug size={16} /> {t.help.reportBug}
              </a>
              <a 
                href="mailto:support@bitewise.app"
                className="flex items-center justify-center gap-2 border border-[#5c8b71] bg-transparent text-white font-mono text-xs py-3 px-6 rounded-[4px] hover:bg-white/10 transition-colors"
              >
                <Mail size={16} /> {t.help.emailSupport}
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center font-mono text-[10px] text-[#8ba797] pt-2">
        {t.help.versionText}
      </div>

    </motion.div>
  );
}
