import React from 'react';
import { UserRole, UserCliente, UserPaseador, RoleTab } from '../types';
import { PawPrint, User, RefreshCw, Compass, Heart, HelpCircle, LogOut, Award } from 'lucide-react';
import { WalkieLogo } from './WalkieLogo';

interface NavbarProps {
  currentRole: UserRole;
  activeTab: RoleTab;
  onSelectTab: (tab: RoleTab) => void;
  onSwitchRole: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  clienteUser: UserCliente | null;
  paseadorUser: UserPaseador | null;
  solidarityAmount: number;
  onOpenAuth?: (role: 'cliente' | 'paseador', tab?: 'login' | 'register') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  activeTab,
  onSelectTab,
  onSwitchRole,
  onOpenProfile,
  onLogout,
  clienteUser,
  paseadorUser,
  solidarityAmount,
  onOpenAuth
}) => {
  const currentUser = currentRole === 'cliente' ? clienteUser : paseadorUser;
  const username = currentUser?.nombreUsuario || (currentRole === 'cliente' ? 'Dueño' : 'Paseador');

  return (
    <header id="main-navbar" className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-xs border-b border-slate-200 w-full transition-all">
      <div className="max-w-6xl mx-auto px-3 sm:px-5">
        <div className="flex items-center justify-between h-13 sm:h-15 gap-2">
          {/* Left: Brand & User Greeting */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              onClick={() => onSelectTab('main')}
              className="flex items-center gap-2.5 text-slate-900 group cursor-pointer shrink-0"
              title="Walkie Inicio"
            >
              <WalkieLogo className="h-7 sm:h-8 w-auto group-hover:scale-105 transition-transform" />
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:inline-block border-l border-slate-200 pl-2.5">
                Valle de Punilla
              </span>
            </button>

            {currentRole !== 'inicio' && (
              <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200 min-w-0">
                <div className="text-xs truncate">
                  <span className="text-slate-500 hidden md:inline">Hola, </span>
                  <strong className="text-slate-800 font-semibold text-xs">{username} 👋</strong>
                </div>
                <span className="hidden lg:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200/80 shrink-0">
                  {currentRole === 'cliente' ? 'Cliente' : 'Paseador'}
                </span>
              </div>
            )}
          </div>

          {/* Center Tabs: [1. Cliente / Paseador] | [2. Nosotros] | [3. Metas] (Desktops) */}
          {currentRole !== 'inicio' ? (
            <nav className="hidden md:flex items-center bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/80">
              <button
                id="tab-main"
                type="button"
                onClick={() => onSelectTab('main')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'main'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Compass className="w-3.5 h-3.5 text-emerald-600" />
                <span>{currentRole === 'cliente' ? 'Paseos' : 'Paseador'}</span>
              </button>

              {currentRole === 'cliente' && (
                <button
                  id="tab-perfil"
                  type="button"
                  onClick={() => onSelectTab('perfil')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'perfil'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold text-emerald-800'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Perfil e Historial</span>
                </button>
              )}

              <button
                id="tab-nosotros-faq"
                type="button"
                onClick={() => onSelectTab('nosotros_faq')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'nosotros_faq'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold text-emerald-800'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5 text-teal-600" />
                <span>Nosotros</span>
              </button>

              <button
                id="tab-meta-solidaria"
                type="button"
                onClick={() => onSelectTab('meta_solidaria')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'meta_solidaria'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold text-rose-700'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                <span>Metas</span>
              </button>
            </nav>
          ) : (
            <div className="hidden sm:flex items-center gap-4 text-xs font-medium text-slate-600">
              <button
                id="btn-nosotros-header"
                type="button"
                onClick={() => onSelectTab('nosotros_faq')}
                className="hover:text-emerald-800 transition-colors cursor-pointer"
              >
                Nosotros & FAQ
              </button>
              <span className="text-slate-300">·</span>
              <button
                id="btn-metas-header"
                type="button"
                onClick={() => onSelectTab('meta_solidaria')}
                className="hover:text-rose-700 transition-colors cursor-pointer"
              >
                Meta Solidaria
              </button>
            </div>
          )}

          {/* Right Action buttons */}
          {currentRole !== 'inicio' ? (
            <div className="hidden md:flex items-center gap-1.5 shrink-0">
              {/* 1. Selector/Interruptor Rápido de Rol (Cliente ↔ Paseador) */}
              <button
                id="btn-cambiar-rol-header"
                type="button"
                onClick={onSwitchRole}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                title="Cambiar de Rol (Cliente ↔ Paseador)"
              >
                <RefreshCw className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-tight">
                  {currentRole === 'paseador' ? 'Paseador' : 'Cliente'}
                </span>
              </button>

              {/* 2. Acceso Directo a Perfil */}
              <button
                id="btn-ver-perfil-header"
                type="button"
                onClick={onOpenProfile}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs active:scale-95"
                title="Mi Perfil"
              >
                <div className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <User className="w-3 h-3" />
                </div>
                <span>Mi Perfil</span>
              </button>

              {/* 3. Cerrar sesión */}
              {currentUser && (
                <button
                  id="btn-logout-header"
                  type="button"
                  onClick={onLogout}
                  className="px-2.5 py-1.5 rounded-xl border border-rose-200 hover:border-rose-300 bg-rose-50/70 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-3 h-3 text-rose-600" />
                  <span className="hidden lg:inline">Salir</span>
                </button>
              )}
            </div>
          ) : (
            (clienteUser || paseadorUser) ? (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  id="btn-logout-header"
                  type="button"
                  onClick={onLogout}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-rose-300 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600" />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  id="btn-login-nav"
                  type="button"
                  onClick={() => onOpenAuth?.('cliente', 'login')}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  Iniciar Sesión
                </button>
                <button
                  id="btn-register-nav"
                  type="button"
                  onClick={() => onOpenAuth?.('cliente', 'register')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all cursor-pointer shadow-xs"
                >
                  Registrarse
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </header>
  );
};
