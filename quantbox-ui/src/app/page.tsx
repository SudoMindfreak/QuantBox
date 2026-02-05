'use client';

import { useRouter } from 'next/navigation';
import { Plus, Play, MoreVertical, Clock, DollarSign, Activity, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface Strategy {
  id: string;
  name: string;
  description: string;
  initialBalance: number;
  status: string;
  updatedAt: string;
}

export default function HomePage() {
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

  const handleCreateStrategy = () => {
    router.push('/editor/new');
  };

  const handleOpenStrategy = (id: string) => {
    router.push(`/editor/${id}`);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Don't open the editor
    if (!confirm('Are you sure you want to delete this strategy?')) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/strategies/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        toast.success('Strategy deleted');
        fetchStrategies();
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      toast.error('Failed to delete strategy');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-blue-500/30">
      <div className="container mx-auto px-6 py-12 max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-end mb-12 border-b border-slate-800 pb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20 ring-1 ring-blue-400/50">
                <span className="text-white font-black text-xl italic">Q</span>
              </div>
              <h1 className="text-4xl font-extrabold text-white tracking-tight">QuantBox</h1>
            </div>
            <p className="text-slate-400 font-medium">Visual Node-Based Trading Intelligence</p>
          </div>
          <button
            onClick={handleCreateStrategy}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/40 active:scale-95"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            New Strategy
          </button>
        </div>

        {/* Strategies Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-slate-900/50 rounded-2xl animate-pulse border border-slate-800" />
            ))}
          </div>
        ) : strategies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {strategies.map((strategy) => (
              <Card 
                key={strategy.id} 
                className="group bg-slate-900 border-slate-800 hover:border-blue-500/50 transition-all cursor-pointer overflow-hidden shadow-xl hover:shadow-blue-900/10 active:scale-[0.98]"
                onClick={() => handleOpenStrategy(strategy.id)}
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="pb-3 relative">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className={`
                      ${strategy.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}
                      text-[10px] font-bold uppercase tracking-widest px-2 py-0.5
                    `}>
                      {strategy.status}
                    </Badge>
                    <button 
                      onClick={(e) => handleDelete(e, strategy.id)}
                      className="text-slate-600 hover:text-red-400 p-1 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <CardTitle className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors mt-2">
                    {strategy.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400 text-sm line-clamp-2 mb-6 h-10">
                    {strategy.description || 'No description provided.'}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Capital</span>
                      <div className="flex items-center gap-1.5 text-white font-mono font-medium">
                        <DollarSign className="w-3.5 h-3.5 text-blue-500" />
                        {strategy.initialBalance.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Last Edit</span>
                      <div className="flex items-center gap-1.5 text-slate-300 text-xs">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(strategy.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-800">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-inner ring-1 ring-slate-700">
              <Activity className="w-10 h-10 text-slate-600" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">No strategies found</h2>
            <p className="text-slate-500 mb-8 max-w-sm text-center">
              Your trading terminal is currently empty. Create your first visual strategy to start monitoring markets.
            </p>
            <button
              onClick={handleCreateStrategy}
              className="px-8 py-3 bg-white hover:bg-slate-200 text-slate-950 rounded-xl font-black transition-all active:scale-95 shadow-xl"
            >
              Initialize Strategy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
