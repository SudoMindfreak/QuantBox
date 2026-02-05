'use client';

import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  const handleCreateStrategy = () => {
    router.push('/editor/new');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">QuantBox</h1>
            <p className="text-slate-400">Multi-Strategy Trading System</p>
          </div>
          <button
            onClick={handleCreateStrategy}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Strategy
          </button>
        </div>

        {/* Empty state */}
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <Plus className="w-8 h-8 text-slate-500" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">No strategies yet</h2>
          <p className="text-slate-400 mb-6">Create your first trading strategy to get started</p>
          <button
            onClick={handleCreateStrategy}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Create Strategy
          </button>
        </div>
      </div>
    </div>
  );
}
