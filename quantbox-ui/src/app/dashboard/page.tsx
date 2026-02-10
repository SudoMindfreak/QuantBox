'use client';

import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Clock, 
  Activity, 
  Trash2, 
  ChevronRight,
  Cpu,
  ArrowLeft
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans pb-20">
      <div className="fixed inset-0 z-0 opacity-20 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <div className="container mx-auto px-6 pt-12 max-w-7xl relative z-10">
        <div className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-6">
            <button 
                onClick={() => router.push('/')}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight leading-none mb-1 uppercase">Strategy Dashboard</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Manage your active AI agents</p>
            </div>
          </div>
          
          <button
            onClick={() => router.push('/')}
            className="group flex items-center gap-3 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs transition-all shadow-xl active:scale-95"
          >
            <Plus className="w-4 h-4" />
            New Simulation
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            [1, 2, 3].map(i => <div key={i} className="h-48 bg-white/5 rounded-2xl animate-pulse" />)
          ) : strategies.length > 0 ? (
            strategies.map((s) => (
              <Card 
                key={s.id}
                onClick={() => router.push(`/editor/${s.id}`)}
                className="group bg-[#09090b]/60 border-white/5 hover:border-blue-500/50 transition-all cursor-pointer overflow-hidden shadow-2xl relative backdrop-blur-md"
              >
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start mb-2">
                    <Badge className={`${s.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-slate-500'} text-[9px] font-bold tracking-widest px-2 border-none`}>
                      {s.status.toUpperCase()}
                    </Badge>
                    <button onClick={(e) => handleDelete(e, s.id)} className="text-slate-700 hover:text-rose-500 p-1.5 transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <CardTitle className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors leading-tight">
                    {s.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-500 text-xs line-clamp-2 mb-6">
                    {s.description || 'AI-generated strategy for Polymarket.'}
                  </p>
                  <div className="flex items-center justify-between border-t border-white/5 pt-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                      <Clock className="w-3 h-3" />
                      {new Date(s.updatedAt).toLocaleDateString()}
                    </div>
                    <ChevronRight className="w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-20 bg-white/[0.02] rounded-3xl border border-dashed border-white/10 flex flex-col items-center text-center">
              <Cpu className="w-12 h-12 text-slate-700 mb-4 opacity-50" />
              <h3 className="text-white font-bold mb-1">No strategies found</h3>
              <p className="text-slate-500 text-xs mb-6">Start by prompting your first idea on the home page.</p>
              <button 
                onClick={() => router.push('/')}
                className="text-blue-400 text-xs font-bold hover:underline"
              >
                Go to home &rarr;
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
