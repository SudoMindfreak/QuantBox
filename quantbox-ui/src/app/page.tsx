'use client';

import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Sparkles, 
  ArrowRight,
  Zap,
  Shield,
  Target,
  Terminal,
  Cpu,
  History,
  Settings
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { SettingsModal } from '@/components/editor/SettingsModal';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function HomePage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    // We can pass the initial prompt via query param or local storage
    localStorage.setItem('QB_INITIAL_PROMPT', prompt);
    router.push('/editor/new');
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-blue-500/30 font-sans">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />
      </div>

      {/* Navbar */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-[#020617]/80 backdrop-blur-md border-b border-white/5 py-3' : 'py-6'}`}>
        <div className="container mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                <span className="text-white font-black italic">Q</span>
             </div>
             <span className="text-lg font-black tracking-tighter text-white">QUANTBOX</span>
          </div>
          
          <div className="flex items-center gap-4">
             <button 
                onClick={() => router.push('/dashboard')}
                className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
             >
                Dashboard
             </button>
             <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 text-slate-400 hover:text-white transition-colors"
             >
                <Settings className="w-4 h-4" />
             </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 pt-32 pb-20 container mx-auto px-6 flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-3xl mb-12"
        >
          <Badge className="mb-6 bg-blue-500/10 text-blue-400 border-blue-500/20 py-1 px-3 text-[10px] font-black tracking-widest uppercase">
            QuantBox AI Engine v2.0
          </Badge>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-[0.9] mb-6">
            Prompt your strategy. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              Run the simulation.
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
            Build expert Polymarket trading bots in seconds. QuantBox transforms your natural language into secure, hosted Python strategies.
          </p>
        </motion.div>

        {/* The Bolt-style Prompt Box */}
        <motion.div 
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: 0.1 }}
           className="w-full max-w-2xl"
        >
          <form 
            onSubmit={handleStart}
            className="bg-[#0f172a] border border-white/10 p-2 rounded-2xl shadow-2xl shadow-blue-950/20 focus-within:border-blue-500/50 transition-all ring-1 ring-white/5"
          >
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your trading idea... (e.g. 'Scalp the BTC 15m market based on Binance spread spikes')"
                className="w-full bg-transparent border-none text-white placeholder:text-slate-600 resize-none p-4 pb-12 focus:ring-0 text-lg leading-relaxed min-h-[120px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleStart(e);
                  }
                }}
              />
              <div className="absolute bottom-2 right-2 flex items-center gap-2">
                 <button 
                  type="submit"
                  disabled={!prompt.trim()}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                 >
                    Initialize AI
                    <ArrowRight className="w-4 h-4" />
                 </button>
              </div>
            </div>
          </form>

          {/* Prompt Suggestions */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
             <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mr-2">Try:</span>
             {[
               "Volatility Hunter",
               "15m RSI Scalper",
               "Market Imbalance Bot",
               "Binance-to-Poly Arb"
             ].map((suggest) => (
               <button 
                  key={suggest}
                  onClick={() => setPrompt(`Build a ${suggest} strategy...`)}
                  className="px-3 py-1 bg-white/5 border border-white/5 rounded-full text-[10px] font-medium text-slate-400 hover:text-white hover:bg-white/10 transition-all"
               >
                 {suggest}
               </button>
             ))}
          </div>
        </motion.div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 w-full max-w-5xl">
           <FeatureCard 
              icon={<Sparkles className="w-5 h-5 text-blue-400" />}
              title="Natural Language"
              desc="No code required. Just describe your conditions and let our AI handle the Python logic."
           />
           <FeatureCard 
              icon={<Terminal className="w-5 h-5 text-purple-400" />}
              title="Hosted Simulation"
              desc="Every strategy runs in an isolated container with real-time logging and virtual P&L tracking."
           />
           <FeatureCard 
              icon={<Shield className="w-5 h-5 text-emerald-400" />}
              title="Private Logic"
              desc="Your strategy code is never exposed to the browser. Your business intelligence stays on our server."
           />
        </div>
      </main>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl hover:border-white/10 transition-all group">
       <div className="mb-4 p-2 bg-white/5 w-fit rounded-lg group-hover:scale-110 transition-transform">
          {icon}
       </div>
       <h3 className="text-white font-bold mb-2 tracking-tight">{title}</h3>
       <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}