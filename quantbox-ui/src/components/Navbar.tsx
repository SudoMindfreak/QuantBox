'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, User, LogOut, LayoutDashboard, CreditCard, BookOpen, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface NavbarProps {
    isScrolled?: boolean;
    onSettingsOpen?: () => void;
}

export function Navbar({ isScrolled = false, onSettingsOpen }: NavbarProps) {
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    return (
        <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-[#1c1c1c]/80 backdrop-blur-md border-b border-white/5 py-3' : 'py-6'}`}>
            <div className="container mx-auto px-8 flex items-center justify-between">
                {/* Logo & Main Nav */}
                <div className="flex items-center gap-12">
                    <div className="flex items-center gap-4 group cursor-pointer" onClick={() => router.push('/')}>
                        <div className="w-10 h-10 bg-[#3ecf8e] text-black rounded-xl flex items-center justify-center shadow-2xl transition-transform group-hover:rotate-12">
                            <span className="font-black text-xl">Q</span>
                        </div>
                        <span className="text-lg font-black tracking-tighter text-white uppercase">QuantBox</span>
                    </div>

                    <div className="hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                        <button onClick={() => router.push('/dashboard')} className="hover:text-[#3ecf8e] transition-colors flex items-center gap-2">
                            <LayoutDashboard className="w-3.5 h-3.5" />
                            Simulations
                        </button>
                        <button onClick={() => toast.info('Pricing module coming soon.')} className="hover:text-[#3ecf8e] transition-colors flex items-center gap-2">
                            <CreditCard className="w-3.5 h-3.5" />
                            Pricing
                        </button>
                        <button onClick={() => toast.info('Documentation is being updated.')} className="hover:text-[#3ecf8e] transition-colors flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5" />
                            Docs
                        </button>
                    </div>
                </div>

                {/* Auth & Profile */}
                <div className="flex items-center gap-6">
                    {isLoggedIn ? (
                        <div className="relative">
                            <button 
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="flex items-center gap-3 pl-1 pr-3 py-1 rounded-full bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all"
                            >
                                <div className="w-8 h-8 rounded-full bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 flex items-center justify-center text-[#3ecf8e]">
                                    <User className="w-4 h-4" />
                                </div>
                                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isProfileOpen && (
                                <>
                                    <div className="fixed inset-0 z-0" onClick={() => setIsProfileOpen(false)} />
                                    <div className="absolute right-0 mt-3 w-56 bg-[#232323] border border-white/10 rounded-2xl shadow-2xl p-2 z-10 animate-in fade-in zoom-in duration-200">
                                        <div className="px-4 py-3 border-b border-white/5 mb-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Account</p>
                                            <p className="text-xs font-bold text-white truncate">operator@quantbox.ai</p>
                                        </div>
                                        <button 
                                            onClick={() => { router.push('/dashboard'); setIsProfileOpen(false); }}
                                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-all uppercase tracking-wider"
                                        >
                                            <LayoutDashboard className="w-4 h-4 text-[#3ecf8e]" />
                                            Dashboard
                                        </button>
                                        <button 
                                            onClick={() => { onSettingsOpen?.(); setIsProfileOpen(false); }}
                                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-all uppercase tracking-wider"
                                        >
                                            <Settings className="w-4 h-4 text-slate-500" />
                                            Settings
                                        </button>
                                        <div className="h-px bg-white/5 my-1" />
                                        <button 
                                            onClick={() => { setIsLoggedIn(false); setIsProfileOpen(false); }}
                                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-all uppercase tracking-wider"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Sign Out
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-6">
                            <button 
                                onClick={() => setIsLoggedIn(true)} 
                                className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-white transition-colors"
                            >
                                Login
                            </button>
                            <button 
                                onClick={() => setIsLoggedIn(true)}
                                className="px-6 py-2.5 bg-[#3ecf8e] text-black rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-[#30b47b] transition-all shadow-xl active:scale-95"
                            >
                                Sign Up
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
