import React from 'react';
import { PaseadorSubTab } from '../types';
import { MapPin, Calendar, CheckCircle2, UserCheck, User } from 'lucide-react';

interface PaseadorSubNavProps {
  activeSubTab: PaseadorSubTab;
  onSelectSubTab: (tab: PaseadorSubTab) => void;
  requestsCount?: number;
  pendingRequestsCount?: number;
  confirmedCount?: number;
  completedCount?: number;
  activeAccountStatus?: boolean;
  onOpenTutorial?: () => void;
}

export const PaseadorSubNav: React.FC<PaseadorSubNavProps> = ({
  activeSubTab,
  onSelectSubTab,
  requestsCount = 0,
  pendingRequestsCount = 0,
  confirmedCount = 0,
  completedCount = 0,
  activeAccountStatus = true,
  onOpenTutorial
}) => {
  const badgeCount = pendingRequestsCount || requestsCount;

  return (
    <div 
      id="paseador-sub-navigation-bar" 
      className="w-full bg-slate-900 border-b border-slate-800 text-white sticky top-13 sm:top-15 z-30 shadow-lg"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between overflow-x-auto py-2.5 scrollbar-none gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Sub-Tab 1: Gestión y Radar */}
            <button
              id="subtab-mapa-solicitudes"
              type="button"
              onClick={() => onSelectSubTab('mapa_solicitudes')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all ${
                activeSubTab === 'mapa_solicitudes' || activeSubTab === 'gestion_mapa'
                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>1. Paseos de Hoy y Radar</span>
              {badgeCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black animate-pulse">
                  {badgeCount}
                </span>
              )}
            </button>

            {/* Sub-Tab 2: Calendario */}
            <button
              id="subtab-agenda-mensual"
              type="button"
              onClick={() => onSelectSubTab('agenda_mensual')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all ${
                activeSubTab === 'agenda_mensual' || activeSubTab === 'calendario_agenda'
                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>2. Calendario</span>
              {confirmedCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-black">
                  {confirmedCount}
                </span>
              )}
            </button>

            {/* Sub-Tab 3: Perfil del Paseador */}
            <button
              id="subtab-perfil-paseador"
              type="button"
              onClick={() => onSelectSubTab('cuenta_resenas')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all ${
                activeSubTab === 'cuenta_resenas' || activeSubTab === 'paseos_realizados'
                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <User className="w-4 h-4 text-emerald-400" />
              <span>3. Perfil del Paseador</span>
              {completedCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-700 text-white text-[10px] font-bold">
                  {completedCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {onOpenTutorial && (
              <button
                type="button"
                id="btn-tutorial-paseador-subnav"
                onClick={onOpenTutorial}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700/80 cursor-pointer transition-colors"
                title="Abrir Tutorial del Paseador"
              >
                <span className="text-emerald-400 font-bold">?</span>
                <span>Tutorial</span>
              </button>
            )}

            <div className="hidden md:flex items-center gap-2 text-[11px] text-emerald-400 font-semibold shrink-0">
              <span className={`w-2 h-2 rounded-full ${activeAccountStatus ? 'bg-emerald-500 animate-ping' : 'bg-slate-500'}`}></span>
              <span>Radio 10 km • Valle de Punilla</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
