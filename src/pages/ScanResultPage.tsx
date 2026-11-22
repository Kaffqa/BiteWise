import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CaretLeft, ShieldCheck, Warning, ShieldWarning, Info, PlusCircle, CheckCircle, X, MagnifyingGlassPlus } from '@phosphor-icons/react';
import { Loader2, Pill, Activity, Sparkles, ArrowRight, Check, ShieldAlert, TrendingUp, ArrowLeftRight, Lightbulb, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, formatDistanceToNow, isToday } from 'date-fns';
import { Skeleton } from '@/components/ui/Skeleton';
import { supabase } from '@/lib/supabase';
import { useScanner } from '@/hooks/useScanner';
import { useNutrition } from '@/contexts/NutritionContext';
import type { SmartSwapAlternative, DrugInteraction, GlycemicAnalysis } from '@/types/ai.types';

export function GlycemicCurveChart({ analysis }: { analysis: GlycemicAnalysis }) {
  const points = analysis.curveDataPoints || [];
  if (points.length === 0) return null;

  const width = 600;
  const height = 190;
  const padL = 45;
  const padR = 25;
  const padT = 32;
  const padB = 32;

  const maxGlucose = Math.max(165, analysis.peakGlucoseMgDl + 10, ...points.map(p => p.glucoseMgDl));
  const minGlucose = 70;

  const getX = (min: number) => padL + (min / 180) * (width - padL - padR);
  const getY = (glu: number) => height - padB - ((glu - minGlucose) / (maxGlucose - minGlucose)) * (height - padT - padB);

  // Generate smooth SVG cubic bezier path
  let pathD = `M ${getX(points[0].minutesAfterEating)} ${getY(points[0].glucoseMgDl)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const x0 = getX(points[i].minutesAfterEating);
    const y0 = getY(points[i].glucoseMgDl);
    const x1 = getX(points[i + 1].minutesAfterEating);
    const y1 = getY(points[i + 1].glucoseMgDl);
    const cx = (x0 + x1) / 2;
    pathD += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
  }

  const baselineY = getY(90);
  const areaD = `${pathD} L ${getX(points[points.length - 1].minutesAfterEating)} ${baselineY} L ${getX(points[0].minutesAfterEating)} ${baselineY} Z`;

  const peakPoint = points.reduce((prev, curr) => (curr.glucoseMgDl > prev.glucoseMgDl ? curr : prev), points[0]);
  const peakX = getX(peakPoint.minutesAfterEating);
  const peakY = getY(peakPoint.glucoseMgDl);

  const strokeColor = '#1e4832';
  const gradStart = 'rgba(30, 72, 50, 0.25)';

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[460px] select-none font-mono">
        <defs>
          <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gradStart} />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
          </linearGradient>
        </defs>

        {/* Shaded Area under curve */}
        <path d={areaD} fill="url(#curveGradient)" />

        {/* Fasting Baseline (90 mg/dL) */}
        <line x1={padL} y1={baselineY} x2={width - padR} y2={baselineY} stroke="#94a3b8" strokeDasharray="3 3" strokeWidth="1" />
        <text x={width - padR} y={baselineY - 4} fill="#64748b" fontSize="9" textAnchor="end">Fasting Baseline (90 mg/dL)</text>

        {/* Curve stroke */}
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />

        {/* Data point dots */}
        {points.map((p, i) => (
          <circle 
            key={i} 
            cx={getX(p.minutesAfterEating)} 
            cy={getY(p.glucoseMgDl)} 
            r="3" 
            fill={strokeColor}
            className="hover:r-5 transition-all cursor-pointer"
          />
        ))}

        {/* Peak point circle highlight */}
        <circle cx={peakX} cy={peakY} r="6" fill={strokeColor} />
        <circle cx={peakX} cy={peakY} r="10" fill="none" stroke={strokeColor} strokeWidth="1.5" opacity="0.6" />
        
        {/* Peak Label badge */}
        <rect x={peakX - 42} y={peakY - 28} width="84" height="20" rx="3" fill="#1e4832" />
        <text x={peakX} y={peakY - 14} fill="#ffffff" fontSize="9" fontWeight="normal" textAnchor="middle">
          Peak: {peakPoint.glucoseMgDl} mg/dL
        </text>

        {/* X Axis ticks */}
        {[0, 30, 60, 90, 120, 150, 180].map(min => {
          const x = getX(min);
          return (
            <g key={min}>
              <line x1={x} y1={height - padB} x2={x} y2={height - padB + 5} stroke="#cbd5e1" strokeWidth="1" />
              <text x={x} y={height - padB + 16} fill="#8ba797" fontSize="9" textAnchor="middle">{min}m</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function ScanResultPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirmMealLog } = useScanner();
  const { addMealLog, refreshToday } = useNutrition();

  const [loading, setLoading] = useState(true);
  const [scanRecord, setScanRecord] = useState<any>(null);
  const [scanItems, setScanItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [logStatus, setLogStatus] = useState<'idle' | 'logging' | 'success'>('idle');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [swappingName, setSwappingName] = useState<string | null>(null);
  const [swapLoggedSuccess, setSwapLoggedSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchScanData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const { data: scanData, error: scanError } = await supabase
          .from('food_scans')
          .select('*, meal_logs(*)')
          .eq('id', id)
          .single();

        if (scanError) throw scanError;
        setScanRecord(scanData);

        const { data: itemsData, error: itemsError } = await supabase
          .from('scan_items')
          .select('*')
          .eq('scan_id', id);

        if (itemsError) throw itemsError;
        setScanItems(itemsData || []);
      } catch (err: any) {
        console.error('Error fetching scan results:', err);
        setError(err.message || 'Failed to load scan results');
      } finally {
        setLoading(false);
      }
    };

    fetchScanData();
  }, [id]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleManualLog = async () => {
    try {
      setLogStatus('logging');
      const logData = {
        user_id: scanRecord.user_id,
        scan_id: scanRecord.id,
        meal_type: 'snack',
        food_name: scanRecord.meal_title,
        calories: scanRecord.total_calories,
        protein_g: scanRecord.total_protein_g,
        carbs_g: scanRecord.total_carbs_g,
        fat_g: scanRecord.total_fat_g,
        fiber_g: scanRecord.total_fiber_g,
        sugar_g: scanRecord.total_sugar_g,
        sodium_mg: scanRecord.total_sodium_mg,
        consumed_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
        log_date: format(new Date(), 'yyyy-MM-dd'),
        portion_multiplier: 1,
      };

      await addMealLog(logData as any);
      await refreshToday();
      
      setLogStatus('success');
      setTimeout(() => navigate('/app'), 1500);
    } catch (err: any) {
      console.error('Logging failed:', err);
      setLogStatus('idle');
    }
  };

  const handleLogSwap = async (alt: SmartSwapAlternative) => {
    try {
      setSwappingName(alt.alternativeName);
      const logData = {
        user_id: scanRecord.user_id,
        scan_id: scanRecord.id,
        meal_type: 'snack',
        food_name: `${alt.alternativeName} (Smart Swap)`,
        calories: alt.calories,
        protein_g: alt.proteinG || 15,
        carbs_g: alt.carbsG || 30,
        fat_g: alt.fatG || 10,
        fiber_g: 4,
        sugar_g: 3,
        sodium_mg: 350,
        consumed_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
        log_date: format(new Date(), 'yyyy-MM-dd'),
        portion_multiplier: 1,
      };

      await addMealLog(logData as any);
      await refreshToday();
      setSwapLoggedSuccess(alt.alternativeName);
    } catch (err: any) {
      console.error('Logging swap failed:', err);
    } finally {
      setSwappingName(null);
    }
  };

  if (loading) {
    return (
      <div className="pb-24 pt-2">
        <div className="mb-6">
          <Skeleton className="h-10 w-40 bg-[#d5e0d8]" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 flex flex-col gap-5">
            <div className="bg-white rounded-[4px] border border-[#e8efe9] shadow-sm overflow-hidden flex flex-col">
              <Skeleton className="w-full h-64 lg:h-80 rounded-none bg-[#d5e0d8]" />
              <div className="p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-2">
                  <Skeleton className="h-8 w-64 bg-[#d5e0d8]" />
                  <Skeleton className="h-6 w-24 bg-[#d5e0d8]" />
                </div>
                <Skeleton className="h-4 w-40 bg-[#d5e0d8] mt-2" />
              </div>
            </div>
            <div className="bg-white rounded-[4px] border border-[#e8efe9] p-6 lg:p-8 shadow-sm">
              <Skeleton className="h-6 w-48 bg-[#d5e0d8] mb-6" />
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-5 w-24 bg-[#d5e0d8] shrink-0" />
                    <Skeleton className="h-4 w-full bg-[#d5e0d8] mt-1" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="lg:col-span-4 flex flex-col gap-5">
            <div className="bg-white rounded-[4px] border border-[#e8efe9] p-6 shadow-sm">
              <Skeleton className="h-12 w-full bg-[#d5e0d8]" />
            </div>
            <div className="bg-white rounded-[4px] border border-[#e8efe9] p-6 shadow-sm">
              <Skeleton className="h-6 w-48 bg-[#d5e0d8] mb-4" />
              <Skeleton className="h-32 w-full bg-[#d5e0d8] mb-6" />
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-2 w-full bg-[#d5e0d8]" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !scanRecord) {
    return (
      <div className="w-full h-full min-h-screen bg-[#f4f7f5] flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-[4px] bg-[#f0f5f2] flex items-center justify-center">
          <Warning className="w-8 h-8 text-[#6b8274]" weight="fill" />
        </div>
        <p className="text-[#1e4832] font-serif text-[24px]">{error || 'Scan not found'}</p>
        <button 
          onClick={() => navigate('/app/history')} 
          className="px-6 py-2.5 rounded-[4px] border border-[#c5d1c9] text-[#1e4832] font-mono text-[12px] font-semibold hover:bg-[#f0f5f2] transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const isSafe = scanRecord.safety_status === 'safe';
  const isAlreadyLogged = scanRecord.meal_logs && scanRecord.meal_logs.length > 0;
  const shouldShowLoggedState = isAlreadyLogged || logStatus === 'success' || (isSafe && logStatus !== 'idle');

  const safetyConfig: Record<string, { bg: string; text: string; label: string; icon: any; border: string }> = {
    safe: { bg: 'bg-[#bbf7d0]', text: 'text-[#166534]', border: 'border-[#4ade80]/30', label: 'Safe', icon: ShieldCheck },
    caution: { bg: 'bg-[#fef3c7]', text: 'text-[#92400e]', border: 'border-[#fcd34d]/40', label: 'Flagged', icon: Warning },
    danger: { bg: 'bg-[#fecaca]', text: 'text-[#991b1b]', border: 'border-[#f87171]/30', label: 'Allergen Alert', icon: ShieldWarning },
    unknown: { bg: 'bg-[#e8efe9]', text: 'text-[#6b8274]', border: 'border-[#c5d1c9]', label: 'Unknown', icon: ShieldCheck },
  };

  const status = safetyConfig[scanRecord.safety_status] || safetyConfig.unknown;

  // 3 New Features Data Extraction & Resilient Fallbacks
  const rawAI = scanRecord.raw_ai_response || {};
  const drugInteractions: DrugInteraction[] = rawAI.drugInteractions || [];

  // Smart Swaps (AI-generated or resilient contextual fallback)
  let smartAlternatives: SmartSwapAlternative[] = rawAI.smartAlternatives || [];
  if (smartAlternatives.length === 0 && (scanRecord.safety_status !== 'safe' || (scanRecord.total_calories || 0) > 400)) {
    const mealCal = scanRecord.total_calories || 520;
    smartAlternatives = [
      {
        originalItem: scanRecord.meal_title || 'Current Meal',
        alternativeName: 'Shirataki Rice with Grilled Chicken & Steamed Greens',
        reason: 'Saves calories, replaces high-GI white starch with prebiotic konjac glucomannan, eliminating allergen triggers.',
        calories: Math.max(220, Math.round(mealCal * 0.55)),
        proteinG: 28,
        carbsG: 18,
        fatG: 6,
        safetyStatus: 'safe',
        tags: ['Lower Calorie', 'Low GI', 'High Protein', 'Gluten-Free']
      },
      {
        originalItem: scanRecord.meal_title || 'Current Meal',
        alternativeName: 'Fresh Gado-Gado with Cashew Dressing & Baked Tempeh',
        reason: 'Replaces saturated frying oil with plant-based protein and high dietary fiber to mitigate glucose response.',
        calories: Math.max(280, Math.round(mealCal * 0.65)),
        proteinG: 22,
        carbsG: 26,
        fatG: 11,
        safetyStatus: 'safe',
        tags: ['Heart-Healthy', 'High Fiber', 'Indonesian Local']
      }
    ];
  }

  // Glycemic Analysis (AI-generated or resilient continuous curve simulator)
  let glycemicAnalysis: GlycemicAnalysis = rawAI.glycemicAnalysis;
  if (!glycemicAnalysis || !glycemicAnalysis.curveDataPoints || glycemicAnalysis.curveDataPoints.length === 0) {
    const totalCarbs = scanRecord.total_carbs_g || 45;
    const sugar = scanRecord.total_sugar_g || 12;
    const fiber = scanRecord.total_fiber_g || 3;
    const netCarbs = Math.max(10, totalCarbs - fiber);
    const estGI = Math.min(95, Math.max(38, Math.round(48 + (sugar / (totalCarbs || 1)) * 35 - (fiber / (totalCarbs || 1)) * 20)));
    const glycemicLoad = Math.round((estGI * netCarbs) / 100);
    const peakGlucose = Math.round(90 + (glycemicLoad * 2.6));
    const spikeLevel: 'low' | 'moderate' | 'high' = peakGlucose > 150 ? 'high' : peakGlucose > 125 ? 'moderate' : 'low';

    glycemicAnalysis = {
      estimatedGI: estGI,
      glycemicLoad,
      spikeLevel,
      peakGlucoseMgDl: peakGlucose,
      timeToBaselineMinutes: 150,
      curveDataPoints: [
        { minutesAfterEating: 0, glucoseMgDl: 90 },
        { minutesAfterEating: 15, glucoseMgDl: Math.round(90 + (peakGlucose - 90) * 0.35) },
        { minutesAfterEating: 30, glucoseMgDl: Math.round(90 + (peakGlucose - 90) * 0.75) },
        { minutesAfterEating: 45, glucoseMgDl: peakGlucose },
        { minutesAfterEating: 60, glucoseMgDl: Math.round(90 + (peakGlucose - 90) * 0.88) },
        { minutesAfterEating: 75, glucoseMgDl: Math.round(90 + (peakGlucose - 90) * 0.68) },
        { minutesAfterEating: 90, glucoseMgDl: Math.round(90 + (peakGlucose - 90) * 0.48) },
        { minutesAfterEating: 105, glucoseMgDl: Math.round(90 + (peakGlucose - 90) * 0.32) },
        { minutesAfterEating: 120, glucoseMgDl: Math.round(90 + (peakGlucose - 90) * 0.20) },
        { minutesAfterEating: 135, glucoseMgDl: Math.round(90 + (peakGlucose - 90) * 0.12) },
        { minutesAfterEating: 150, glucoseMgDl: Math.round(90 + (peakGlucose - 90) * 0.06) },
        { minutesAfterEating: 165, glucoseMgDl: 92 },
        { minutesAfterEating: 180, glucoseMgDl: 90 },
      ],
      tipToReduceSpike: 'Food sequencing: Eat vegetables and proteins before carbohydrates to flatten your glucose spike by up to 30%.',
      fiberMitigationFactor: Number((fiber / (totalCarbs || 1)).toFixed(2))
    };
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="pb-24"
    >
      <div>
        {/* Header */}
        <div className="mb-6 pt-2">
          <button 
            onClick={() => navigate('/app/history')} 
            className="inline-flex px-4 py-2 bg-white border border-[#cfdfd5] rounded-[4px] text-sm font-mono text-[#5a7a68] hover:bg-[#f0f5f2] hover:text-[#1e4832] transition-colors items-center gap-2"
          >
            <CaretLeft size={16} /> Back to Daily Log
          </button>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Left Column */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            {/* Main Image & Overview */}
            <div className="bg-white rounded-[4px] border border-[#e8efe9] shadow-sm overflow-hidden flex flex-col">
              {scanRecord.image_url && (
                <div 
                  className="w-full h-64 lg:h-80 relative border-b border-[#e8efe9] cursor-pointer group"
                  onClick={() => setIsImageModalOpen(true)}
                >
                  <img 
                    src={scanRecord.image_url} 
                    alt="Scanned Food" 
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" 
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transform scale-90 group-hover:scale-100 duration-300">
                      <MagnifyingGlassPlus size={24} className="text-white" weight="bold" />
                    </div>
                  </div>
                </div>
              )}
              
              <div className="p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-2">
                  <h2 className="text-[28px] font-serif text-[#1e4832] leading-tight">{scanRecord.meal_title || 'Unknown Meal'}</h2>
                  <div className={"self-start inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-[4px] text-[10px] capitalize tracking-wider font-mono font-bold " + status.bg + " " + status.text + " border " + status.border + " flex-shrink-0"}>
                    {React.createElement(status.icon, { size: 14, weight: "fill" })}
                    {status.label}
                  </div>
                </div>
                <p className="font-mono text-[10px] capitalize tracking-wider text-[#8ba797] mt-1">
                  Scanned {formatDistanceToNow(new Date(scanRecord.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>

            {/* 1. Food-Drug Interaction Guardian Alert */}
            {drugInteractions.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[4px] border-2 border-[#ef4444] shadow-sm p-6 lg:p-8 relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#fee2e2]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#fef2f2] flex items-center justify-center text-[#dc2626]">
                      <Pill size={18} />
                    </div>
                    <div>
                      <h3 className="font-serif text-[20px] text-[#991b1b] leading-tight">Food-Drug Interaction Guardian</h3>
                      <p className="font-mono text-[10px] text-[#dc2626] uppercase tracking-wider">Clinical Pharmacological Alert</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-[4px] bg-[#fecaca] text-[#991b1b] font-mono text-[10px] font-bold uppercase tracking-wider">
                    {drugInteractions.length} Flagged
                  </span>
                </div>

                <div className="space-y-3.5">
                  {drugInteractions.map((interaction, idx) => (
                    <div key={idx} className="bg-[#fff1f2] border border-[#fecaca] p-4 rounded-[4px]">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-[#991b1b] bg-[#fee2e2] px-2 py-0.5 rounded-[2px]">
                            {interaction.medication}
                          </span>
                          <span className="text-[#dc2626] text-xs font-mono">⚡</span>
                          <span className="font-mono text-[11px] font-bold text-[#1e4832] bg-white px-2 py-0.5 rounded-[2px] border border-[#e8efe9]">
                            {interaction.interactingIngredient}
                          </span>
                        </div>
                        <span className={`self-start sm:self-auto px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                          interaction.severity === 'severe' ? 'bg-[#dc2626] text-white' : 'bg-[#fef3c7] text-[#92400e]'
                        }`}>
                          {interaction.severity} Risk
                        </span>
                      </div>

                      <p className="text-[12px] font-mono text-[#7f1d1d] leading-relaxed mb-2.5">
                        <strong className="text-[#991b1b]">Mechanism: </strong>
                        {interaction.mechanism}
                      </p>

                      <div className="bg-white/80 p-2.5 rounded-[3px] border border-[#fecaca] flex items-start gap-2">
                        <Info size={14} className="text-[#dc2626] shrink-0 mt-0.5" />
                        <p className="text-[11px] font-mono text-[#991b1b] leading-tight">
                          <strong>Clinical Advice: </strong>{interaction.recommendation}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Detected Ingredients */}
            {scanItems.length > 0 && (
              <div className="bg-white rounded-[4px] border border-[#e8efe9] shadow-sm p-6 lg:p-8 flex-1">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="font-serif text-[24px] text-[#1e4832]">Detected Ingredients</h3>
                  <span className="font-mono text-[11px] capitalize tracking-wider text-[#8ba797]">{scanItems.length} items</span>
                </div>
                <div className="flex flex-col">
                  {scanItems.map((item, idx) => {
                    const itemStatus = safetyConfig[item.item_safety_status] || safetyConfig.unknown;
                    return (
                      <div 
                        key={item.id} 
                        className={"py-4 flex justify-between items-center " + (idx < scanItems.length - 1 ? 'border-b border-[#e8efe9]' : '')}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-serif text-[16px] text-[#1e4832] mb-0.5">{item.item_name}</p>
                          <p className="font-mono text-[10px] text-[#8ba797]">
                            {item.portion_description || item.estimated_weight_g + "g"}
                          </p>
                        </div>
                        <div className="text-right flex items-center gap-3 sm:gap-4 shrink-0">
                          <div className="font-mono text-[10px] text-[#8ba797] capitalize tracking-wider">
                            <span>{item.calories} kcal</span>
                          </div>
                          <div className={"shrink-0 whitespace-nowrap w-[115px] sm:w-[125px] flex items-center justify-center gap-1.5 py-1.5 " + itemStatus.bg + " " + itemStatus.text + " text-[10px] font-mono font-bold capitalize tracking-wider rounded-[4px]"}>
                            {React.createElement(itemStatus.icon, { size: 12, weight: "fill" })}
                            {itemStatus.label}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Smart Swap Alternatives Section */}
            {smartAlternatives.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[4px] border border-[#e8efe9] shadow-sm p-6 lg:p-8"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <ArrowLeftRight size={20} className="text-[#166534]" />
                      <h3 className="font-serif text-[24px] text-[#1e4832]">Smart Swap Alternatives</h3>
                    </div>
                    <p className="font-mono text-[10px] text-[#8ba797] uppercase tracking-wider mt-1">
                      Healthier cultural replacements tailored to your profile
                    </p>
                  </div>
                  <span className="self-start sm:self-auto font-mono text-[11px] text-[#166534] bg-[#f0f5f2] border border-[#c5d1c9] px-3 py-1 rounded-[4px] font-bold">
                    {smartAlternatives.length} Recommendations
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {smartAlternatives.map((alt, idx) => {
                    const calSavings = (scanRecord.total_calories || 0) - alt.calories;

                    return (
                      <div 
                        key={idx}
                        className="border border-[#e8efe9] rounded-[4px] p-5 bg-[#fdfdfd] hover:border-[#1e4832]/30 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <span className="font-mono text-[9px] text-[#8ba797] uppercase tracking-wider truncate max-w-[170px]">
                              Replaces: {alt.originalItem || 'Scanned Meal'}
                            </span>
                            {calSavings > 0 ? (
                              <span className="px-2 py-0.5 rounded-[2px] bg-[#bbf7d0] text-[#166534] font-mono font-bold text-[10px] shrink-0">
                                -{calSavings} kcal
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-[2px] bg-[#f0f5f2] text-[#1e4832] font-mono font-bold text-[10px] shrink-0">
                                {alt.calories} kcal
                              </span>
                            )}
                          </div>

                          <h4 className="font-serif text-[18px] text-[#1e4832] font-medium leading-snug mb-2">
                            {alt.alternativeName}
                          </h4>

                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {alt.tags?.map((t, ti) => (
                              <span key={ti} className="px-2 py-0.5 rounded-[2px] bg-[#f0f5f2] text-[#5a7a68] font-mono text-[9px]">
                                {t}
                              </span>
                            ))}
                          </div>

                          <p className="font-mono text-[11px] text-[#6b8274] leading-relaxed mb-4">
                            {alt.reason}
                          </p>
                        </div>

                        <div>
                          {/* Macro pills */}
                          <div className="grid grid-cols-3 gap-2 py-2.5 border-t border-[#e8efe9] text-center font-mono text-[10px]">
                            <div>
                              <span className="block text-[#8ba797] text-[8px] uppercase">Protein</span>
                              <span className="font-bold text-[#1e4832]">{alt.proteinG}g</span>
                            </div>
                            <div className="border-l border-r border-[#e8efe9]">
                              <span className="block text-[#8ba797] text-[8px] uppercase">Carbs</span>
                              <span className="font-bold text-[#1e4832]">{alt.carbsG}g</span>
                            </div>
                            <div>
                              <span className="block text-[#8ba797] text-[8px] uppercase">Fat</span>
                              <span className="font-bold text-[#1e4832]">{alt.fatG}g</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* 3. Glycemic Spike Simulator Section */}
            {glycemicAnalysis && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[4px] border border-[#e8efe9] shadow-sm p-6 lg:p-8"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <Activity size={20} className="text-[#1e4832]" />
                      <h3 className="font-serif text-[24px] text-[#1e4832]">Glycemic Spike Simulator</h3>
                    </div>
                    <p className="font-mono text-[10px] text-[#8ba797] uppercase tracking-wider mt-1">
                      Estimated 3-hour postprandial glucose response curve
                    </p>
                  </div>

                  {/* Spike Level Badge */}
                  <div className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[10px] font-mono font-bold uppercase tracking-wider border bg-[#f0f5f2] text-[#1e4832] border-[#c5d1c9]">
                    <TrendingUp size={12} />
                    {glycemicAnalysis.spikeLevel} Glucose Spike
                  </div>
                </div>

                {/* Metric Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 font-mono">
                  <div className="bg-[#f0f5f2] p-3 rounded-[4px] text-center border border-[#e8efe9]">
                    <span className="block text-[9px] text-[#8ba797] uppercase">Est. Glycemic Index</span>
                    <span className="font-serif text-[18px] text-[#1e4832] font-semibold">{glycemicAnalysis.estimatedGI}</span>
                    <span className="block text-[8px] text-[#6b8274]">
                      {glycemicAnalysis.estimatedGI > 70 ? 'High GI' : glycemicAnalysis.estimatedGI > 55 ? 'Medium GI' : 'Low GI'}
                    </span>
                  </div>

                  <div className="bg-[#f0f5f2] p-3 rounded-[4px] text-center border border-[#e8efe9]">
                    <span className="block text-[9px] text-[#8ba797] uppercase">Glycemic Load</span>
                    <span className="font-serif text-[18px] text-[#1e4832] font-semibold">{Math.round(Number(glycemicAnalysis.glycemicLoad) || 0)}</span>
                    <span className="block text-[8px] text-[#6b8274]">
                      {glycemicAnalysis.glycemicLoad >= 20 ? 'High' : glycemicAnalysis.glycemicLoad >= 11 ? 'Moderate' : 'Low'}
                    </span>
                  </div>

                  <div className="bg-[#f0f5f2] p-3 rounded-[4px] text-center border border-[#e8efe9]">
                    <span className="block text-[9px] text-[#8ba797] uppercase">Estimated Peak</span>
                    <span className="font-serif text-[18px] text-[#1e4832] font-semibold">{Math.round(Number(glycemicAnalysis.peakGlucoseMgDl) || 0)}</span>
                    <span className="block text-[8px] text-[#6b8274]">mg/dL (~45 min)</span>
                  </div>

                  <div className="bg-[#f0f5f2] p-3 rounded-[4px] text-center border border-[#e8efe9]">
                    <span className="block text-[9px] text-[#8ba797] uppercase">Time to Baseline</span>
                    <span className="font-serif text-[18px] text-[#1e4832] font-semibold">{glycemicAnalysis.timeToBaselineMinutes}</span>
                    <span className="block text-[8px] text-[#6b8274]">Minutes</span>
                  </div>
                </div>

                {/* Interactive SVG Curve */}
                <div className="p-4 bg-[#f8faf9] rounded-[4px] border border-[#e8efe9] mb-4">
                  <GlycemicCurveChart analysis={glycemicAnalysis} />
                </div>

                {/* Glucose Hack Tip */}
                <div className="p-3.5 bg-[#f0f5f2] border border-[#c5d1c9] rounded-[4px] flex items-start gap-3">
                  <Lightbulb size={16} className="text-[#166534] shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-mono text-[11px] font-bold text-[#166534] uppercase tracking-wider mb-0.5">
                      Glucose Curve Flattening Hack
                    </h5>
                    <p className="font-mono text-[11px] text-[#1e4832] leading-relaxed">
                      {glycemicAnalysis.tipToReduceSpike}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            {/* Action Area (Moved up for Bento emphasis) */}
            <div className="bg-white rounded-[4px] border border-[#e8efe9] shadow-sm p-6 lg:p-8">
              {shouldShowLoggedState ? (
                <div className="flex flex-col items-center gap-4">
                  <p className="font-mono text-[12px] text-[#166534] text-center max-w-sm">
                    {isSafe && !isAlreadyLogged && logStatus !== 'success' 
                      ? "This meal was deemed safe and has been automatically logged." 
                      : "This meal has already been logged to your journal."}
                  </p>
                  <div className="w-full py-4 rounded-[4px] bg-[#f0f5f2] border border-[#c5d1c9] text-[#166534] font-mono font-bold text-[13px] flex justify-center items-center gap-2">
                    <CheckCircle className="w-5 h-5" weight="fill" />
                    {isSafe && !isAlreadyLogged && logStatus !== 'success' ? 'Automatically Logged' : 'Already Logged'}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <p className="font-mono text-[12px] text-[#6b8274] text-center max-w-sm">
                    {!isToday(new Date(scanRecord.created_at)) 
                      ? "This meal was scanned on a different day and cannot be logged to today's journal." 
                      : "This meal has flagged items. You can still log it manually if you choose to."}
                  </p>
                  <button 
                    onClick={handleManualLog}
                    disabled={logStatus !== 'idle' || !isToday(new Date(scanRecord.created_at))}
                    className="w-full py-4 rounded-[4px] bg-gradient-to-b from-[#88ba9d] to-[#173d26] border border-[#1a3825] text-white font-mono font-medium text-[13px] flex justify-center items-center gap-2 shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.3),_0_4px_12px_rgba(22,51,35,0.3)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {logStatus === 'logging' ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Logging...</>
                    ) : (
                      <><PlusCircle className="w-4 h-4" weight="bold" /> Log Anyway</>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Health Warnings */}
            {!isSafe && scanRecord.health_warnings?.length > 0 && (
              <div className="bg-white rounded-[4px] border border-[#e8efe9] shadow-sm p-6 lg:p-8">
                <div className="flex items-center gap-2 mb-5">
                  <Warning className="w-5 h-5 text-[#92400e]" weight="fill" />
                  <h3 className="font-serif text-[24px] text-[#1e4832]">Health Warnings</h3>
                </div>
                <div className="space-y-3">
                  {scanRecord.health_warnings.map((warning: any, idx: number) => (
                    <div key={idx} className="bg-[#fef3c7]/50 border border-[#fcd34d]/40 p-4 rounded-[4px]">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Info className="w-4 h-4 text-[#92400e]" weight="fill" />
                        <h4 className="font-serif text-[14px] text-[#92400e] font-medium">{warning.title || warning.type || 'Warning'}</h4>
                      </div>
                      <p className="text-[#6b8274] text-[12px] font-mono leading-relaxed pl-6">{warning.detail || warning.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nutritional Breakdown */}
            {(() => {
              const cal = Math.round(Number(scanRecord.total_calories) || 0);
              const prot = Math.round(Number(scanRecord.total_protein_g) || 0);
              const carb = Math.round(Number(scanRecord.total_carbs_g) || 0);
              const fat = Math.round(Number(scanRecord.total_fat_g) || 0);
              const fiber = Math.round(Number(scanRecord.total_fiber_g) || 0);
              const sugar = Math.round(Number(scanRecord.total_sugar_g) || 0);
              const sodium = Math.round(Number(scanRecord.total_sodium_mg) || 0);
              const netCarb = Math.max(0, carb - fiber);

              const protCal = prot * 4;
              const carbCal = carb * 4;
              const fatCal = fat * 9;
              const totalMacroCal = protCal + carbCal + fatCal;
              const protPct = totalMacroCal > 0 ? Math.round((protCal / totalMacroCal) * 100) : 0;
              const carbPct = totalMacroCal > 0 ? Math.round((carbCal / totalMacroCal) * 100) : 0;
              const fatPct = totalMacroCal > 0 ? Math.max(0, 100 - protPct - carbPct) : 0;

              return (
                <div className="bg-white rounded-[4px] border border-[#e8efe9] shadow-sm p-6 lg:p-8">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-serif text-[24px] text-[#1e4832]">Nutritional Breakdown</h3>
                    <span className="font-mono text-[10px] text-[#8ba797] uppercase tracking-wider bg-[#f0f5f2] px-2.5 py-1 rounded-[3px]">
                      Per Serving
                    </span>
                  </div>
                  
                  <div className="flex flex-col gap-6">
                    {/* Calorie Card with Stacked Macro Energy Distribution */}
                    <div className="flex flex-col items-center justify-center bg-[#1a3825] rounded-[4px] py-6 px-8 text-center relative overflow-hidden">
                      <span className="text-5xl font-serif text-white leading-none">{cal}</span>
                      <span className="font-mono text-[10px] text-[#8ba797] uppercase tracking-widest mt-2 mb-4">kcal</span>

                      {/* Stacked Energy Ratio Bar */}
                      <div className="w-full">
                        <div className="h-2 w-full bg-white/10 rounded-[3px] overflow-hidden flex">
                          <div style={{ width: `${protPct}%` }} className="bg-[#88ba9d] h-full" title={`Protein ${protPct}%`} />
                          <div style={{ width: `${carbPct}%` }} className="bg-[#5c8b71] h-full" title={`Carbs ${carbPct}%`} />
                          <div style={{ width: `${fatPct}%` }} className="bg-[#c5d1c9] h-full" title={`Fat ${fatPct}%`} />
                        </div>
                        <div className="flex justify-between items-center mt-2 font-mono text-[9px] text-white/70">
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#88ba9d]" /> {protPct}% P</span>
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#5c8b71]" /> {carbPct}% C</span>
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#c5d1c9]" /> {fatPct}% F</span>
                        </div>
                      </div>
                    </div>

                    {/* Macros Bars */}
                    <div className="space-y-4">
                      {[
                        { label: 'Protein', grams: prot, calories: protCal, pct: protPct, color: 'bg-[#1a3825]' },
                        { label: 'Carbs', grams: carb, calories: carbCal, pct: carbPct, color: 'bg-[#5c8b71]' },
                        { label: 'Fat', grams: fat, calories: fatCal, pct: fatPct, color: 'bg-[#a4b5aa]' },
                      ].map(macro => (
                        <div key={macro.label} className="flex flex-col gap-1.5">
                          <div className="flex justify-between font-mono text-[10px] text-[#6b8274] tracking-wider">
                            <span>{macro.label}</span>
                            <span className="text-[#1e4832] font-semibold">{macro.grams}G <span className="text-[#a4b5aa] font-normal">({macro.calories} kcal)</span></span>
                          </div>
                          <div className="h-1.5 w-full bg-[#e8efe9] overflow-hidden rounded-[4px]">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: macro.pct + '%' }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                              className={`h-full ${macro.color} rounded-[4px]`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Secondary Nutrients Bento (Fiber, Net Carbs, Sugar, Sodium) */}
                    <div className="grid grid-cols-2 gap-2.5 pt-4 border-t border-[#e8efe9]">
                      <div className="bg-[#f0f5f2] p-3 rounded-[4px] border border-[#e8efe9]">
                        <span className="block font-mono text-[9px] text-[#8ba797] uppercase tracking-wider mb-0.5">Dietary Fiber</span>
                        <span className="font-serif text-[18px] text-[#1e4832] font-semibold">{fiber}g</span>
                        <span className="block font-mono text-[8px] text-[#166534] mt-0.5">{fiber >= 4 ? 'Good source' : 'Low fiber'}</span>
                      </div>

                      <div className="bg-[#f0f5f2] p-3 rounded-[4px] border border-[#e8efe9]">
                        <span className="block font-mono text-[9px] text-[#8ba797] uppercase tracking-wider mb-0.5">Net Carbs</span>
                        <span className="font-serif text-[18px] text-[#1e4832] font-semibold">{netCarb}g</span>
                        <span className="block font-mono text-[8px] text-[#6b8274] mt-0.5">Digestible</span>
                      </div>

                      <div className="bg-[#f0f5f2] p-3 rounded-[4px] border border-[#e8efe9]">
                        <span className="block font-mono text-[9px] text-[#8ba797] uppercase tracking-wider mb-0.5">Total Sugars</span>
                        <span className="font-serif text-[18px] text-[#1e4832] font-semibold">{sugar}g</span>
                        <span className={`block font-mono text-[8px] mt-0.5 ${sugar > 15 ? 'text-[#1e4832] font-bold' : 'text-[#6b8274]'}`}>
                          {sugar > 15 ? 'High sugar' : sugar > 6 ? 'Moderate' : 'Low sugar'}
                        </span>
                      </div>

                      <div className="bg-[#f0f5f2] p-3 rounded-[4px] border border-[#e8efe9]">
                        <span className="block font-mono text-[9px] text-[#8ba797] uppercase tracking-wider mb-0.5">Sodium</span>
                        <span className="font-serif text-[18px] text-[#1e4832] font-semibold">{sodium}mg</span>
                        <span className={`block font-mono text-[8px] mt-0.5 ${sodium > 600 ? 'text-[#1e4832] font-bold' : 'text-[#6b8274]'}`}>
                          {sodium > 600 ? 'High sodium' : 'Moderate'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Daily Impact */}
            {scanRecord.raw_ai_response && (
              <div className="bg-white rounded-[4px] border border-[#e8efe9] shadow-sm p-6 lg:p-8">
                <h3 className="font-serif text-[24px] text-[#1e4832] mb-5">Daily Impact</h3>
                
                {(() => {
                  const impact = scanRecord.raw_ai_response;
                  const mealCals = Math.round(Number(scanRecord.total_calories) || 0);
                  const beforeCals = Math.round(Number(impact.caloriesConsumedBefore) || 0);
                  const remainingCals = Math.round(Number(impact.caloriesRemaining) || 0);
                  const target = beforeCals + (remainingCals < 0 ? mealCals + remainingCals : remainingCals + mealCals);
                  const dailyTarget = target || 2000;
                  const beforePct = Math.min(100, Math.round((beforeCals / dailyTarget) * 100));
                  const thisMealPct = Math.min(100 - beforePct, Math.round((mealCals / dailyTarget) * 100));
                  const totalAfter = Math.round(Number(impact.caloriesAfterThisMeal) || (beforeCals + mealCals));
                  const exceeded = impact.exceedsLimit;

                  return (
                    <div className="flex flex-col gap-4">
                      {/* Progress Bar */}
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between font-mono text-[10px] text-[#6b8274] uppercase tracking-wider">
                          <span>{totalAfter} / {dailyTarget} kcal</span>
                          <span className="text-[#1e4832] font-bold">
                            {exceeded ? 'Over Limit' : `${remainingCals} kcal left`}
                          </span>
                        </div>
                        <div className="h-3 w-full bg-[#e8efe9] overflow-hidden rounded-[4px] relative">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: beforePct + '%' }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            className="h-full bg-[#8ba797] absolute left-0 top-0"
                          />
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: thisMealPct + '%' }}
                            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                            className="h-full absolute top-0 bg-[#1a3825]"
                            style={{ left: beforePct + '%' }}
                          />
                        </div>
                        <div className="flex gap-4 font-mono text-[9px] text-[#8ba797]">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#8ba797]" />
                            Before ({beforeCals} kcal)
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#1a3825]" />
                            This Meal ({mealCals} kcal)
                          </div>
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="p-3 mt-2 rounded-[4px] border font-mono text-[11px] leading-relaxed bg-[#f0f5f2] border-[#c5d1c9] text-[#1e4832]">
                        {impact.summary}
                      </div>

                      {/* Percentage Badge */}
                      <div className="flex justify-center mt-2">
                        <div className="inline-flex items-center justify-center text-center gap-2 px-4 py-2 rounded-[4px] font-mono text-[11px] font-bold w-full bg-[#f0f5f2] text-[#1e4832] border border-[#c5d1c9]">
                          This meal is {Math.round(Number(impact.percentageOfDailyTarget) || 0)}% of your daily target
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}


          </div>
        </div>
      </div>

      {/* Image Modal */}
      {isImageModalOpen && scanRecord.image_url && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setIsImageModalOpen(false)}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative max-w-3xl max-h-[75vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsImageModalOpen(false)}
              className="absolute -top-12 right-0 p-2 text-white hover:text-gray-300 transition-colors bg-black/40 rounded-full"
            >
              <X size={24} weight="bold" />
            </button>
            <img 
              src={scanRecord.image_url} 
              alt="Full screen scan" 
              className="w-auto h-auto max-w-full max-h-[75vh] object-contain rounded-[4px] shadow-2xl"
            />
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
