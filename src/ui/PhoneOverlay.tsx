/**
 * Diegetic Suburban Smartphone Overlay ("SUBURB-OS") — Phase 3 Hub.
 * - Clean segmented 4-tab navigation: Hardware Shop, 911 & Security, Missions, NextBlock Feed.
 * - Zero `backdrop-filter` over WebGL, zero static pills, high-contrast tactile controls,
 *   full keyboard/accessibility support, and responsive mobile-friendly frame.
 */

import { useState } from 'react';
import { t } from '../i18n/translations';
import type { GameSimulation } from '../simulation/simulation';
import { SHOP_CATALOG, WEAPON_SPECS, type WeaponId } from '../phase3/phase3Types';

export type PhoneTab = 'shop' | 'security' | 'missions' | 'feed';

interface PhoneOverlayProps {
  simRef: React.MutableRefObject<GameSimulation>;
  money: number;
  health: number;
  maxHealth: number;
  revision: number;
  onClose: () => void;
  onBuyItem: (itemId: string) => void;
  onEquipWeapon: (weaponId: WeaponId) => void;
  onCall911: () => void;
  onTriggerRaid: () => void;
  onPostPhoto: () => void;
  onClaimMission: (missionId: string) => void;
  onFeedViewed: () => void;
}

export function PhoneOverlay({
  simRef,
  money,
  health,
  maxHealth,
  onClose,
  onBuyItem,
  onEquipWeapon,
  onCall911,
  onTriggerRaid,
  onPostPhoto,
  onClaimMission,
  onFeedViewed,
}: PhoneOverlayProps) {
  const [tab, setTab] = useState<PhoneTab>('shop');
  const sim = simRef.current;
  const p3 = sim.state.phase3;
  const player = sim.getLocalPlayer();

  const playerDoors = Object.values(sim.state.doors).filter(
    (d) => d.houseId === player.houseId && (d.kind === 'front' || d.kind === 'back' || d.kind === 'garage'),
  );
  const lockedDoors = playerDoors.filter((d) => d.isLocked).length;

  const playerWindows = Object.values(sim.state.windows).filter((w) => w.houseId === player.houseId);
  const barricadedWindows = playerWindows.filter((w) => w.isBarricaded).length;

  const activeDefenses = Object.values(p3.defenses).filter((d) => d.armed).length;
  const hasGuardDog = p3.animals.some((a) => a.kind === 'guard_dog' && a.houseId === player.houseId);
  const activeRobbers = p3.robbers.filter((r) => r.state !== 'arrested' && r.state !== 'stunned').length;
  const claimableMissions = p3.missions.filter((m) => m.completed && !m.claimed).length;

  const switchTab = (next: PhoneTab) => {
    setTab(next);
    if (next === 'feed') onFeedViewed();
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#0f1318cc] p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={t('phone.title')}
      data-testid="phone-overlay"
    >
      {/* Tactile Handheld Smartphone Frame */}
      <div className="w-full max-w-[430px] max-h-[88vh] flex flex-col bg-[#181d23] border-4 border-[#3c434c] shadow-[0_12px_36px_rgba(0,0,0,0.75)] rounded-[22px] overflow-hidden text-[#efe9dc]">
        {/* Top Phone Status Bezel */}
        <div className="px-4 py-3 bg-[#12161b] border-b border-[#2f353d] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4ca86e]" aria-hidden="true" />
            <span className="font-display font-extrabold text-sm tracking-widest uppercase text-[#e7decb]">
              {t('phone.title')}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono-hud text-sm font-bold text-[#b7c88d]" data-testid="phone-cash">
              ${money}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('menu.close')}
              className="px-2.5 py-1 text-xs font-mono-hud font-bold uppercase bg-[#283038] hover:bg-[#394450] border border-[#525a64] text-[#ece6da] cursor-pointer"
            >
              {t('menu.close')}
            </button>
          </div>
        </div>

        {/* Segmented App Navigation Bar */}
        <div className="grid grid-cols-4 bg-[#14191e] border-b border-[#2e353d]" role="tablist">
          {(
            [
              { id: 'shop', label: t('phone.tab.shop'), badge: 0 },
              { id: 'security', label: t('phone.tab.security'), badge: activeRobbers },
              { id: 'missions', label: t('phone.tab.missions'), badge: claimableMissions },
              { id: 'feed', label: t('phone.tab.feed'), badge: p3.unreadFeedCount },
            ] as const
          ).map((item) => {
            const active = tab === item.id;
            return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => switchTab(item.id)}
                  className={`relative py-2.5 px-1.5 flex items-center justify-center gap-1 whitespace-nowrap font-display font-bold text-[11px] sm:text-xs uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#212830] text-[#f5efe2] border-[#c67134]'
                      : 'text-[#9aa3ad] hover:text-[#e0d8c8] border-transparent'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[15px] h-[15px] px-1 text-[10px] font-mono-hud font-bold bg-[#c84336] text-[#fff2ee]">
                      {item.badge}
                    </span>
                  )}
                </button>
            );
          })}
        </div>

        {/* Scrollable App Content Viewport */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
          {tab === 'shop' && (
            <div className="space-y-4" data-testid="phone-tab-shop">
              {/* Weapons Section */}
              <section className="space-y-2">
                <h2 className="font-display font-bold text-xs uppercase tracking-widest text-[#b8ab93]">
                  {t('phone.shop.weapons')}
                </h2>
                {SHOP_CATALOG.filter((i) => i.category === 'weapons').map((item) => {
                  const owned = item.weaponId ? p3.ownedWeapons.includes(item.weaponId) : false;
                  const equipped = item.weaponId === p3.activeWeapon;
                  const canAfford = money >= item.price;
                  return (
                    <div
                      key={item.id}
                      className="bg-[#20262e] border border-[#38404a] p-2.5 flex items-center justify-between gap-2.5"
                    >
                      <div className="min-w-0">
                        <div className="font-display font-bold text-sm text-[#f2ece1]">
                          {t(item.nameKey)}
                        </div>
                        <div className="text-xs text-[#a5adb7] leading-snug">{t(item.descKey)}</div>
                      </div>
                      {owned && item.weaponId ? (
                        <button
                          type="button"
                          onClick={() => onEquipWeapon(item.weaponId!)}
                          disabled={equipped}
                          className={`shrink-0 px-3 py-1.5 font-mono-hud text-xs font-bold uppercase border cursor-pointer ${
                            equipped
                              ? 'bg-[#364438] text-[#b7d69e] border-[#5b755e] cursor-default'
                              : 'bg-[#2e3844] hover:bg-[#3d4a5a] text-[#ece6da] border-[#667280]'
                          }`}
                        >
                          {equipped ? t('phone.shop.equipped') : t('phone.shop.equip')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!canAfford}
                          onClick={() => onBuyItem(item.id)}
                          aria-label={`${t(item.nameKey)} ${t('phone.shop.buy', { price: item.price })}`}
                          className={`shrink-0 px-3 py-1.5 font-mono-hud text-xs font-bold uppercase border ${
                            canAfford
                              ? 'bg-[#c67134] hover:bg-[#da8342] text-[#141618] border-[#f2dec0] cursor-pointer'
                              : 'bg-[#262b30] text-[#777e87] border-[#3d4248] cursor-not-allowed'
                          }`}
                        >
                          {t('phone.shop.buy', { price: item.price })}
                        </button>
                      )}
                    </div>
                  );
                })}
              </section>

              {/* Ammo & Supplies Section */}
              <section className="space-y-2">
                <h2 className="font-display font-bold text-xs uppercase tracking-widest text-[#b8ab93]">
                  {t('phone.shop.ammo')}
                </h2>
                {SHOP_CATALOG.filter((i) => i.category === 'ammo' || i.category === 'supplies').map(
                  (item) => {
                    const needsWeapon =
                      item.category === 'ammo' &&
                      item.weaponId &&
                      !p3.ownedWeapons.includes(item.weaponId);
                    const fullHp = item.id === 'consumable_medkit' && health >= maxHealth;
                    const disabled = money < item.price || Boolean(needsWeapon) || fullHp;
                    const curAmmo =
                      item.weaponId && !WEAPON_SPECS[item.weaponId].infiniteAmmo
                        ? p3.ammo[item.weaponId] ?? 0
                        : null;
                    return (
                      <div
                        key={item.id}
                        className="bg-[#20262e] border border-[#38404a] p-2.5 flex items-center justify-between gap-2.5"
                      >
                        <div className="min-w-0">
                          <div className="font-display font-bold text-sm text-[#f2ece1]">
                            {t(item.nameKey)}{' '}
                            {curAmmo !== null && (
                              <span className="font-mono-hud text-xs text-[#9cb4c7]">
                                ({curAmmo})
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#a5adb7] leading-snug">{t(item.descKey)}</div>
                        </div>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => onBuyItem(item.id)}
                          aria-label={`${t(item.nameKey)} ${t('phone.shop.buy', { price: item.price })}`}
                          className={`shrink-0 px-3 py-1.5 font-mono-hud text-xs font-bold uppercase border ${
                            !disabled
                              ? 'bg-[#c67134] hover:bg-[#da8342] text-[#141618] border-[#f2dec0] cursor-pointer'
                              : 'bg-[#262b30] text-[#777e87] border-[#3d4248] cursor-not-allowed'
                          }`}
                        >
                          {t('phone.shop.buy', { price: item.price })}
                        </button>
                      </div>
                    );
                  },
                )}
              </section>

              {/* Yard & Roof Defense Kits */}
              <section className="space-y-2">
                <h2 className="font-display font-bold text-xs uppercase tracking-widest text-[#b8ab93]">
                  {t('phone.shop.defenses')}
                </h2>
                {SHOP_CATALOG.filter((i) => i.category === 'defenses').map((item) => {
                  const kits = item.defenseId ? p3.defenseKits[item.defenseId] ?? 0 : 0;
                  const canAfford = money >= item.price;
                  return (
                    <div
                      key={item.id}
                      className="bg-[#20262e] border border-[#38404a] p-2.5 flex items-center justify-between gap-2.5"
                    >
                      <div className="min-w-0">
                        <div className="font-display font-bold text-sm text-[#f2ece1]">
                          {t(item.nameKey)}{' '}
                          {kits > 0 && (
                            <span className="font-mono-hud text-xs text-[#b7c88d]">
                              · {t('phone.shop.kitsOwned', { count: kits })}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#a5adb7] leading-snug">{t(item.descKey)}</div>
                      </div>
                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => onBuyItem(item.id)}
                        aria-label={`${t(item.nameKey)} ${t('phone.shop.buy', { price: item.price })}`}
                        className={`shrink-0 px-3 py-1.5 font-mono-hud text-xs font-bold uppercase border ${
                          canAfford
                            ? 'bg-[#c67134] hover:bg-[#da8342] text-[#141618] border-[#f2dec0] cursor-pointer'
                            : 'bg-[#262b30] text-[#777e87] border-[#3d4248] cursor-not-allowed'
                        }`}
                      >
                        {t('phone.shop.buy', { price: item.price })}
                      </button>
                    </div>
                  );
                })}
              </section>
            </div>
          )}

          {tab === 'security' && (
            <div className="space-y-3.5" data-testid="phone-tab-security">
              <h2 className="font-display font-bold text-sm uppercase tracking-wider text-[#e5dbc8]">
                {t('phone.security.heading')}
              </h2>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#20262e] border border-[#38404a] p-2.5">
                  <div className="text-[11px] font-mono-hud text-[#9ea6b0] uppercase">
                    {t('phone.security.doorsLocked')}
                  </div>
                  <div className="font-mono-hud font-bold text-lg text-[#f2ece1]">
                    {lockedDoors} / {playerDoors.length}
                  </div>
                </div>
                <div className="bg-[#20262e] border border-[#38404a] p-2.5">
                  <div className="text-[11px] font-mono-hud text-[#9ea6b0] uppercase">
                    {t('phone.security.windowsBarricaded')}
                  </div>
                  <div className="font-mono-hud font-bold text-lg text-[#f2ece1]">
                    {barricadedWindows} / {playerWindows.length}
                  </div>
                </div>
                <div className="bg-[#20262e] border border-[#38404a] p-2.5">
                  <div className="text-[11px] font-mono-hud text-[#9ea6b0] uppercase">
                    {t('phone.security.defensesActive')}
                  </div>
                  <div className="font-mono-hud font-bold text-lg text-[#b7c88d]">
                    {activeDefenses}
                  </div>
                </div>
                <div className="bg-[#20262e] border border-[#38404a] p-2.5">
                  <div className="text-[11px] font-mono-hud text-[#9ea6b0] uppercase">
                    {t('phone.security.guardDog')}
                  </div>
                  <div className="font-display font-bold text-sm text-[#e8d9be] mt-0.5">
                    {hasGuardDog
                      ? t('phone.security.guardDogReady')
                      : t('phone.security.guardDogNone')}
                  </div>
                </div>
              </div>

              <div
                className={`p-3 border flex items-center justify-between ${
                  activeRobbers > 0
                    ? 'bg-[#361d1b] border-[#d45446]'
                    : 'bg-[#1d252b] border-[#384752]'
                }`}
              >
                <span className="font-display font-bold text-xs uppercase tracking-wider">
                  {t('phone.security.intruders')}
                </span>
                <span className="font-mono-hud font-bold text-base">
                  {activeRobbers}
                </span>
              </div>

              {/* 911 Emergency Dispatch Button */}
              <button
                type="button"
                disabled={p3.police.status !== 'idle' || p3.police.cooldown > 0}
                onClick={onCall911}
                className={`w-full py-3 font-display font-extrabold text-sm tracking-widest uppercase border-2 transition-colors ${
                  p3.police.status === 'idle' && p3.police.cooldown <= 0
                    ? 'bg-[#bd3a30] hover:bg-[#d6453a] text-[#fff6f2] border-[#f4c0b8] cursor-pointer'
                    : 'bg-[#272e36] text-[#9aa3ad] border-[#434c57] cursor-not-allowed'
                }`}
              >
                {p3.police.status === 'en_route'
                  ? t('phone.security.policeEnRoute')
                  : p3.police.status === 'on_scene'
                    ? t('phone.security.policeOnScene')
                    : p3.police.status === 'departing'
                      ? t('phone.security.policeDeparting')
                      : p3.police.cooldown > 0
                        ? t('phone.security.policeCooldown', {
                            sec: Math.ceil(p3.police.cooldown),
                          })
                        : t('phone.security.call911')}
              </button>

              <p className="text-[11px] font-mono-hud text-[#99a1ab] leading-relaxed">
                {t('phone.security.falseAlarmNote')}
              </p>

              {/* Night Raid Drill Trigger so players can immediately test their home defenses */}
              <button
                type="button"
                onClick={onTriggerRaid}
                className="w-full py-2 font-mono-hud font-bold text-xs uppercase tracking-wider bg-[#242c35] hover:bg-[#313c48] text-[#dfd5c3] border border-[#525d69] cursor-pointer"
              >
                {t('phone.security.triggerRaid')}
              </button>
            </div>
          )}

          {tab === 'missions' && (
            <div className="space-y-2.5" data-testid="phone-tab-missions">
              <h2 className="font-display font-bold text-sm uppercase tracking-wider text-[#e5dbc8]">
                {t('phone.missions.heading')}
              </h2>
              {p3.missions.map((m) => (
                <div
                  key={m.id}
                  className="bg-[#20262e] border border-[#38404a] p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-display font-bold text-sm text-[#f2ece1]">
                      {t(m.titleKey)}
                    </div>
                    <div className="text-xs text-[#a5adb7] leading-snug">{t(m.descKey)}</div>
                  </div>
                  {m.claimed ? (
                    <span className="shrink-0 font-mono-hud text-xs font-bold uppercase text-[#7fa872]">
                      {t('phone.missions.claimed')}
                    </span>
                  ) : m.completed ? (
                    <button
                      type="button"
                      onClick={() => onClaimMission(m.id)}
                      className="shrink-0 px-3 py-1.5 font-mono-hud text-xs font-bold uppercase bg-[#4b8a58] hover:bg-[#5ca36b] text-[#f4fff6] border border-[#a9e0b5] cursor-pointer"
                    >
                      {t('phone.missions.claim', { reward: m.reward })}
                    </button>
                  ) : (
                    <span className="shrink-0 font-mono-hud text-xs font-bold text-[#c9b998]">
                      {t('phone.missions.inProgress', { progress: m.progress, goal: m.goal })} · $
                      {m.reward}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'feed' && (
            <div className="space-y-3" data-testid="phone-tab-feed">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display font-bold text-sm uppercase tracking-wider text-[#e5dbc8]">
                  {t('phone.feed.heading')}
                </h2>
                <button
                  type="button"
                  disabled={p3.photoCooldown > 0}
                  onClick={onPostPhoto}
                  className={`px-3 py-1.5 font-mono-hud text-xs font-bold uppercase border ${
                    p3.photoCooldown <= 0
                      ? 'bg-[#c67134] hover:bg-[#dc8543] text-[#141618] border-[#f2dec0] cursor-pointer'
                      : 'bg-[#262b30] text-[#777e87] border-[#3d4248] cursor-not-allowed'
                  }`}
                >
                  {t('phone.feed.snapPhoto')}
                </button>
              </div>

              <div className="space-y-2.5" data-testid="phone-feed-list">
                {sim.state.socialFeed.map((post) => (
                  <article
                    key={post.id}
                    className="bg-[#20262e] border border-[#38404a] p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono-hud text-[#9ea8b3]">
                      <span className="font-bold text-[#e3d4b8]">
                        {t(`phone.author.${post.authorId}`)}
                      </span>
                      <span>{t('phone.feed.dayLabel', { day: post.timestampDay })}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-[#eef0f2] leading-relaxed">
                      {t(post.captionKey)}
                    </p>
                    <div className="text-[11px] font-mono-hud text-[#8eb8d9]">
                      {t('phone.feed.likes', { count: post.likes })}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
