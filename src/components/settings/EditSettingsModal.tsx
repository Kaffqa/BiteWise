import React, { useState, useRef, useEffect } from 'react';
import { X, Save, ShieldAlert, Heart, Utensils, Ruler, Weight as WeightIcon, ChevronDown, Pill, AlertTriangle, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

const ALLERGIES = ['Peanuts', 'Tree Nuts', 'Milk', 'Eggs', 'Wheat', 'Soy', 'Fish', 'Shellfish', 'Lactose', 'Gluten'];
const INTOLERANCES = ['Lactose', 'Gluten', 'Fructose', 'Histamine', 'Caffeine', 'FODMAP', 'Salicylates'];
const MEDICAL = ['Diabetes Type 1', 'Diabetes Type 2', 'Hypertension', 'Celiac Disease', 'IBS', 'GERD', 'PCOS'];
const DIET = ['Vegetarian', 'Vegan', 'Pescatarian', 'Keto', 'Paleo', 'Halal', 'Kosher', 'Low Carb'];
const MEDICATIONS = ['Warfarin', 'Metformin', 'Atorvastatin', 'Amlodipine', 'Lisinopril', 'Levothyroxine', 'Omeprazole', 'Ibuprofen / NSAID', 'Antidepressants / SSRI', 'Insulin'];
const ACTIVITY_LEVELS = ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'];
const GOALS = ['lose_weight_fast', 'lose_weight_gradual', 'maintain_weight', 'gain_muscle', 'manage_condition'];

function CustomSelect({ value, onChange, options }: { value: string; onChange: (val: string) => void; options: { label: string; value: string }[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLabel = options.find((o) => o.value === value)?.label || snakeToTitle(value);

  return (
    <div className="relative" ref={selectRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-white border border-[#c5d1c9] rounded-[4px] text-sm text-left flex items-center justify-between focus:outline-none focus:border-[#1a3825] font-sans"
      >
        <span className="truncate text-[#1e4832]">{selectedLabel}</span>
        <ChevronDown size={14} className={`text-[#8ba797] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-white border border-[#c5d1c9] rounded-[4px] shadow-lg max-h-60 overflow-y-auto"
          >
            {options.map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-[#f0f5f2] hover:text-[#1a3825] transition-colors ${
                  value === option.value ? 'bg-[#e8efe9] text-[#1a3825] font-medium' : 'text-[#333]'
                }`}
              >
                {option.label}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MultiSelectPill({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-[4px] font-mono text-[11px] border transition-all ${
        selected ? 'bg-[#1a3825] border-[#1a3825] text-white' : 'bg-white border-[#e0e8e3] text-[#6b8274] hover:border-[#1a3825]'
      }`}
    >
      {label}
    </button>
  );
}

function snakeToTitle(str: string) {
  if (!str) return '';
  return str
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function buildInitialState(profile: any) {
  return {
    full_name: profile?.full_name || '',
    height_cm: profile?.height_cm || '',
    weight_kg: profile?.weight_kg || '',
    target_weight_kg: profile?.target_weight_kg || '',
    gender: profile?.gender || 'female',
    activity_level: profile?.activity_level || 'sedentary',
    goal: profile?.goal || 'maintain_weight',
    allergies: profile?.allergies || [],
    intolerances: profile?.intolerances || [],
    medical_conditions: profile?.medical_conditions || [],
    dietary_preferences: profile?.dietary_preferences || [],
    medications: profile?.medications || [],
  };
}

export default function EditSettingsModal({ isOpen, onClose, profile, onSave }: any) {
  const { t, tDomain } = useLanguage();
  const [formData, setFormData] = useState(() => buildInitialState(profile));
  const [isSaving, setIsSaving] = useState(false);

  const [customAllergy, setCustomAllergy] = useState('');
  const [customIntolerance, setCustomIntolerance] = useState('');
  const [customMedical, setCustomMedical] = useState('');
  const [customDiet, setCustomDiet] = useState('');
  const [customMedication, setCustomMedication] = useState('');

  useEffect(() => {
    if (isOpen && profile) {
      setFormData(buildInitialState(profile));
    }
  }, [isOpen, profile]);

  const toggleArrayItem = (key: string, item: string) => {
    setFormData((prev: any) => {
      const current = prev[key] || [];
      const updated = current.includes(item) ? current.filter((i: string) => i !== item) : [...current, item];
      return { ...prev, [key]: updated };
    });
  };

  const addCustomTag = (key: string, value: string, clear: (s: string) => void) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (!(formData[key as keyof typeof formData] as string[]).includes(trimmed)) {
      toggleArrayItem(key, trimmed);
    }
    clear('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        height_cm: formData.height_cm ? Number(formData.height_cm) : null,
        weight_kg: formData.weight_kg ? Number(formData.weight_kg) : null,
        target_weight_kg: formData.target_weight_kg ? Number(formData.target_weight_kg) : null,
      };
      await onSave(payload);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-[#e8efe9]">
          <h2 className="font-serif text-2xl text-[#1e4832]">{t.editProfileModal.title}</h2>
          <button onClick={onClose} aria-label={t.common.close} className="p-2 hover:bg-[#f0f5f2] rounded-[4px] text-[#8ba797] transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Basic Info */}
          <section className="space-y-4">
            <h3 className="font-mono text-xs uppercase tracking-widest text-[#8ba797]">{t.editProfileModal.personalInfo}</h3>
            <div>
              <label className="block text-xs font-mono text-[#1e4832] mb-1">{t.editProfileModal.fullName}</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#c5d1c9] rounded-[4px] text-sm focus:outline-none focus:border-[#1a3825] font-sans"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-mono text-[#1e4832] mb-1">{t.editProfileModal.heightCm}</label>
                <div className="relative">
                  <Ruler className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[#8ba797]" />
                  <input
                    type="number"
                    value={formData.height_cm}
                    onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
                    className="w-full pl-8 pr-2 py-2 bg-white border border-[#c5d1c9] rounded-[4px] text-sm focus:outline-none focus:border-[#1a3825] font-sans"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-[#1e4832] mb-1">{t.editProfileModal.weightKg}</label>
                <div className="relative">
                  <WeightIcon className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[#8ba797]" />
                  <input
                    type="number"
                    value={formData.weight_kg}
                    onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                    className="w-full pl-8 pr-2 py-2 bg-white border border-[#c5d1c9] rounded-[4px] text-sm focus:outline-none focus:border-[#1a3825] font-sans"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-[#1e4832] mb-1">{t.editProfileModal.targetKg}</label>
                <div className="relative">
                  <Target className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[#8ba797]" />
                  <input
                    type="number"
                    placeholder={t.common.optional}
                    value={formData.target_weight_kg}
                    onChange={(e) => setFormData({ ...formData, target_weight_kg: e.target.value })}
                    className="w-full pl-8 pr-2 py-2 bg-white border border-[#c5d1c9] rounded-[4px] text-sm focus:outline-none focus:border-[#1a3825] font-sans"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-[#1e4832] mb-1">{t.editProfileModal.gender}</label>
                <CustomSelect
                  value={formData.gender || 'male'}
                  onChange={(val) => setFormData({ ...formData, gender: val })}
                  options={[
                    { label: tDomain('gender', 'male'), value: 'male' },
                    { label: tDomain('gender', 'female'), value: 'female' },
                    { label: tDomain('gender', 'other'), value: 'other' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-[#1e4832] mb-1">{t.editProfileModal.goal}</label>
                <CustomSelect
                  value={formData.goal || 'maintain_weight'}
                  onChange={(val) => setFormData({ ...formData, goal: val })}
                  options={GOALS.map((g) => ({ label: tDomain('goal', g), value: g }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-[#1e4832] mb-1">{t.editProfileModal.activityLevel}</label>
              <CustomSelect
                value={formData.activity_level || 'sedentary'}
                onChange={(val) => setFormData({ ...formData, activity_level: val })}
                options={ACTIVITY_LEVELS.map((a) => ({ label: tDomain('activityLevel', a), value: a }))}
              />
            </div>
          </section>

          {/* Dietary Info */}
          <section className="space-y-6 pt-4 border-t border-[#e8efe9]">
            <h3 className="font-mono text-xs uppercase tracking-widest text-[#8ba797]">{t.editProfileModal.dietaryProfile}</h3>

            <div>
              <label className="flex items-center gap-2 text-xs font-mono text-[#1e4832] mb-2">
                <ShieldAlert size={14} /> {t.editProfileModal.allergies}
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {Array.from(new Set([...ALLERGIES, ...formData.allergies])).map((item) => (
                  <MultiSelectPill
                    key={item as string}
                    label={tDomain('tags', item as string)}
                    selected={formData.allergies.includes(item)}
                    onClick={() => toggleArrayItem('allergies', item as string)}
                  />
                ))}
              </div>
              <input
                type="text"
                placeholder={t.editProfileModal.addCustomAllergy}
                value={customAllergy}
                onChange={(e) => setCustomAllergy(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomTag('allergies', customAllergy, setCustomAllergy);
                  }
                }}
                className="w-full bg-transparent border-b border-[#c0d4c8] focus:border-[#1e4832] py-2 font-mono text-[11px] text-[#1e4832] placeholder:text-[#a4b5aa] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-mono text-[#1e4832] mb-2">
                <AlertTriangle size={14} /> {t.editProfileModal.intolerances}
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {Array.from(new Set([...INTOLERANCES, ...formData.intolerances])).map((item) => (
                  <MultiSelectPill
                    key={item as string}
                    label={tDomain('tags', item as string)}
                    selected={formData.intolerances.includes(item)}
                    onClick={() => toggleArrayItem('intolerances', item as string)}
                  />
                ))}
              </div>
              <input
                type="text"
                placeholder={t.editProfileModal.addCustomIntolerance}
                value={customIntolerance}
                onChange={(e) => setCustomIntolerance(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomTag('intolerances', customIntolerance, setCustomIntolerance);
                  }
                }}
                className="w-full bg-transparent border-b border-[#c0d4c8] focus:border-[#1e4832] py-2 font-mono text-[11px] text-[#1e4832] placeholder:text-[#a4b5aa] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-mono text-[#1e4832] mb-2">
                <Heart size={14} /> {t.editProfileModal.medicalConditions}
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {Array.from(new Set([...MEDICAL, ...formData.medical_conditions])).map((item) => (
                  <MultiSelectPill
                    key={item as string}
                    label={tDomain('tags', item as string)}
                    selected={formData.medical_conditions.includes(item)}
                    onClick={() => toggleArrayItem('medical_conditions', item as string)}
                  />
                ))}
              </div>
              <input
                type="text"
                placeholder={t.editProfileModal.addCustomMedical}
                value={customMedical}
                onChange={(e) => setCustomMedical(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomTag('medical_conditions', customMedical, setCustomMedical);
                  }
                }}
                className="w-full bg-transparent border-b border-[#c0d4c8] focus:border-[#1e4832] py-2 font-mono text-[11px] text-[#1e4832] placeholder:text-[#a4b5aa] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-mono text-[#1e4832] mb-2">
                <Utensils size={14} /> {t.editProfileModal.dietaryPreferences}
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {Array.from(new Set([...DIET, ...formData.dietary_preferences])).map((item) => (
                  <MultiSelectPill
                    key={item as string}
                    label={tDomain('tags', item as string)}
                    selected={formData.dietary_preferences.includes(item)}
                    onClick={() => toggleArrayItem('dietary_preferences', item as string)}
                  />
                ))}
              </div>
              <input
                type="text"
                placeholder={t.editProfileModal.addCustomDiet}
                value={customDiet}
                onChange={(e) => setCustomDiet(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomTag('dietary_preferences', customDiet, setCustomDiet);
                  }
                }}
                className="w-full bg-transparent border-b border-[#c0d4c8] focus:border-[#1e4832] py-2 font-mono text-[11px] text-[#1e4832] placeholder:text-[#a4b5aa] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-mono text-[#1e4832] mb-2">
                <Pill size={14} /> {t.editProfileModal.activeMedications}
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {Array.from(new Set([...MEDICATIONS, ...(formData.medications || [])])).map((item) => (
                  <MultiSelectPill
                    key={item as string}
                    label={tDomain('tags', item as string)}
                    selected={(formData.medications || []).includes(item)}
                    onClick={() => toggleArrayItem('medications', item as string)}
                  />
                ))}
              </div>
              <input
                type="text"
                placeholder={t.editProfileModal.addCustomMedication}
                value={customMedication}
                onChange={(e) => setCustomMedication(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomTag('medications', customMedication, setCustomMedication);
                  }
                }}
                className="w-full bg-transparent border-b border-[#c0d4c8] focus:border-[#1e4832] py-2 font-mono text-[11px] text-[#1e4832] placeholder:text-[#a4b5aa] focus:outline-none transition-colors"
              />
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-[#e8efe9] bg-[#f7f9f8]">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-b from-[#88ba9d] to-[#173d26] border border-[#c0d4c8] rounded-[4px] text-white font-mono text-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isSaving ? t.common.saving : <><Save size={16} /> {t.editProfileModal.saveChanges}</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
