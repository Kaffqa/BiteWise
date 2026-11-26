import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import { deleteAllUserScanImages } from '@/lib/storage';
import { Skeleton } from '@/components/ui/Skeleton';
import { LanguageSettingsCard } from '@/components/ui/LanguageSwitcher';
import { LogOut, User, Ruler, Weight as WeightIcon, Calendar, Activity, Target as TargetIcon, Zap, Flame, ShieldAlert, Heart, Utensils, Edit3, Trash2, Pill, AlertTriangle, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { differenceInYears, parseISO } from 'date-fns';
import EditSettingsModal from '@/components/settings/EditSettingsModal';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { t, tDomain } = useLanguage();
  const { profile, loading, updateProfile } = useProfile();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [isDeletingData, setIsDeletingData] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="w-full h-full pb-8">
        <div className="max-w-4xl mx-auto w-full">
          <div className="bg-white rounded-[4px] border border-[#e8efe9] p-6 shadow-sm mb-6 flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-full bg-[#d5e0d8]" />
            <div>
              <Skeleton className="h-6 w-48 mb-2 bg-[#d5e0d8]" />
              <Skeleton className="h-4 w-32 bg-[#d5e0d8]" />
            </div>
          </div>
          <div className="bg-white rounded-[4px] border border-[#e8efe9] p-6 shadow-sm">
            <div className="space-y-6">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex justify-between items-center py-4 border-b border-[#e8efe9] last:border-0">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-5 h-5 bg-[#d5e0d8]" />
                    <Skeleton className="h-4 w-32 bg-[#d5e0d8]" />
                  </div>
                  <Skeleton className="h-4 w-24 bg-[#d5e0d8]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 text-center text-[#8ba797] font-mono">
        {t.settings.profileNotFound}
      </div>
    );
  }

  const age = profile.birth_date ? differenceInYears(new Date(), parseISO(profile.birth_date)) : null;

  const handleSaveProfile = async (data: any) => {
    await updateProfile(data);
  };

  const isDeleteWordValid = ['DELETE', 'HAPUS'].includes(deleteConfirmInput.trim().toUpperCase());

  const handleDeleteAllData = async () => {
    if (!user || !isDeleteWordValid) return;
    setIsDeletingData(true);
    setDeleteError(null);
    try {
      // 1. Delete uploaded images from Supabase Storage
      await deleteAllUserScanImages(user.id);

      // 2. Clear user data tables cleanly under RLS
      await Promise.all([
        (supabase as any).from('meal_logs').delete().eq('user_id', user.id),
        (supabase as any).from('scan_items').delete().eq('user_id', user.id),
        (supabase as any).from('food_scans').delete().eq('user_id', user.id),
        (supabase as any).from('user_ingredients').delete().eq('user_id', user.id),
        (supabase as any).from('notifications').delete().eq('user_id', user.id),
        (supabase as any).from('daily_nutrition_summaries').delete().eq('user_id', user.id),
      ]);

      // 3. Request auth deletion if server service role key is configured
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      let authDeleted = false;

      if (accessToken) {
        const res = await fetch('/api/account', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        }).catch(() => null);
        if (res?.ok) {
          const json = await res.json().catch(() => ({}));
          authDeleted = Boolean(json?.authDeleted);
        }
      }

      if (!authDeleted) {
        await (supabase as any)
          .from('profiles')
          .update({
            is_onboarding_completed: false,
            height_cm: null,
            weight_kg: null,
            target_weight_kg: null,
            allergies: [],
            intolerances: [],
            medical_conditions: [],
            dietary_preferences: [],
            medications: [],
          })
          .eq('id', user.id);
      }

      await signOut();
      navigate('/', { replace: true });
    } catch (err: any) {
      console.error('Failed to delete account data:', err);
      setDeleteError(err?.message || t.settings.deleteModal.failedDelete);
      setIsDeletingData(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto px-4 py-8 pb-24 bg-[#f7f9f8] min-h-screen"
    >
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl text-[#1e4832]">{t.settings.title}</h1>
        <button 
          onClick={() => setIsEditModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-b from-[#88ba9d] to-[#173d26] border border-[#c0d4c8] rounded-[4px] text-white font-mono text-[11px] hover:brightness-110 transition-all shadow-md active:scale-95"
        >
          <Edit3 size={14} /> {t.settings.editProfile}
        </button>
      </div>

      {/* Bento Grid Layout - Flattened for proportional spanning */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* Row 1 Left: Profile Card */}
        <div className="lg:col-span-1 bg-white rounded-[4px] border border-[#e8efe9] p-8 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-b from-[#88ba9d]/10 to-transparent pointer-events-none" />
          <div className="w-24 h-24 rounded-full bg-[#f0f5f2] border-4 border-white shadow-md flex items-center justify-center overflow-hidden shrink-0 relative z-10 mb-4 transition-transform group-hover:scale-105">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-[#8ba797]" />
            )}
          </div>
          <h2 className="font-serif text-2xl text-[#1e4832] leading-tight mb-1 relative z-10">{profile.full_name || t.common.anonymous}</h2>
          <p className="font-mono text-[11px] text-[#8ba797] relative z-10 break-all">{profile.email}</p>
        </div>

        {/* Row 1 Right: Body Metrics */}
        <div className="lg:col-span-2 bg-white rounded-[4px] border border-[#e8efe9] p-6 lg:p-8 shadow-sm">
          <h3 className="font-serif text-[#1e4832] text-xl mb-6">{t.settings.bodyMetrics}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-8 gap-x-6">
            <MetricItem icon={<Ruler size={16} />} label={t.settings.height} value={profile.height_cm ? `${profile.height_cm} cm` : t.common.notSet} />
            <MetricItem icon={<WeightIcon size={16} />} label={t.settings.weight} value={profile.weight_kg ? `${profile.weight_kg} kg` : t.common.notSet} />
            <MetricItem icon={<Calendar size={16} />} label={t.settings.age} value={age !== null ? `${age} ${t.common.yrs}` : t.common.notSet} />
            <MetricItem icon={<User size={16} />} label={t.settings.gender} value={profile.gender ? tDomain('gender', profile.gender) : t.common.notSet} />
            <MetricItem icon={<Activity size={16} />} label={t.settings.activity} value={tDomain('activityLevel', profile.activity_level)} />
            <MetricItem icon={<TargetIcon size={16} />} label={t.settings.goal} value={tDomain('goal', profile.goal)} />
          </div>
        </div>

        {/* Row 2 Full Width: Language Preferences Card */}
        <LanguageSettingsCard />

        {/* Row 3 Left: Dietary Profile Card */}
        <div className="lg:col-span-1 bg-white rounded-[4px] border border-[#e8efe9] p-6 shadow-sm flex flex-col space-y-6">
          <h3 className="font-serif text-[#1e4832] text-xl">{t.settings.dietaryProfile}</h3>
          
          <div className="space-y-5 flex-1">
            <div>
              <h4 className="font-mono text-[10px] text-[#8ba797] uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <ShieldAlert size={12} /> {t.settings.allergies}
              </h4>
              <TagList tags={profile.allergies} emptyText={t.common.noneSpecified} translateTag={(val) => tDomain('tags', val)} />
            </div>

            <div>
              <h4 className="font-mono text-[10px] text-[#8ba797] uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <AlertTriangle size={12} /> {t.settings.intolerances}
              </h4>
              <TagList tags={profile.intolerances} emptyText={t.common.noneSpecified} translateTag={(val) => tDomain('tags', val)} />
            </div>

            <div>
              <h4 className="font-mono text-[10px] text-[#8ba797] uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Heart size={12} /> {t.settings.medicalConditions}
              </h4>
              <TagList tags={profile.medical_conditions} emptyText={t.common.noneSpecified} translateTag={(val) => tDomain('tags', val)} />
            </div>

            <div>
              <h4 className="font-mono text-[10px] text-[#8ba797] uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Utensils size={12} /> {t.settings.dietaryPreferences}
              </h4>
              <TagList tags={profile.dietary_preferences} emptyText={t.common.noneSpecified} translateTag={(val) => tDomain('tags', val)} />
            </div>

            <div>
              <h4 className="font-mono text-[10px] text-[#8ba797] uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Pill size={12} /> {t.settings.activeMedications}
              </h4>
              <TagList tags={profile.medications} emptyText={t.common.noneSpecified} translateTag={(val) => tDomain('tags', val)} />
            </div>
          </div>
        </div>

        {/* Row 3 Right: Nutrition Targets */}
        <div className="lg:col-span-2 bg-white rounded-[4px] border border-[#e8efe9] p-6 lg:p-8 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left side of Nutrition: Energy */}
          <div className="space-y-5 flex flex-col justify-between">
            <div>
              <div className="flex flex-col gap-1 mb-4">
                <h3 className="font-serif text-[#1e4832] text-xl">{t.settings.energyTargets}</h3>
                <p className="font-mono text-[10px] text-[#8ba797]">{t.settings.calculatedAuto}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-[#f0f5f2] p-4 rounded-[4px] flex flex-col justify-center">
                  <span className="font-mono text-[10px] text-[#8ba797] uppercase tracking-wider mb-1 flex items-center gap-1"><Zap size={10} /> {t.settings.bmr}</span>
                  <span className="font-serif text-xl text-[#1e4832] leading-none">{profile.calculated_bmr ? Math.round(Number(profile.calculated_bmr)) : '-'} <span className="text-[10px] font-mono text-[#8ba797]">{t.common.kcal}</span></span>
                </div>
                <div className="bg-[#f0f5f2] p-4 rounded-[4px] flex flex-col justify-center">
                  <span className="font-mono text-[10px] text-[#8ba797] uppercase tracking-wider mb-1 flex items-center gap-1"><Flame size={10} /> {t.settings.tdee}</span>
                  <span className="font-serif text-xl text-[#1e4832] leading-none">{profile.calculated_tdee ? Math.round(Number(profile.calculated_tdee)) : '-'} <span className="text-[10px] font-mono text-[#8ba797]">{t.common.kcal}</span></span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <div className="flex justify-between items-end mb-2">
                <span className="font-mono text-[10px] text-[#8ba797] uppercase tracking-wider">{t.settings.dailyCalorieTarget}</span>
                <span className="font-serif text-2xl text-[#1e4832] leading-none">{profile.target_calories ? Math.round(Number(profile.target_calories)) : '-'}</span>
              </div>
              <div className="h-2 w-full bg-[#1a3825] rounded-[4px] overflow-hidden shadow-inner" />
            </div>
          </div>

          {/* Right side of Nutrition: Macros */}
          <div className="space-y-4 md:border-l md:border-[#e8efe9] md:pl-8 flex flex-col justify-between">
            <div>
              <h4 className="font-mono text-[10px] text-[#8ba797] uppercase tracking-wider mb-1">{t.settings.macronutrientsSplit}</h4>
              <MacroBar label={t.common.protein} value={profile.target_protein_g} percentage={30} color="bg-[#5c8b71]" />
              <MacroBar label={t.common.carbs} value={profile.target_carbs_g} percentage={40} color="bg-[#8ba797]" />
              <MacroBar label={t.common.fat} value={profile.target_fat_g} percentage={30} color="bg-[#a4b5aa]" />
            </div>
            
            <div className="grid grid-cols-3 gap-2 pt-3 mt-3 border-t border-[#e8efe9]">
              <div className="text-center">
                <span className="block font-mono text-[9px] text-[#8ba797] uppercase">{t.settings.fiber}</span>
                <span className="font-mono text-[11px] font-bold text-[#1e4832]">{profile.target_fiber_g ? Math.round(Number(profile.target_fiber_g)) : '-'}g</span>
              </div>
              <div className="text-center border-l border-r border-[#e8efe9]">
                <span className="block font-mono text-[9px] text-[#8ba797] uppercase">{t.settings.sugarMax}</span>
                <span className="font-mono text-[11px] font-bold text-[#1e4832]">{profile.target_sugar_g ? Math.round(Number(profile.target_sugar_g)) : '-'}g</span>
              </div>
              <div className="text-center">
                <span className="block font-mono text-[9px] text-[#8ba797] uppercase">{t.settings.sodiumMax}</span>
                <span className="font-mono text-[11px] font-bold text-[#1e4832]">{profile.target_sodium_mg ? Math.round(Number(profile.target_sodium_mg)) : '-'}mg</span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 4 Full Width: Account Management */}
        <div className="lg:col-span-3 bg-[#fef2f2] rounded-[4px] border border-[#fecaca] p-6 lg:p-8 flex flex-col sm:flex-row justify-between items-center gap-6 mt-2">
          <div className="flex-1">
            <h3 className="font-serif text-[#991b1b] text-xl mb-1">{t.settings.accountManagement}</h3>
            <p className="font-mono text-[10px] text-[#991b1b]/70 leading-relaxed max-w-sm">
              {t.settings.signedInAs} <strong>{profile.email}</strong>. {t.settings.deleteWarning}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={signOut}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-[4px] bg-white border border-[#fecaca] text-[#991b1b] font-mono text-[11px] hover:bg-[#fee2e2] transition-colors shadow-sm"
            >
              <LogOut size={14} />
              {t.settings.signOut}
            </button>
            <button
              onClick={() => {
                setDeleteConfirmInput('');
                setDeleteError(null);
                setIsDeleteModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-[4px] bg-[#991b1b] text-white font-mono text-[11px] hover:bg-[#7f1d1d] transition-colors shadow-sm"
            >
              <Trash2 size={14} />
              {t.settings.deleteData}
            </button>
          </div>
        </div>

      </div>

      <EditSettingsModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        profile={profile}
        onSave={handleSaveProfile}
      />

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm">
          <div className="bg-white border border-[#fecaca] rounded-[4px] shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-2xl text-[#991b1b]">{t.settings.deleteModal.title}</h3>
              <button
                onClick={() => !isDeletingData && setIsDeleteModalOpen(false)}
                aria-label={t.common.close}
                className="p-1.5 rounded-[4px] text-[#8ba797] hover:bg-[#f0f5f2]"
              >
                <X size={18} />
              </button>
            </div>
            <p className="font-mono text-[11px] text-[#5a7a68] leading-relaxed mb-4">
              {t.settings.deleteModal.descPrefix}{' '}
              <strong className="text-[#991b1b]">{t.settings.deleteModal.keyword}</strong>{' '}
              {t.settings.deleteModal.descSuffix}
            </p>
            <input
              type="text"
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              placeholder={t.settings.deleteModal.placeholder}
              className="w-full px-3 py-2 mb-4 border border-[#c5d1c9] rounded-[4px] font-mono text-sm text-[#1e4832] focus:outline-none focus:border-[#991b1b]"
            />
            {deleteError && (
              <p className="font-mono text-[11px] text-[#991b1b] mb-3">{deleteError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={isDeletingData}
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-[4px] border border-[#c5d1c9] font-mono text-xs text-[#6b8274] hover:bg-[#f0f5f2]"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                disabled={isDeletingData || !isDeleteWordValid}
                onClick={handleDeleteAllData}
                className="px-4 py-2 rounded-[4px] bg-[#991b1b] text-white font-mono text-xs font-bold hover:bg-[#7f1d1d] disabled:opacity-40"
              >
                {isDeletingData ? t.common.deleting : t.settings.deleteModal.confirmBtn}
              </button>
            </div>
          </div>
        </div>
      )}

    </motion.div>
  );
}

// Subcomponents
function MetricItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 font-mono text-[10px] text-[#8ba797] uppercase tracking-wider">
        <span className="text-[#a4b5aa]">{icon}</span>
        {label}
      </span>
      <span className="font-serif text-[17px] text-[#1e4832]">{value}</span>
    </div>
  );
}

function MacroBar({ label, value, percentage, color }: { label: string, value: number | null, percentage: number, color: string }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="font-mono text-[11px] text-[#1e4832]">{label}</span>
        <div className="text-right">
          <span className="font-serif text-[13px] text-[#1e4832] leading-none">{value ? Math.round(Number(value)) : 0}g </span>
          <span className="font-mono text-[9px] text-[#8ba797] ml-0.5">({percentage}%)</span>
        </div>
      </div>
      <div className="h-1.5 w-full bg-[#e8efe9] rounded-[4px] overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
          className={`h-full ${color}`} 
        />
      </div>
    </div>
  );
}

function TagList({
  tags,
  emptyText,
  translateTag,
}: {
  tags: string[] | null | undefined;
  emptyText: string;
  translateTag: (val: string) => string;
}) {
  if (!tags || tags.length === 0) {
    return <p className="font-mono text-[10px] text-[#a4b5aa] italic bg-[#f0f5f2] px-3 py-1.5 rounded-[4px] inline-block border border-[#e8efe9]">{emptyText}</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag, i) => (
        <span key={i} className="px-2.5 py-1 rounded-[4px] bg-[#f0f5f2] text-[#1e4832] font-mono text-[10px] border border-[#e8efe9]">
          {translateTag(tag)}
        </span>
      ))}
    </div>
  );
}
