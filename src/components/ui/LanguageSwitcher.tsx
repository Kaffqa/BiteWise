import React from 'react';
import { Globe, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Language } from '@/i18n';

/**
 * Bilingual EN/ID switcher card rendered exclusively in SettingsPage.
 */
export function LanguageSettingsCard() {
  const { lang, setLanguage, t } = useLanguage();

  const options: Array<{ code: Language; flag: string; label: string; desc: string }> = [
    { code: 'en', flag: '🇺🇸', label: t.settings.englishName, desc: t.settings.englishDesc },
    { code: 'id', flag: '🇮🇩', label: t.settings.indonesianName, desc: t.settings.indonesianDesc },
  ];

  return (
    <div className="lg:col-span-3 bg-white rounded-[4px] border border-[#e8efe9] p-6 lg:p-8 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h3 className="font-serif text-[#1e4832] text-xl flex items-center gap-2">
            <Globe size={18} className="text-[#5c8b71]" />
            {t.settings.languageCardTitle}
          </h3>
          <p className="font-mono text-[11px] text-[#8ba797] mt-1">{t.settings.languageCardSubtitle}</p>
        </div>
        <span className="self-start sm:self-auto px-3 py-1 rounded-[4px] bg-[#f0f5f2] border border-[#e0e8e3] font-mono text-[10px] font-bold uppercase tracking-wider text-[#1e4832]">
          {lang === 'id' ? 'ID • Bahasa Indonesia' : 'EN • English'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt) => {
          const isActive = lang === opt.code;
          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => setLanguage(opt.code)}
              aria-pressed={isActive}
              className={`text-left p-4 rounded-[4px] border transition-all flex items-start justify-between gap-3 ${
                isActive
                  ? 'bg-[#f0f5f2] border-[#1a3825] shadow-xs'
                  : 'bg-white border-[#e8efe9] hover:border-[#c5d1c9] hover:bg-[#fafcfb]'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl leading-none mt-0.5">{opt.flag}</span>
                <div>
                  <div className="font-serif text-[18px] text-[#1e4832] leading-tight">{opt.label}</div>
                  <p className="font-mono text-[10px] text-[#6b8274] mt-1 leading-relaxed">{opt.desc}</p>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  isActive
                    ? 'bg-gradient-to-b from-[#88ba9d] to-[#173d26] text-white'
                    : 'border border-[#c5d1c9] bg-white'
                }`}
              >
                {isActive && <Check size={12} strokeWidth={3} />}
              </div>
            </button>
          );
        })}
      </div>

      <p className="font-mono text-[10px] text-[#8ba797] mt-4">{t.settings.languageAppliedNote}</p>
    </div>
  );
}
