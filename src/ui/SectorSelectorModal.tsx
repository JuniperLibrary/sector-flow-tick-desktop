import React from 'react';
import type { SectorType } from '../types';

type ThemeVars = {
  cyan: string; cyanGlow: string; cyanRgb: string;
  red: string; green: string; teal: string; purple: string;
  text: string; textSec: string; textMuted: string;
  surface: string; surfaceHover: string;
  border: string; borderHover: string;
  radius: number; radiusSm: number; radiusXs: number;
  fontMono: string; fontSans: string; transition: string;
  bgInput: string;
};

type SectorGroup = { type: SectorType; names: string[] };
type Props = {
  onClose: () => void;
  allSectorsByType: Record<SectorType, string[]>;
  selectedSectors: Set<string>;
  onToggleSector: (name: string) => void;
  onSelectAll: (names: string[]) => void;
  onRefresh: () => Promise<void>;
  theme: ThemeVars;
};

const typeLabel: Record<SectorType, string> = {
  industry: '行业板块',
  concept: '概念板块',
  region: '地域板块',
};

const typeColor: Record<SectorType, string> = {
  industry: '#00d4ff',
  concept: '#A78BFA',
  region: '#2DD4BF',
};

export const SectorSelectorModal: React.FC<Props> = ({
  onClose,
  allSectorsByType,
  selectedSectors,
  onToggleSector,
  onSelectAll,
  onRefresh,
  theme: C,
}) => {
  const [search, setSearch] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<SectorType>('industry');
  const [refreshing, setRefreshing] = React.useState(false);

  const sectorGroups: SectorGroup[] = React.useMemo(
    () => (['industry', 'concept', 'region'] as SectorType[])
      .filter((t) => allSectorsByType[t].length > 0)
      .map((t) => ({type: t, names: allSectorsByType[t]})),
    [allSectorsByType]
  );

  React.useEffect(() => {
    setSearch('');
    if (sectorGroups.length > 0) {
      setActiveTab(sectorGroups[0].type);
    }
  }, [sectorGroups]);

  const currentGroup = sectorGroups.find((g) => g.type === activeTab);
  const currentNames = currentGroup?.names ?? [];
  const filtered = search.trim()
    ? currentNames.filter((n) => n.includes(search.trim()))
    : currentNames;
  const totalSelected = selectedSectors.size;

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div
        onClick={onClose}
        style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.surface,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: 14,
          border: C.border,
          boxShadow: '0 20px 80px rgba(0,0,0,0.35)',
          width: 720,
          maxWidth: '92vw',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px 14px', flexShrink: 0,
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text, letterSpacing: '0.01em' }}>
            选择板块
            <span style={{ fontSize: 12, fontWeight: 400, color: C.textMuted, marginLeft: 8 }}>
              {totalSelected} 已选
            </span>
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button
              title="重新拉取板块列表"
              onClick={async () => {
                setRefreshing(true);
                try { await onRefresh(); } finally { setRefreshing(false); }
              }}
              disabled={refreshing}
              style={{
                background: 'transparent', border: 'none', color: C.textMuted,
                cursor: refreshing ? 'default' : 'pointer',
                width: 30, height: 30, borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: C.transition,
                opacity: refreshing ? 0.4 : 0.6,
              }}
              onMouseEnter={(e) => {
                if (!refreshing) {
                  e.currentTarget.style.background = C.surfaceHover;
                  e.currentTarget.style.opacity = '1';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.opacity = refreshing ? '0.4' : '0.6';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{
                animation: refreshing ? 'spin 0.8s linear infinite' : undefined,
              }}>
                <polyline points="23 4 23 10 17 10"/>
                <polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent', border: 'none', color: C.textMuted,
                cursor: 'pointer', fontSize: 16, width: 28, height: 28, borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: C.transition, lineHeight: 1,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.surfaceHover; e.currentTarget.style.color = C.text; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.textMuted; }}
            >✕</button>
          </div>
        </div>

        <div style={{ padding: '0 24px 10px', flexShrink: 0 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索板块..."
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 8,
              border: C.border,
              background: C.bgInput,
              color: C.text,
              outline: 'none',
              fontSize: 13,
              transition: C.transition,
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 2, padding: '0 24px', flexShrink: 0 }}>
          {sectorGroups.map((group) => {
            const isActive = group.type === activeTab;
            const color = typeColor[group.type];
            const count = group.names.filter((n) => selectedSectors.has(n)).length;
            return (
              <div
                key={group.type}
                onClick={() => setActiveTab(group.type)}
                style={{
                  padding: '7px 14px',
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? color : C.textMuted,
                  cursor: 'pointer',
                  borderRadius: '6px 6px 0 0',
                  background: isActive ? C.surfaceHover : 'transparent',
                  transition: C.transition,
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                }}
              >
                {typeLabel[group.type]}
                <span style={{ marginLeft: 5, fontSize: 11, opacity: isActive ? 0.8 : 0.5 }}>{count}/{group.names.length}</span>
              </div>
            );
          })}
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 24px', flexShrink: 0,
          borderTop: C.border,
          borderBottom: C.border,
        }}>
          <div style={{ fontSize: 11, color: C.textMuted }}>
            {search.trim()
              ? `筛选 ${filtered.length}/${currentNames.length}`
              : `共 ${currentNames.length} 个`
            }
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
            <span
              onClick={() => onSelectAll(filtered)}
              style={{
                cursor: 'pointer',
                color: typeColor[activeTab],
                opacity: 0.8,
                transition: C.transition,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.8'; }}
            >全选</span>
            <span
              onClick={() => {
                for (const n of filtered) {
                  if (selectedSectors.has(n)) onToggleSector(n);
                }
              }}
              style={{
                cursor: 'pointer',
                color: C.textMuted,
                transition: C.transition,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = C.text; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = C.textMuted; }}
            >取消全选</span>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 24px 20px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: C.textMuted, fontSize: 13 }}>
              {search.trim() ? '未找到匹配板块' : '暂无板块数据'}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(128px, 1fr))',
              gap: 8,
            }}>
              {filtered.map((name) => {
                const isSelected = selectedSectors.has(name);
                const ac = typeColor[activeTab];
                return (
                  <div
                    key={name}
                    onClick={() => onToggleSector(name)}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = C.borderHover.replace('1px solid ', '');
                        e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.15)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = C.border.replace('1px solid ', '');
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                    style={{
                      padding: '11px 10px',
                      borderRadius: 8,
                      border: isSelected
                        ? `1px solid ${ac}55`
                        : C.border,
                      background: isSelected
                        ? `linear-gradient(135deg, ${ac}18, ${ac}06)`
                        : C.surfaceHover,
                      textAlign: 'center',
                      fontSize: 12,
                      color: isSelected ? C.text : C.textSec,
                      fontWeight: isSelected ? 500 : 400,
                      lineHeight: 1.35,
                      position: 'relative',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease',
                      boxShadow: isSelected
                        ? `0 0 0 1px ${ac}11, 0 4px 16px rgba(0,0,0,0.12)`
                        : 'none',
                    }}
                  >
                    {name}
                    {isSelected && (
                      <span style={{
                        position: 'absolute', top: -5, right: -5,
                        width: 16, height: 16, borderRadius: 8,
                        background: ac,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: `0 0 0 2px ${C.surface}, 0 2px 6px rgba(0,0,0,0.25)`,
                      }}>
                        <svg width="9" height="9" viewBox="0 0 8 8" fill="none">
                          <path d="M1.5 4L3.5 6L6.5 1.5" stroke="#0A0E1A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
};
