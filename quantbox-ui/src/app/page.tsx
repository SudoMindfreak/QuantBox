'use client';

import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  ArrowRight,
  Shield,
  Zap,
  BrainCircuit,
  Workflow,
  Globe,
  BarChart3,
  Bot,
  Settings,
  ChevronRight,
  Terminal,
  Activity,
  Layers,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { SettingsModal } from '@/components/editor/SettingsModal';
import { Navbar } from '@/components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function HomePage() {
  const router = useRouter();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGetStarted = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-slate-200 selection:bg-emerald-500/30 font-sans overflow-x-hidden">
      
      {/* Background Pattern */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,#3ecf8e10_0%,transparent_50%)] opacity-100" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] brightness-100" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <Navbar isScrolled={isScrolled} onSettingsOpen={() => setIsSettingsOpen(true)} />

      {/* Hero Section */}
      <section className="relative z-10 pt-32 sm:pt-40 lg:pt-48 pb-20 lg:pb-32 container mx-auto px-6 sm:px-8 flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-4xl"
        >
          <div className="flex items-center justify-center gap-2 mb-6">
            <Badge className="bg-emerald-500/10 text-[#3ecf8e] border-emerald-500/20 py-1 px-3 text-[10px] sm:text-xs font-black tracking-widest uppercase">
              Now focused on 15m Up or Down Markets
            </Badge>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] mb-6 uppercase">
            Master Polymarket's <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500">15m Up or Down Markets.</span>
          </h1>
          
          <p className="text-base sm:text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10 font-medium">
            Deploy sophisticated AI agents trained on expert trading templates. 
            QuantBox transforms your logic into high-frequency prediction bots in seconds.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={handleGetStarted}
              className="w-full sm:w-auto bg-[#3ecf8e] text-black hover:bg-[#30b47b] px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-[0_0_30px_-5px_rgba(62,207,142,0.3)] active:scale-95"
            >
              Get Started for Free
              <ArrowRight className="w-4 h-4" />
            </button>
            <button 
              onClick={() => toast.info("Documentation coming soon")}
              className="w-full sm:w-auto bg-white/5 border border-white/10 hover:bg-white/10 px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all active:scale-95"
            >
              Read Docs
            </button>
          </div>
        </motion.div>

        {/* Visual Proof / Product Preview */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-16 lg:mt-24 w-full max-w-5xl relative group"
        >
          <div className="absolute -inset-1 bg-gradient-to-b from-emerald-500/10 to-transparent rounded-[32px] blur-2xl opacity-20" />
          <div className="relative bg-[#0a0a0a] border border-white/5 rounded-[32px] p-2 sm:p-4 shadow-2xl overflow-hidden aspect-[16/9] flex items-center justify-center">
             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05]" />
             <div className="flex flex-col items-center gap-4 opacity-30">
                <div className="p-4 sm:p-6 bg-emerald-500/5 rounded-full border border-emerald-500/10">
                   <Activity className="w-10 h-10 sm:w-16 sm:h-16 text-[#3ecf8e]" />
                </div>
                <div className="text-center px-4">
                   <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] text-white mb-2">Live Simulation Interface</p>
                   <p className="text-[8px] sm:text-[10px] font-mono italic text-slate-500 uppercase tracking-widest">Encrypted Data Stream Active</p>
                </div>
             </div>
             
             {/* Decorative UI elements */}
             <div className="absolute top-6 left-6 w-32 sm:w-48 h-20 sm:h-32 bg-white/[0.02] border border-white/5 rounded-xl p-3 sm:p-4 hidden md:block">
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                   <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500" />
                   <div className="w-10 h-1 sm:w-12 sm:h-1.5 bg-white/10 rounded-full" />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                   <div className="w-full h-0.5 sm:h-1 bg-white/5 rounded-full" />
                   <div className="w-2/3 h-0.5 sm:h-1 bg-white/5 rounded-full" />
                   <div className="w-3/4 h-0.5 sm:h-1 bg-white/5 rounded-full" />
                </div>
             </div>
             <div className="absolute bottom-6 right-6 w-40 sm:w-64 h-24 sm:h-40 bg-white/[0.02] border border-white/5 rounded-xl p-3 sm:p-4 hidden md:block">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                   <div className="w-12 h-1.5 sm:w-16 sm:h-2 bg-white/10 rounded-full" />
                   <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500" />
                </div>
                <div className="flex items-end gap-1 h-12 sm:h-16">
                   {[40, 70, 45, 90, 65, 80, 30, 50].map((h, i) => (
                      <div key={i} className="flex-1 bg-emerald-500/20 rounded-t-sm" style={{ height: `${h}%` }} />
                   ))}
                </div>
             </div>
          </div>
        </motion.div>
      </section>

      {/* How it Works / Feature Section */}
      <section className="relative z-10 py-20 lg:py-32 bg-black/20 border-y border-white/5">
        <div className="container mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16 max-w-6xl mx-auto text-center md:text-left">
            <div className="space-y-4 sm:space-y-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-[#3ecf8e] mx-auto md:mx-0">
                <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">1. Prompt Idea</h3>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                Describe your trading logic in plain English. Our AI is optimized specifically for Polymarket's unique 15m orderbook dynamics.
              </p>
            </div>
            <div className="space-y-4 sm:space-y-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-[#3ecf8e] mx-auto md:mx-0">
                <Cpu className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">2. Expert Coding</h3>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                The engine instantly generates a private, high-performance Python strategy using our proprietary high-yield templates.
              </p>
            </div>
            <div className="space-y-4 sm:space-y-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-[#3ecf8e] mx-auto md:mx-0">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">3. Live Simulation</h3>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                Test your agent in a sandbox environment with real-time Polymarket data. Monitor executions and PnL without risk.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section className="relative z-10 py-20 lg:py-32 container mx-auto px-6 sm:px-8">
        <div className="text-center mb-16 sm:mb-20 space-y-3 sm:space-y-4">
           <h2 className="text-[10px] sm:text-xs font-black text-[#3ecf8e] uppercase tracking-[0.4em]">Proprietary Engine</h2>
           <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-white uppercase tracking-tight leading-none">Built for Professional Traders.</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 max-w-6xl mx-auto">
            <BentoCard 
                icon={<Globe className="w-5 h-5 sm:w-6 sm:h-6" />}
                title="Direct Market Hooks"
                desc="Ultra-low latency connections to Polymarket and Binance WebSockets for precision entries."
                span="md:col-span-8"
            />
            <BentoCard 
                icon={<Shield className="w-5 h-5 sm:w-6 sm:h-6" />}
                title="Private Logic"
                desc="Your edge is yours alone. Strategy code is handled securely server-side, never exposed."
                span="md:col-span-4"
            />
            <BentoCard 
                icon={<BrainCircuit className="w-5 h-5 sm:w-6 sm:h-6" />}
                title="Autonomous Research"
                desc="Our specialized AI browses live API documentation to adapt to market updates instantly."
                span="md:col-span-4"
            />
            <BentoCard 
                icon={<BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />}
                title="Managed Infrastructure"
                desc="Scale simulations across multiple agents effortlessly. We handle the heavy lifting."
                span="md:col-span-8"
            />
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 py-32 lg:py-48 container mx-auto px-6 sm:px-8 text-center">
         <div className="max-w-3xl mx-auto bg-gradient-to-b from-emerald-500/10 to-transparent p-8 sm:p-12 lg:p-16 rounded-[32px] border border-emerald-500/20 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05]" />
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase tracking-tighter mb-8 leading-none">
               Initialize your first <br className="hidden sm:block" /> simulation today.
            </h2>
            <button 
              onClick={handleGetStarted}
              className="bg-white text-black hover:bg-[#3ecf8e] px-10 py-5 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs transition-all shadow-2xl active:scale-95"
            >
               Create Simulation
            </button>
         </div>
      </section>

      <footer className="relative z-10 py-12 lg:py-20 border-t border-white/5 container mx-auto px-6 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-8 opacity-50">
         <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-[#3ecf8e] text-black rounded-lg flex items-center justify-center">
               <span className="font-black text-sm">Q</span>
            </div>
            <span className="text-sm font-black tracking-tighter uppercase">QuantBox</span>
         </div>
         <div className="flex flex-wrap justify-center gap-6 sm:gap-12 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
            <a href="#" className="hover:text-white transition-colors">Term of use</a>
            <a href="#" className="hover:text-white transition-colors">Privacy policy</a>
            <a href="#" className="hover:text-white transition-colors">Credits</a>
         </div>
      </footer>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

function BentoCard({ icon, title, desc, span }: { icon: React.ReactNode, title: string, desc: string, span: string }) {
  return (
    <div className={`${span} bg-white/[0.02] border border-white/5 p-6 sm:p-10 rounded-[32px] hover:border-emerald-500/20 transition-all group overflow-hidden relative shadow-xl`}>
       <div className="absolute -right-8 -bottom-8 opacity-[0.02] group-hover:opacity-[0.08] transition-all duration-700">
          <div className="scale-[3]">
            {icon}
          </div>
       </div>
       <div className="mb-6 sm:mb-8 p-3 sm:p-4 bg-emerald-500/5 w-fit rounded-xl sm:rounded-2xl text-[#3ecf8e] group-hover:scale-110 group-hover:bg-emerald-500/10 transition-all">
          {icon}
       </div>
       <h3 className="text-lg sm:text-xl font-black text-white mb-3 sm:mb-4 tracking-tight uppercase">{title}</h3>
       <p className="text-slate-400 text-xs sm:text-sm leading-relaxed font-medium">{desc}</p>
    </div>
  );
}
