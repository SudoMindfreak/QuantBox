'use client';

import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Clock, 
  DollarSign, 
  Activity, 
  Trash2, 
  Settings, 
  ArrowRight,
  Zap,
  Shield,
  Target,
  ChevronRight,
  Cpu
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SettingsModal } from '@/components/editor/SettingsModal';
import { toast } from 'sonner';

interface Strategy {
  id: string;
  name: string;
  description: string | null;
  initialBalance: number;
  status: string;
  isTemplate: boolean;
  updatedAt: string;
}

export default function HomePage() {
  const router = useRouter();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const fetchStrategies = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/strategies`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setStrategies(data);
    } catch (error) {
      console.error('Error loading strategies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStrategies();
  }, []);

  const userStrategies = strategies.filter(s => !s.isTemplate);
  const templateStrategies = strategies.filter(s => s.isTemplate);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Permanently delete this strategy?')) return;
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/strategies/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        toast.success('Strategy removed');
        fetchStrategies();
      }
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const getStrategyIcon = (name: string) => {
    if (name.includes('Momentum')) return <Zap className="w-5 h-5 text-purple-400" />;
    if (name.includes('Arb')) return <Shield className="w-5 h-5 text-emerald-400" />;
    if (name.includes('Hunter') || name.includes('Volatility')) return <Target className="w-5 h-5 text-orange-400" />;
    return <Activity className="w-5 h-5 text-blue-400" />;
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-blue-500/30 font-sans pb-20">
      {/* Background Grid Pattern */}
      <div className="fixed inset-0 z-0 opacity-20 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <div className="container mx-auto px-6 pt-12 max-w-7xl relative z-10">
        {/* Top Navigation */}
        <div className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-900/40 ring-1 ring-white/20">
              <span className="text-white font-black text-2xl italic tracking-tighter">Q</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight leading-none mb-1">QUANTBOX</h1>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Live Trading Core</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-3 bg-slate-900/50 border border-slate-800 hover:border-slate-600 text-slate-400 hover:text-white rounded-xl transition-all backdrop-blur-sm"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => router.push('/editor/new')}
              className="group flex items-center gap-3 px-6 py-3 bg-white hover:bg-blue-50 text-slate-950 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-xl active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[4]" />
              Initialize Strategy
            </button>
          </div>
        </div>

        {/* --- SECTION: USER STRATEGIES --- */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.3em]">Your Workspace</h2>
            <div className="h-px flex-1 bg-gradient-to-right from-slate-800 to-transparent" />
            <span className="text-[10px] font-bold text-slate-600">{userStrategies.length} ACTIVE</span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2].map(i => <div key={i} className="h-56 bg-slate-900/20 rounded-2xl border border-slate-800 animate-pulse" />)}
            </div>
          ) : userStrategies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userStrategies.map((s) => (
                <StrategyCard key={s.id} strategy={s} onOpen={() => router.push(`/editor/${s.id}`)} onDelete={(e) => handleDelete(e, s.id)} icon={getStrategyIcon(s.name)} />
              ))}
            </div>
          ) : (
            <div className="py-16 bg-slate-900/10 rounded-3xl border border-dashed border-slate-800/50 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-4 text-slate-700 border border-slate-800">
                <Cpu className="w-8 h-8 opacity-50" />
              </div>
              <h3 className="text-white font-bold mb-1 uppercase tracking-tight text-sm">No Custom Logic Detected</h3>
              <p className="text-slate-500 text-xs max-w-xs mb-6">Create a new strategy or clone a template to begin testing your trade ideas.</p>
            </div>
          )}
        </div>

        {/* --- SECTION: TEMPLATES --- */}
        <div className="mt-20">
          <div className="flex items-center gap-3 mb-8">
            <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.3em]">Strategy Forge</h2>
            <div className="h-px flex-1 bg-gradient-to-right from-slate-800 to-transparent" />
            <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-[9px] font-black tracking-widest px-2">OFFICIAL TEMPLATES</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templateStrategies.map((s) => (
              <StrategyCard key={s.id} strategy={s} onOpen={() => router.push(`/editor/${s.id}`)} isTemplate icon={getStrategyIcon(s.name)} />
            ))}
          </div>
        </div>

        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      </div>
    </div>
  );
}

function StrategyCard({ strategy, onOpen, onDelete, isTemplate, icon }: { strategy: Strategy, onOpen: () => void, onDelete?: (e: any) => void, isTemplate?: boolean, icon: React.ReactNode }) {
  return (
    <Card 
      onClick={onOpen}
      className="group bg-[#0f172a]/40 border-[#1e293b] hover:border-blue-500/50 transition-all cursor-pointer overflow-hidden shadow-2xl relative backdrop-blur-sm"
    >
      <div className={`absolute top-0 left-0 w-1 h-full transition-all duration-500 ${isTemplate ? 'bg-indigo-500/50 group-hover:bg-indigo-400' : 'bg-blue-600 group-hover:shadow-[0_0_15px_rgba(37,99,235,0.5)]'}`} />
      
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-950 rounded-lg border border-white/5 shadow-inner group-hover:scale-110 transition-transform duration-300">
              {icon}
            </div>
            <Badge className={`${strategy.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800/50 text-slate-500'} text-[9px] font-black tracking-[0.1em] px-2`}>
              {strategy.status.toUpperCase()}
            </Badge>
          </div>
          {!isTemplate && onDelete && (
            <button onClick={onDelete} className="text-slate-700 hover:text-rose-500 p-1.5 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
        <CardTitle className="text-lg font-black text-white group-hover:text-blue-400 transition-colors leading-tight tracking-tight">
          {strategy.name}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <p className="text-slate-500 text-xs leading-relaxed mb-6">
          {strategy.description || 'System generated automated trading strategy logic.'}
        </p>
        
        <div className="flex items-center justify-between border-t border-[#1e293b] pt-4">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-0.5">Deployment</span>
            <div className="flex items-center gap-1.5 text-white font-mono text-xs font-bold">
              <DollarSign className="w-3 h-3 text-emerald-500" />
              {strategy.initialBalance.toLocaleString()} <span className="text-[9px] text-slate-500 opacity-50">USDC</span>
            </div>
          </div>
          <div className="flex items-center text-blue-500 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all">
            Enter Core <ChevronRight className="w-3 h-3 ml-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
