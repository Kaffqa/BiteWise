import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/Skeleton';
import AuthModal from '@/components/auth/AuthModal';
import BrandLogo from '@/components/ui/BrandLogo';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const [scrolled, setScrolled] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState('home');
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navLinks = [
    { id: 'home', label: t.landing.nav.home },
    { id: 'problem', label: t.landing.nav.problem },
    { id: 'how-it-works', label: t.landing.nav.howItWorks },
    { id: 'features', label: t.landing.nav.features },
    { id: 'who-its-for', label: t.landing.nav.whoItsFor },
  ];

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      const sections = ['home', 'problem', 'how-it-works', 'features', 'who-its-for'];
      const scrollPos = window.scrollY + 200; // Offset for header

      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]);
        if (el && scrollPos >= el.offsetTop) {
          setActiveSection(sections[i]);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  React.useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Loading state with Landing Page Skeleton
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F6F4EB] md:bg-white p-2 md:p-4">
        <header className="w-full px-5 md:px-6 lg:px-12 py-3 md:py-4 flex justify-between items-center bg-white rounded-[32px] md:rounded-t-[32px] shadow-sm border border-[#e8efe9] md:border-transparent">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 md:w-11 md:h-11 rounded-full bg-[#d5e0d8]" />
            <Skeleton className="w-24 h-6 md:h-8 bg-[#d5e0d8]" />
          </div>
          <div className="hidden md:flex items-center gap-8">
            <div className="flex gap-6">
              {[1, 2, 3].map(i => <Skeleton key={i} className="w-20 h-4 bg-[#d5e0d8]" />)}
            </div>
            <Skeleton className="w-32 h-10 rounded-full bg-[#d5e0d8]" />
          </div>
        </header>

        <main className="flex-1 bg-[#F6F4EB] w-full flex flex-col pt-12 pb-16 px-6 lg:px-12">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-12 w-full">
            <div className="lg:w-[50%]">
              <Skeleton className="w-24 h-4 mb-6 bg-[#d5e0d8]" />
              <Skeleton className="w-full h-16 md:h-24 bg-[#d5e0d8] mb-4" />
              <Skeleton className="w-3/4 h-16 md:h-24 bg-[#d5e0d8]" />
            </div>
            
            <div className="lg:w-[50%] flex flex-col items-start lg:items-end pt-2 lg:pt-[72px] w-full">
              <Skeleton className="w-full md:w-64 h-20 mb-10 bg-[#d5e0d8]" />
              <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                <Skeleton className="w-full md:w-48 h-12 rounded-full bg-[#d5e0d8]" />
                <Skeleton className="w-full md:w-40 h-12 rounded-full bg-[#d5e0d8]" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // If already logged in, redirect to the app dashboard
  if (user) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div id="home" className="min-h-screen flex flex-col font-sans selection:bg-[#163323] selection:text-white bg-[#F6F4EB] md:bg-white p-2 md:p-4 overflow-x-hidden">
      {/* Navbar */}
      <header className={`w-full px-5 md:px-6 lg:px-12 py-3 md:py-4 flex justify-between items-center sticky top-2 md:top-4 z-[60] transition-all duration-300 ${
        isMobileMenuOpen 
          ? 'bg-white rounded-[8px] border border-[#e8efe9]' 
          : scrolled 
            ? 'bg-white/95 backdrop-blur rounded-[8px] shadow-md border border-[#e8efe9]' 
            : 'bg-white rounded-t-[32px] shadow-sm border border-[#e8efe9] md:border-transparent'
      }`}>
          <div className="flex items-center gap-3 relative z-[60] shrink-0">
            {/* Logo Icon */}
            <BrandLogo className="w-8 h-8 md:w-9 md:h-9 object-contain" />
            <span className="font-sans text-[20px] md:text-[22px] font-black tracking-tight text-[#163323]">BiteWise</span>
          </div>
          
          <button 
            className="flex lg:hidden items-center justify-center p-2 -mr-2 relative z-[60] text-[#163323] transition-transform active:scale-95"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={t.landing.toggleMenuAria}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <div className="hidden lg:flex items-center gap-8">
            <nav className="flex items-center gap-6">
              {navLinks.map(link => (
                <a 
                  key={link.id}
                  href={`#${link.id}`} 
                  className={`text-[13px] font-mono whitespace-nowrap transition-colors ${activeSection === link.id ? 'font-bold text-[#163323]' : 'font-medium text-gray-500 hover:text-[#163323]'}`}
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <button onClick={() => setIsAuthModalOpen(true)} className="bg-gradient-to-b from-[#5c8263] to-[#2a4e35] hover:from-[#4e7255] hover:to-[#21422b] text-white px-7 py-[11px] rounded-full text-[12px] font-mono shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.45),_0_6px_12px_rgba(22,51,35,0.3)] border-[2.5px] border-[#1a3825] transition-all flex items-center justify-center font-medium tracking-wide whitespace-nowrap">
              {t.landing.nav.getStarted}
            </button>
          </div>
      </header>
      
      {/* Mobile / Tablet Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[55] bg-white/95 backdrop-blur-md pt-[100px] px-6 flex flex-col lg:hidden overflow-y-auto pb-10"
          >
            <nav className="flex flex-col mt-4">
              {navLinks.map((link, idx) => (
                <motion.a 
                  key={link.id}
                  href={`#${link.id}`} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 + 0.1 }}
                  className={`text-[28px] font-serif py-4 border-b border-[#163323]/10 transition-colors ${activeSection === link.id ? 'font-bold text-[#163323]' : 'text-[#163323]/60 hover:text-[#163323]'}`}
                >
                  {link.label}
                </motion.a>
              ))}
            </nav>
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-10 w-full"
            >
              <button 
                onClick={() => { setIsMobileMenuOpen(false); setIsAuthModalOpen(true); }} 
                className="w-full bg-gradient-to-b from-[#5c8263] to-[#2a4e35] hover:from-[#4e7255] hover:to-[#21422b] text-white py-[15px] rounded-full text-[14px] font-mono shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.45),_0_6px_12px_rgba(22,51,35,0.3)] border-[2.5px] border-[#1a3825] transition-all flex items-center justify-center font-medium tracking-wide"
              >
                {t.landing.nav.getStarted}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section (Desktop) */}
      <main className="hidden md:flex flex-1 bg-[#F6F4EB] w-full relative z-10 flex-col pt-12 pb-16">
        
        {/* Top part of Hero (Padded) */}
        <div className="flex flex-col lg:flex-row justify-between items-start gap-12 mb-10 px-6 lg:px-12 w-full">
          <div className="lg:w-[50%]">
            <div className="text-gray-400 font-mono text-sm mb-6">
              {t.landing.hero.eyebrow}
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-[85px] font-serif text-[#163323] leading-[1.05] tracking-tight">
              {t.landing.hero.titleLine1} <br />
              {t.landing.hero.titleLine2Before}<span className="italic font-light">{t.landing.hero.titleLine2Italic}</span>{t.landing.hero.titleLine2After}
            </h1>
          </div>
          
          <div className="lg:w-[50%] flex flex-col items-start lg:items-end text-left lg:text-right pt-2 lg:pt-[72px]">
            <p className="text-[14px] md:text-[15px] font-mono text-gray-700 max-w-[420px] mb-10 leading-relaxed text-right">
              {t.landing.hero.subtitleLine1} <br className="hidden lg:block"/>
              {t.landing.hero.subtitleLine2} <br className="hidden lg:block"/>
              {t.landing.hero.subtitleLine3}
            </p>
            <div className="flex flex-wrap items-center justify-end gap-4 w-full">
              <button onClick={() => setIsAuthModalOpen(true)} className="bg-gradient-to-b from-[#5c8263] to-[#2a4e35] hover:from-[#4e7255] hover:to-[#21422b] text-white px-8 py-[13px] rounded-full text-[13px] font-mono shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.45),_0_6px_12px_rgba(22,51,35,0.3)] border-[2.5px] border-[#1a3825] transition-all flex items-center justify-center font-medium tracking-wide">
                {t.landing.hero.startScanning}
              </button>
              <a href="#how-it-works" className="border-[1.5px] border-[#9fb3a5] text-[#163323] bg-transparent hover:bg-white/40 px-8 py-[13px] rounded-full text-[13px] font-mono font-medium transition-colors">
                {t.landing.hero.seeHowItWorks}
              </a>
            </div>
          </div>
        </div>

        {/* Bottom part of Hero (Image bleeds left, Stats padded right) */}
        <div className="flex flex-col lg:flex-row justify-between items-end w-full">
          {/* Image Bleeding to the Left */}
          <div className="lg:w-[53%] w-full h-[320px] md:h-[380px] overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1547592180-85f173990554?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" 
              alt={t.landing.hero.imgAlt} 
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Stats on the Right */}
          <div className="lg:w-[47%] w-full flex justify-between items-end pb-4 px-6 lg:px-12 mt-12 lg:mt-0">
             <div className="flex flex-col">
                <h3 className="text-4xl md:text-[52px] font-serif text-[#163323] mb-4 leading-none">10K<span className="text-3xl md:text-4xl">+</span></h3>
                <p className="text-[12px] md:text-[13px] font-mono text-[#163323] leading-snug whitespace-nowrap">{t.landing.hero.stat1Label}</p>
             </div>
             <div className="flex flex-col">
                <h3 className="text-4xl md:text-[52px] font-serif text-[#163323] mb-4 leading-none">98%</h3>
                <p className="text-[12px] md:text-[13px] font-mono text-[#163323] leading-snug whitespace-nowrap">{t.landing.hero.stat2Label}</p>
             </div>
             <div className="flex flex-col">
                <h3 className="text-4xl md:text-[52px] font-serif text-[#163323] mb-4 leading-none">3s</h3>
                <p className="text-[12px] md:text-[13px] font-mono text-[#163323] leading-snug whitespace-nowrap">{t.landing.hero.stat3Label}</p>
             </div>
          </div>
        </div>
      </main>

      {/* Hero Section (Mobile) */}
      <main className="flex md:hidden flex-1 bg-[#F6F4EB] w-full relative z-10 flex-col pt-8 pb-10">
        <div className="px-6 flex flex-col gap-5">
           {/* Heading */}
           <div>
             <div className="text-[#a4b5aa] font-mono text-[11px] mb-4">
               {t.landing.hero.eyebrow}
             </div>
             <h1 className="text-[44px] font-serif text-[#163323] leading-[1.02] tracking-tight">
               {t.landing.hero.titleLine1} <br />
               {t.landing.hero.titleLine2Before}<span className="italic font-light">{t.landing.hero.titleLine2Italic}</span>{t.landing.hero.titleLine2After}
             </h1>
           </div>
           
           {/* Subheading */}
           <p className="text-[12px] font-mono text-[#163323]/80 leading-relaxed">
             {t.landing.hero.subtitleMobile}
           </p>
        </div>

        {/* Image (full width bleeding) */}
        <div className="w-full h-[240px] overflow-hidden my-8">
          <img 
            src="https://images.unsplash.com/photo-1547592180-85f173990554?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" 
            alt={t.landing.hero.imgAlt} 
            className="w-full h-full object-cover"
          />
        </div>

        {/* Stats */}
        <div className="px-6 flex items-start justify-between gap-2 mb-10 w-full">
           <div className="flex flex-col">
              <h3 className="text-[28px] font-serif text-[#163323] mb-2 leading-none">10K<span className="text-xl">+</span></h3>
              <p className="text-[9px] font-mono text-[#163323]/80 leading-relaxed">{t.landing.hero.stat1MobileLine1}<br/>{t.landing.hero.stat1MobileLine2}</p>
           </div>
           <div className="flex flex-col">
              <h3 className="text-[28px] font-serif text-[#163323] mb-2 leading-none">3s</h3>
              <p className="text-[9px] font-mono text-[#163323]/80 leading-relaxed">{t.landing.hero.stat3MobileLine1}<br/>{t.landing.hero.stat3MobileLine2}</p>
           </div>
           <div className="flex flex-col">
              <h3 className="text-[28px] font-serif text-[#163323] mb-2 leading-none">98%</h3>
              <p className="text-[9px] font-mono text-[#163323]/80 leading-relaxed">{t.landing.hero.stat2MobileLine1}<br/>{t.landing.hero.stat2MobileLine2}</p>
           </div>
        </div>

        {/* Buttons */}
        <div className="px-6 flex items-center justify-between gap-2.5 w-full">
           <button onClick={() => setIsAuthModalOpen(true)} className="w-[55%] bg-gradient-to-b from-[#5c8263] to-[#2a4e35] text-white py-[13px] px-2 rounded-full text-[10px] font-mono shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.45),_0_6px_12px_rgba(22,51,35,0.3)] border-[2.5px] border-[#1a3825] transition-all flex items-center justify-center font-medium tracking-wide whitespace-nowrap">
             {t.landing.hero.startScanning}
           </button>
           <a href="#how-it-works" className="w-[45%] border-[1.5px] border-[#9fb3a5] text-[#163323] bg-transparent py-[13px] px-2 rounded-full text-[10px] font-mono font-medium flex items-center justify-center transition-colors whitespace-nowrap">
             {t.landing.hero.seeHowItWorks}
           </a>
        </div>
      </main>

      {/* Problem Section (Desktop) */}
      <section id="problem" className="hidden md:flex w-full bg-white relative z-10 flex-col pt-20 pb-20">
        
        {/* Top text part */}
        <div className="flex flex-col lg:flex-row justify-between items-start gap-12 mb-16 px-6 lg:px-12 w-full">
          <div className="lg:w-[50%]">
            <div className="text-gray-400 font-mono text-sm mb-6">
              {t.landing.problem.eyebrow}
            </div>
            <h2 className="text-5xl md:text-[68px] font-serif text-[#163323] leading-[1.05] tracking-tight">
              {t.landing.problem.titleLine1} <br />
              {t.landing.problem.titleLine2}
            </h2>
          </div>
          
          <div className="lg:w-[50%] flex flex-col items-start lg:items-end text-left lg:text-right pt-2 lg:pt-[72px]">
            <p className="text-[14px] md:text-[15px] font-mono text-[#163323] max-w-[500px] leading-relaxed text-right">
              {t.landing.problem.subtitleLine1} <br className="hidden lg:block"/>
              {t.landing.problem.subtitleLine2} <br className="hidden lg:block"/>
              {t.landing.problem.subtitleLine3}
            </p>
          </div>
        </div>

        {/* Bottom part (List & Image) */}
        <div className="flex flex-col lg:flex-row justify-between items-end w-full">
          {/* List on the Left */}
          <div className="lg:w-[47%] w-full px-6 lg:px-12 mb-12 lg:mb-0">
             <ul className="flex flex-col gap-4 md:gap-6">
               {t.landing.problem.bullets.map((item, idx) => (
                 <li key={idx} className="flex items-center gap-5">
                   <div className="w-[14px] h-[14px] rounded-full bg-[#f3cf98] shrink-0"></div>
                   <span className="text-[26px] md:text-[34px] font-serif text-[#163323] tracking-tight">{item}</span>
                 </li>
               ))}
             </ul>
          </div>
          
          {/* Image Bleeding to the Right */}
          <div className="lg:w-[53%] w-full h-[320px] md:h-[380px] overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1578916171728-46686eac8d58?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" 
              alt={t.landing.problem.imgAltDesktop} 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Problem Section (Mobile) */}
      <section id="problem-mobile" className="flex md:hidden w-full bg-white relative z-10 flex-col pt-12 pb-16">
        
        {/* Texts */}
        <div className="px-6 flex flex-col gap-4">
           <div>
             <div className="text-[#a4b5aa] font-mono text-[11px] mb-4 uppercase tracking-widest">
               {t.landing.problem.eyebrow}
             </div>
             <h2 className="text-[44px] font-serif text-[#163323] leading-[1.02] tracking-tight pr-4">
               {t.landing.problem.mobileTitleLine1}<br/>{t.landing.problem.mobileTitleLine2}
             </h2>
           </div>
           
           <p className="text-[12px] font-mono text-[#163323]/90 leading-relaxed mt-2 text-left pr-4">
             {t.landing.problem.subtitleMobile}
           </p>
        </div>

        {/* Image */}
        <div className="px-6 w-full h-[220px] my-10">
          <img 
            src="https://images.unsplash.com/photo-1578916171728-46686eac8d58?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" 
            alt={t.landing.problem.imgAltMobile} 
            className="w-full h-full object-cover rounded-[4px]"
          />
        </div>

        {/* List */}
        <div className="px-6 w-full">
           <ul className="flex flex-col gap-6">
             {t.landing.problem.bullets.map((item, idx) => (
               <li key={idx} className="flex items-center gap-4">
                 <div className="w-[8px] h-[8px] rounded-full bg-[#f3cf98] shrink-0 mt-1"></div>
                 <span className="text-[20px] font-serif text-[#163323] leading-tight tracking-tight">{item}</span>
               </li>
             ))}
           </ul>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="w-full bg-[#163323] relative z-10 flex flex-col pt-16 pb-20">
        
        {/* Top text part */}
        <div className="flex flex-col mb-16 px-6 lg:px-12 w-full">
          <div className="text-[#F6F4EB]/60 font-mono text-[11px] mb-4 uppercase tracking-widest">
            {t.landing.howItWorks.eyebrow}
          </div>
          <h2 className="text-[44px] md:text-[68px] font-serif text-[#F6F4EB] leading-[1.02] tracking-tight max-w-[900px]">
            {t.landing.howItWorks.titleLine1} <br className="md:hidden"/>{t.landing.howItWorks.titleLine2}
          </h2>
        </div>

        {/* Steps List */}
        <div className="flex flex-col px-6 lg:px-12 w-full gap-12 md:gap-14">
          {t.landing.howItWorks.steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-4 md:gap-8 w-full overflow-hidden">
              {/* Big Italic Number */}
              <div className="text-[96px] md:text-[100px] font-serif italic text-[#F6F4EB] leading-[0.7] shrink-0 w-[110px] md:w-[110px] pt-1">
                {step.num}
              </div>
              
              {/* Title & Desc with underline */}
              <div className="flex flex-col w-full max-w-full">
                <div className="w-full border-b border-[#F6F4EB]/40 pb-3 mb-3">
                  <h3 className="text-[24px] md:text-[36px] font-serif text-[#F6F4EB] leading-none tracking-tight">
                    {step.title}
                  </h3>
                </div>
                <p className="text-[11px] md:text-[13.5px] font-mono text-[#F6F4EB]/70 leading-relaxed pr-2">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="w-full bg-white relative z-10 flex flex-col pt-16 md:pt-20 pb-16 md:pb-20">
        
        {/* Top text part & Button */}
        <div className="flex flex-col lg:flex-row justify-between items-center lg:items-end gap-6 md:gap-12 mb-10 md:mb-16 px-6 lg:px-12 w-full text-center lg:text-left">
          <div className="lg:w-[50%] flex flex-col items-center lg:items-start">
            <div className="text-gray-400 font-mono text-[11px] md:text-sm mb-4 md:mb-6 uppercase tracking-widest md:normal-case md:tracking-normal">
              {t.landing.features.eyebrow}
            </div>
            <h2 className="text-[44px] md:text-[68px] font-serif text-[#163323] leading-[1.02] md:leading-[1.05] tracking-tight">
              {t.landing.features.titleLine1} <br />
              {t.landing.features.titleLine2}
            </h2>
          </div>
          
          <div className="lg:w-[50%] w-full flex justify-center lg:justify-end pb-0 md:pb-3 mt-2 md:mt-0">
            {/* Desktop Button */}
            <button onClick={() => setIsAuthModalOpen(true)} className="hidden md:flex bg-gradient-to-b from-[#5c8263] to-[#2a4e35] hover:from-[#4e7255] hover:to-[#21422b] text-white px-8 py-[13px] rounded-full text-[13px] font-mono shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.45),_0_6px_12px_rgba(22,51,35,0.3)] border-[2.5px] border-[#1a3825] transition-all items-center justify-center font-medium tracking-wide">
              {t.landing.features.seeAllFeatures}
            </button>
            {/* Mobile Button */}
            <button onClick={() => setIsAuthModalOpen(true)} className="flex md:hidden w-[95%] bg-gradient-to-b from-[#5c8263] to-[#2a4e35] text-white py-[15px] rounded-full text-[14px] font-mono shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.45),_0_6px_12px_rgba(22,51,35,0.3)] border-[2.5px] border-[#1a3825] transition-all items-center justify-center font-medium tracking-wide">
              {t.landing.features.startScanning}
            </button>
          </div>
        </div>

        {/* Features Grid (Desktop) / Horizontal Scroll (Mobile) */}
        <div className="px-0 md:px-6 lg:px-12 w-full overflow-hidden">
          <div className="flex md:grid overflow-x-auto md:overflow-visible md:grid-cols-2 gap-4 md:gap-6 w-full snap-x snap-mandatory px-6 md:px-0 pb-6 md:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {t.landing.features.items.map((feature, idx) => (
              <div key={idx} className="bg-[#F6F4EB] shrink-0 w-[85vw] md:w-auto snap-center px-8 py-10 md:px-10 md:py-10 flex flex-col gap-10 md:gap-16">
                <h3 className="text-[32px] md:text-[34px] font-serif text-[#163323] leading-[1.1] tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-[12px] md:text-[13.5px] font-mono text-[#163323]/80 leading-relaxed tracking-wide mt-auto">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Target Audience Section */}
      <section id="who-its-for" className="w-full bg-[#F6F4EB] relative z-10 flex flex-col pt-20 pb-20 items-center">
        
        {/* Top text part (Centered) */}
        <div className="flex flex-col items-center text-center mb-10 md:mb-16 px-6 lg:px-12 w-full">
          <div className="text-gray-400 font-mono text-[11px] md:text-sm mb-4 md:mb-6 uppercase tracking-widest md:normal-case md:tracking-normal">
            {t.landing.whoItsFor.eyebrow}
          </div>
          <h2 className="text-[28px] min-[400px]:text-[32px] md:text-[68px] font-serif text-[#163323] leading-[1.05] tracking-tight whitespace-nowrap md:whitespace-normal">
            {t.landing.whoItsFor.title}
          </h2>
        </div>

        {/* Bento Grid */}
        <div className="px-6 lg:px-12 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            
            {/* Card 1: Text Top, Image Bottom */}
            <div className="bg-white p-6 md:p-8 flex flex-col gap-6 aspect-auto min-h-[450px] md:aspect-square">
              <div className="flex flex-col">
                <h3 className="text-[28px] md:text-[34px] font-serif text-[#163323] mb-4">{t.landing.whoItsFor.cards[0].title}</h3>
                <p className="text-[12px] md:text-[13px] font-mono text-[#163323]/80 leading-relaxed tracking-wide">
                  {t.landing.whoItsFor.cards[0].desc}
                </p>
              </div>
              <div className="flex-1 w-full overflow-hidden">
                <img src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt={t.landing.whoItsFor.cards[0].imgAlt} className="w-full h-full object-cover" />
              </div>
            </div>

            {/* Card 2: Image Top, Text Bottom */}
            <div className="bg-white p-6 md:p-8 flex flex-col gap-6 aspect-auto min-h-[450px] md:aspect-square">
              <div className="flex-1 w-full overflow-hidden">
                <img src="https://images.unsplash.com/photo-1512428559087-560fa5ceab42?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt={t.landing.whoItsFor.cards[1].imgAlt} className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-[28px] md:text-[34px] font-serif text-[#163323] mb-4">{t.landing.whoItsFor.cards[1].title}</h3>
                <p className="text-[12px] md:text-[13px] font-mono text-[#163323]/80 leading-relaxed tracking-wide">
                  {t.landing.whoItsFor.cards[1].desc}
                </p>
              </div>
            </div>

            {/* Card 3: Text Top, Image Bottom */}
            <div className="bg-white p-6 md:p-8 flex flex-col gap-6 aspect-auto min-h-[450px] md:aspect-square">
              <div className="flex flex-col">
                <h3 className="text-[28px] md:text-[34px] font-serif text-[#163323] mb-4">{t.landing.whoItsFor.cards[2].title}</h3>
                <p className="text-[12px] md:text-[13px] font-mono text-[#163323]/80 leading-relaxed tracking-wide">
                  {t.landing.whoItsFor.cards[2].desc}
                </p>
              </div>
              <div className="flex-1 w-full overflow-hidden">
                <img src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt={t.landing.whoItsFor.cards[2].imgAlt} className="w-full h-full object-cover" />
              </div>
            </div>

            {/* Card 4: Image Top, Text Bottom */}
            <div className="bg-white p-6 md:p-8 flex flex-col gap-6 aspect-auto min-h-[450px] md:aspect-square">
              <div className="flex-1 w-full overflow-hidden">
                <img src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt={t.landing.whoItsFor.cards[3].imgAlt} className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-[28px] md:text-[34px] font-serif text-[#163323] mb-4">{t.landing.whoItsFor.cards[3].title}</h3>
                <p className="text-[12px] md:text-[13px] font-mono text-[#163323]/80 leading-relaxed tracking-wide">
                  {t.landing.whoItsFor.cards[3].desc}
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full bg-[#F6F4EB] relative z-10 flex flex-col items-center pt-8 pb-10 px-4 md:px-4 lg:px-8">
        <div className="w-full max-w-[1400px] bg-[#163323] py-14 px-6 md:px-8 flex flex-col items-center text-center">
          <div className="text-[#F6F4EB]/60 font-mono text-[11px] md:text-sm mb-4 uppercase tracking-widest md:normal-case md:tracking-normal">
            {t.landing.cta.eyebrow}
          </div>
          <h2 className="text-[36px] md:text-[56px] lg:text-[68px] font-serif text-[#F6F4EB] leading-[1.05] tracking-tight mb-6 w-full">
            {t.landing.cta.titleLine1} <br className="md:hidden"/>{t.landing.cta.titleLine2}
          </h2>
          <p className="text-[11px] md:text-[14px] font-mono text-[#F6F4EB]/80 leading-relaxed tracking-wide max-w-[500px] mb-10 px-2">
            {t.landing.cta.subtitle}
          </p>
          <button onClick={() => setIsAuthModalOpen(true)} className="w-[95%] md:w-auto bg-gradient-to-b from-[#5c8263] to-[#2a4e35] hover:from-[#4e7255] hover:to-[#21422b] text-white px-8 py-[15px] md:py-[13px] rounded-full text-[13px] font-mono shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.45),_0_6px_12px_rgba(22,51,35,0.3)] border-[2.5px] border-[#1a3825] transition-all flex items-center justify-center font-medium tracking-wide">
            {t.landing.cta.createAccount}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-white rounded-[8px] md:rounded-b-[32px] md:rounded-t-none border-t border-[#163323]/10 px-6 lg:px-12 py-10 flex flex-col md:flex-row justify-center md:justify-between items-center gap-6 md:gap-6 mt-0">
        <div className="flex items-center gap-3">
          <BrandLogo className="w-9 h-9 object-contain" />
          <span className="text-[22px] font-bold text-[#163323] tracking-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>BiteWise</span>
        </div>
        <div className="text-[11px] md:text-[13px] font-mono text-[#163323]/70 tracking-wide text-center">
          {t.landing.footer.copyright}
        </div>
      </footer>
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        defaultView="signup"
      />
    </div>
  );
}
