'use client';

import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Clock, 
  Activity, 
  Trash2, 
  ChevronRight,
  Cpu,
  ArrowRight
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Navbar } from '@/components/Navbar';
import { SettingsModal } from '@/components/editor/SettingsModal';
import { toast } from 'sonner';

interface Strategy {
  id: string;
  name: string;
  description: string | null;
  initialBalance: number;
  status: string;
  updatedAt: string;
}

export default function DashboardPage() {
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

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-slate-200 font-sans pb-20">
      <div className="fixed inset-0 z-0 opacity-20 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <Navbar isScrolled={true} onSettingsOpen={() => setIsSettingsOpen(true)} />

      <div className="container mx-auto px-8 pt-32 max-w-7xl relative z-10">
        <div className="flex justify-between items-center mb-16">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight leading-none mb-1 uppercase">Strategy Dashboard</h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Manage your active AI agents</p>
          </div>
          
          <button
            onClick={() => router.push('/')}
            className="group flex items-center gap-3 px-6 py-3 bg-[#3ecf8e] text-black rounded-xl font-bold text-xs transition-all shadow-xl active:scale-95 uppercase tracking-widest"
          >
            <Plus className="w-4 h-4" />
            New Simulation
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            [1, 2, 3].map(i => <div key={i} className="h-48 bg-white/5 rounded-[24px] animate-pulse border border-white/5" />)
          ) : strategies.length > 0 ? (
            strategies.map((s) => (
              <Card 
                key={s.id}
                onClick={() => router.push(`/editor/${s.id}`)}
                className="group bg-[#232323] border border-white/5 hover:border-[#3ecf8e]/50 transition-all cursor-pointer overflow-hidden shadow-2xl relative backdrop-blur-md rounded-[24px]"
              >
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start mb-4">
                    <Badge className={`${s.status === 'active' ? 'bg-emerald-500/10 text-[#3ecf8e]' : 'bg-white/5 text-slate-500'} text-xs font-bold tracking-widest px-2 py-0.5 border-none rounded-md`}>
                      {s.status.toUpperCase()}
                    </Badge>
                    <button onClick={(e) => handleDelete(e, s.id)} className="text-slate-600 hover:text-rose-500 p-1.5 transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <CardTitle className="text-lg font-black text-white group-hover:text-[#3ecf8e] transition-colors leading-tight uppercase">
                    {s.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-500 text-xs line-clamp-2 mb-6 leading-relaxed font-medium">
                    {s.description || 'AI-generated strategy logic optimized for Polymarket high-frequency execution.'}
                  </p>
                  <div className="flex items-center justify-between border-t border-white/5 pt-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-widest">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(s.updatedAt).toLocaleDateString()}
                    </div>
                    <div className="p-1.5 rounded-lg bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors">
                        <ChevronRight className="w-4 h-4 text-[#3ecf8e] transition-all transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-24 bg-white/[0.01] rounded-[32px] border border-dashed border-white/10 flex flex-col items-center text-center">
              <div className="p-4 bg-white/5 rounded-2xl mb-6">
                <Cpu className="w-10 h-10 text-slate-700 opacity-50" />
              </div>
              <h3 className="text-white font-bold mb-2 text-lg uppercase tracking-tight">No agents found</h3>
              <p className="text-slate-500 text-sm mb-8 max-w-xs">Start by prompting your first idea on the home page to initialize an expert agent.</p>
              <button 
                onClick={() => router.push('/')}
                className="text-[#3ecf8e] text-xs font-black uppercase tracking-[0.2em] hover:text-[#30b47b] transition-colors flex items-center gap-2"
              >
                Launch Creator <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
