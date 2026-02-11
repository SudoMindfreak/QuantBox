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
  Loader2
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { SettingsModal } from '@/components/editor/SettingsModal';
import { Navbar } from '@/components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { generateStrategy } from '@/lib/llm';

export default function HomePage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  const loadingSteps = [
    "Scanning Polymarket CLOB...",
    "Aligning with Strike Price dynamics...",
    "Injecting expert Python logic...",
    "Optimizing for 15m high-frequency execution...",
    "Finalizing private agent environment..."
  ];

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingSteps.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setLoadingStep(0);

    try {
      const result = await generateStrategy(prompt, "BTC-15m-Expert-Context");
      const pythonCode = typeof result === 'string' ? result : null;

      if (!pythonCode) throw new Error("AI Engine offline.");

      const payload = {
        name: prompt.slice(0, 30) + "...",
        initialBalance: 1000,
        pythonCode: pythonCode,
        marketSlug: 'btc-updown-15m-1770311700',
        status: 'draft'
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/strategies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      if (data.id) router.push(`/editor/${data.id}`);
    } catch (error: any) {
      toast.error(error.message);
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-slate-200 selection:bg-emerald-500/30 font-sans overflow-x-hidden">
      
      <AnimatePresence>
        {isGenerating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#1c1c1c] flex flex-col items-center justify-center p-6"
          >
            <div className="w-full max-w-lg text-center">
                <div className="flex flex-col items-center mb-12">
                    <div className="w-20 h-20 bg-emerald-600/10 rounded-[30px] border border-emerald-500/20 flex items-center justify-center mb-6 shadow-[0_0_50px_-12px_rgba(62,207,142,0.5)]">
                        <BrainCircuit className="w-10 h-10 text-[#3ecf8e] animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Initializing Expert</h2>
                    <p className="text-slate-400 text-sm mt-2 font-medium uppercase tracking-widest">QuantBox AI Engine v2.5</p>
                </div>
                
                <div className="space-y-6">
                    <div className="relative h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 12, ease: "easeInOut" }}
                            className="absolute inset-y-0 left-0 bg-[#3ecf8e] shadow-[0_0_20px_rgba(62,207,142,0.8)]"
                        />
                    </div>
                    <div className="flex justify-between items-center px-1">
                        <AnimatePresence mode="wait">
                            <motion.span 
                                key={loadingStep}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-xs font-mono text-[#3ecf8e] uppercase tracking-widest"
                            >
                                {loadingSteps[loadingStep]}
                            </motion.span>
                        </AnimatePresence>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Managed Core</span>
                    </div>
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden text-emerald-500/5">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-600/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/5 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <Navbar isScrolled={isScrolled} onSettingsOpen={() => setIsSettingsOpen(true)} />

      <main className="relative z-10 pt-44 pb-32 container mx-auto px-8">
        <div className="flex flex-col items-center text-center mb-20">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/20 mb-8 backdrop-blur-md"
            >
                <div className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e] animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3ecf8e]">Next-Gen Prediction Engine</span>
            </motion.div>

            <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-[1.1] mb-10 uppercase"
            >
                Elite algorithmic <br /> 
                <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500">trading, for all.</span>
            </motion.h1>

            <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-lg text-slate-200 max-w-2xl mx-auto leading-relaxed font-medium"
            >
                QuantBox is a trained AI ecosystem specialized in Polymarket high-frequency cycles. 
                Describe your logic, and our engine builds a private, expert-grade Python bot.
            </motion.p>
        </div>

        <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-4xl mx-auto relative group px-4"
        >
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-[40px] blur opacity-10 group-focus-within:opacity-30 transition duration-1000" />
            
            <form 
                onSubmit={handleStart}
                className="relative bg-[#232323] border border-white/5 rounded-[35px] p-3 shadow-2xl overflow-hidden backdrop-blur-xl transition-all focus-within:bg-[#282828]"
            >
                <textarea
                    disabled={isGenerating}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe your market logic..."
                    className="w-full bg-transparent border-none text-white placeholder:text-slate-600 resize-none p-8 focus:ring-0 text-lg font-medium min-h-[100px] selection:bg-emerald-500/20 outline-none"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleStart(e);
                        }
                    }}
                />
                
                <div className="flex items-center justify-between px-6 pb-4">
                    <div className="flex items-center gap-4 text-slate-400">
                        <div className="flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5 text-[#3ecf8e]" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#3ecf8e]">15m Focus</span>
                        </div>
                        <div className="w-px h-3 bg-white/10" />
                        <div className="flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest">
                            <Shield className="w-3.5 h-3.5" />
                            <span>Private Logic</span>
                        </div>
                    </div>

                    <button 
                        type="submit"
                        disabled={!prompt.trim() || isGenerating}
                        className="bg-[#3ecf8e] text-black hover:bg-[#30b47b] disabled:opacity-50 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all active:scale-95 shadow-xl"
                    >
                        Create Simulation
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </form>
        </motion.div>

        <div className="mt-40 grid grid-cols-1 md:grid-cols-2 gap-12 w-full max-w-6xl px-4">
           <div className="space-y-6">
              <div className="p-3 bg-emerald-600/10 w-fit rounded-2xl border border-emerald-500/20">
                 <BrainCircuit className="w-8 h-8 text-[#3ecf8e]" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight uppercase">The Expert Edge</h2>
              <p className="text-slate-200 leading-relaxed text-base font-medium">
                Our AI agents aren't generic. They are specialized in Polymarket's **15-minute Up/Down** cycle. They understand strike prices, CLOB orderbook deltas, and the precise moment to exit a 1% yield trade.
              </p>
              <ul className="space-y-3">
                 {[
                   "Pre-trained on High-Frequency Python templates",
                   "Real-time Polymarket API documentation access",
                   "Autonomous PnL & Position management logic",
                   "Secure backend execution - No client IP leaks"
                 ].map((item, i) => (
                   <li key={i} className="flex items-center gap-3 text-sm font-semibold text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e]" />
                      {item}
                   </li>
                 ))}
              </ul>
           </div>
           <div className="bg-white/[0.02] border border-white/5 p-10 rounded-[40px] relative overflow-hidden flex flex-col justify-center">
              <div className="absolute top-0 right-0 p-8">
                 <Workflow className="w-32 h-32 text-emerald-500/10" />
              </div>
              <div className="space-y-4 relative z-10">
                 <h3 className="text-xs font-black text-[#3ecf8e] uppercase tracking-[0.3em]">Operational Focus</h3>
                 <h4 className="text-3xl font-black text-white leading-tight uppercase">Optimized for 15m Markets.</h4>
                 <p className="text-slate-200 text-sm leading-relaxed font-medium">
                    We've narrowed our expertise to the most profitable sector: High-frequency binary prediction. This allows our AI to write logic that is significantly more accurate than any general-purpose LLM.
                 </p>
                 <div className="pt-6">
                    <Badge variant="outline" className="border-white/10 text-emerald-400 font-mono text-xs font-bold">
                       Current Support: BTC-USD / ETH-USD (15m Intervals)
                    </Badge>
                 </div>
              </div>
           </div>
        </div>

        <div className="mt-48 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto px-4">
            <BentoCard 
                icon={<Globe className="w-5 h-5" />}
                title="Live Market Access"
                desc="Direct high-speed hooks into Polymarket and Binance WebSockets."
                span="col-span-1"
            />
            <BentoCard 
                icon={<Bot className="w-5 h-5" />}
                title="Specialized Intelligence"
                desc="Trained exclusively on 15-minute 1% yield trading blueprints."
                span="col-span-1"
            />
            <BentoCard 
                icon={<BarChart3 className="w-5 h-5" />}
                title="Secure Hosting"
                desc="Your proprietary logic runs on our private infrastructure, never exposed to the client."
                span="col-span-1"
            />
        </div>
      </main>

      <footer className="mt-40 py-20 border-t border-white/5 container mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-8 opacity-50 text-center md:text-left">
         <div className="flex items-center gap-4 text-[#3ecf8e]">
            <div className="w-8 h-8 bg-[#3ecf8e] text-black rounded-lg flex items-center justify-center">
               <span className="font-black text-sm">Q</span>
            </div>
            <span className="text-sm font-black tracking-tighter uppercase">QuantBox</span>
         </div>
         <div className="flex gap-8 text-[10px] font-bold uppercase tracking-widest text-slate-400">
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
    <div className={`${span} bg-white/[0.02] border border-white/5 p-8 rounded-[32px] hover:border-emerald-500/20 transition-all group overflow-hidden relative`}>
       <div className="absolute -right-4 -bottom-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
          {icon}
       </div>
       <div className="mb-6 p-3 bg-emerald-500/5 w-fit rounded-2xl text-[#3ecf8e] group-hover:scale-110 transition-transform">
          {icon}
       </div>
       <h3 className="text-white font-bold mb-3 tracking-tight text-lg uppercase">{title}</h3>
       <p className="text-slate-300 text-sm leading-relaxed font-medium">{desc}</p>
    </div>
  );
}
