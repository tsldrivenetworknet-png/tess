import { useEffect, useMemo, useState, useCallback } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  Gift,
  Heart,
  Info,
  Menu,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Ticket,
  Truck,
  Wallet,
  X,
  Zap,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  getExtendedContent,
  type ExtendedSiteContent,
  type DemoNotification,
} from "@/lib/siteContent";
import {
  fetchDrops,
  fetchSiteConfig,
  fetchWalletConfig,
  type DbDrop,
  type DbSiteConfig,
  type DbWalletConfig,
} from "@/lib/supabase";

type DropCategory = "All drops" | "Giveaways" | "Shop";
const categories: DropCategory[] = ["All drops", "Giveaways", "Shop"];

const DEFAULT_SITE: DbSiteConfig = {
  id: 1,
  site_name: "dropclub",
  logo_url: "",
  icon_url: "",
  announcement_text: "FRESH FINDS. REAL WINNERS. YOUR NEXT FAVOURITE STARTS HERE.",
  hero_headline: "A little luck.\nA lot of love.",
  hero_subtitle: "Your next favourite thing is one drop away.",
  hero_image_url: "",
  hero_entries: "",
  hero_prize_value: "",
  hero_delivery_fee: "",
  footer_text: "2026 Drop Club. Good things happen here.",
  updated_at: "",
};

const DEFAULT_WALLET: DbWalletConfig = {
  id: 1,
  primary_address: "",
  primary_coin: "ETH",
  secondary_address: "",
  secondary_coin: "BTC",
  accepted_coins: ["ETH", "BTC", "USDC"],
  updated_at: "",
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Drop Club - Limited-time prizes and finds" },
      { name: "description", content: "Claim curated prize drops or shop standout finds." },
      { property: "og:title", content: "Drop Club - Limited-time prizes and finds" },
      { property: "og:description", content: "Claim curated prize drops or shop standout finds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Drop Club - Limited-time prizes and finds" },
      { name: "twitter:description", content: "Claim curated prize drops or shop standout finds." },
    ],
  }),
  component: Index,
});

function formatCountdown(totalSeconds: number) {
  const remaining = Math.max(0, totalSeconds);
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  return `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

function formatShippingCountdown(totalSeconds: number) {
  const remaining = Math.max(0, totalSeconds);
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  return `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

function ClockBlocks({ seconds, label }: { seconds: number; label?: string }) {
  const remaining = Math.max(0, seconds);
  const values = [
    { value: Math.floor(remaining / 86400), label: "days" },
    { value: Math.floor((remaining % 86400) / 3600), label: "hrs" },
    { value: Math.floor((remaining % 3600) / 60), label: "min" },
    { value: remaining % 60, label: "sec" },
  ];
  return (
    <div className="countdown-wrap" aria-label={`${label ?? "Drop ends in"} ${formatCountdown(seconds)}`}>
      {label ? <span className="countdown-label">{label}</span> : null}
      <div className="countdown" aria-hidden="true">
        {values.map((part, index) => (
          <span className="countdown" key={part.label}>
            {index > 0 ? <span className="countdown-colon">:</span> : null}
            <span className="countdown-unit">
              <span className="countdown-number">{String(part.value).padStart(2, "0")}</span>
              <span className="countdown-caption">{part.label}</span>
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Index() {
  // ── Data from Supabase ───────────────────────────────────────
  const [drops, setDrops] = useState<DbDrop[]>([]);
  const [siteConfig, setSiteConfig] = useState<DbSiteConfig>(DEFAULT_SITE);
  const [walletConfig, setWalletConfig] = useState<DbWalletConfig>(DEFAULT_WALLET);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [dropsData, siteData, walletData] = await Promise.all([
        fetchDrops(),
        fetchSiteConfig(),
        fetchWalletConfig(),
      ]);
      setDrops(dropsData);
      setSiteConfig(siteData);
      setWalletConfig(walletData);
    } catch (err) {
      console.error("Failed to load data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Reload when window regains focus (admin may have changed data)
  useEffect(() => {
    const onFocus = () => loadData();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadData]);

  // ── UI state ─────────────────────────────────────────────────
  const [elapsed, setElapsed] = useState(0);
  const [shippingSeconds, setShippingSeconds] = useState(86400 + 14400 + 1800); // Live ~28h shipping window
  const [category, setCategory] = useState<DropCategory>("All drops");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [savedDrops, setSavedDrops] = useState<string[]>([]);
  const [toasts, setToasts] = useState<{ id: number; title: string; message: string }[]>([]);
  const [extContent, setExtContent] = useState<ExtendedSiteContent>(() => getExtendedContent());
  const [currentAlert, setCurrentAlert] = useState<DemoNotification | null>(null);

  // Sync extended site content and alerts when admin updates it
  useEffect(() => {
    const handler = () => {
      setExtContent(getExtendedContent());
    };
    window.addEventListener("dropclub_content_updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("dropclub_content_updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  // 2-minute interval demo claim notifications with mobile vibration
  useEffect(() => {
    if (!extContent.demoNotificationsEnabled || extContent.demoNotifications.length === 0) {
      setCurrentAlert(null);
      return;
    }

    let idx = 0;
    const triggerAlert = () => {
      const list = extContent.demoNotifications;
      if (!list || list.length === 0) return;
      const notif = list[idx % list.length];
      idx++;
      setCurrentAlert(notif);

      // Trigger device vibration on supported mobile devices
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate([120, 60, 120]);
        } catch {
          // Unsupported or blocked in desktop context
        }
      }

      // Auto dismiss after 7 seconds
      window.setTimeout(() => {
        setCurrentAlert((active) => (active?.id === notif.id ? null : active));
      }, 7000);
    };

    // Show initial notification early (6 seconds) for immediate demo feedback
    const initialTimer = window.setTimeout(triggerAlert, 6000);
    // Cycle every 2 minutes (120,000 ms)
    const intervalTimer = window.setInterval(triggerAlert, 120000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(intervalTimer);
    };
  }, [extContent.demoNotificationsEnabled, extContent.demoNotifications]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setElapsed((c) => c + 1);
      setShippingSeconds((s) => (s > 1 ? s - 1 : 86400));
    }, 1000);
    return () => window.clearInterval(tick);
  }, []);

  // Update browser favicon dynamically when site icon is changed in admin
  useEffect(() => {
    if (siteConfig.icon_url) {
      let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = siteConfig.icon_url;
    }
  }, [siteConfig.icon_url]);

  // Set default crypto when wallet loads
  useEffect(() => {
    if (walletConfig.accepted_coins.length > 0 && !crypto) {
      setCrypto(walletConfig.accepted_coins[0]);
    }
  }, [walletConfig, crypto]);

  const visibleDrops = useMemo(() => {
    const query = search.trim().toLowerCase();
    return drops.filter((drop) => {
      const matchesCategory =
        category === "All drops" ||
        (category === "Giveaways" && drop.kind === "giveaway") ||
        (category === "Shop" && drop.kind === "shop");
      return matchesCategory && (!query || `${drop.name} ${drop.category}`.toLowerCase().includes(query));
    });
  }, [drops, category, search]);

  const addToast = (title: string, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((items) => [...items, { id, title, message }]);
    window.setTimeout(() => setToasts((items) => items.filter((t) => t.id !== id)), 4800);
  };

  const navigate = useNavigate();

  const beginDropAction = (drop: DbDrop) => {
    navigate({
      to: "/checkout",
      search: { dropId: drop.id, action: drop.kind },
    });
  };

  const toggleSaved = (id: string) => {
    setSavedDrops((current) => {
      const isSaved = current.includes(id);
      addToast(
        isSaved ? "Removed from saved" : "Saved for later",
        isSaved ? "Drop removed from your list." : "We will keep this close by.",
      );
      return isSaved ? current.filter((s) => s !== id) : [...current, id];
    });
  };

  const heroFeaturedDrop = drops[0] ?? null;
  const heroLines = (siteConfig.hero_headline || "A little luck.\nA lot of love.")
    .replace(/\\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading drops...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="site-shell">
      {/* Announcement */}
      <div className="announcement">
        <Sparkles size={12} aria-hidden="true" />
        {siteConfig.announcement_text}
        <ArrowRight size={12} aria-hidden="true" />
      </div>

      {/* Big Top Countdown Bar */}
      {heroFeaturedDrop && (
        (() => {
          const rem = Math.max(0, heroFeaturedDrop.time_left - elapsed);
          const isExpired = rem <= 0;
          const days = Math.floor(rem / 86400);
          const hours = Math.floor((rem % 86400) / 3600);
          const mins = Math.floor((rem % 3600) / 60);
          const secs = rem % 60;

          return (
            <aside className="top-countdown-bar" aria-label="Limited drop countdown">
              <div className="top-countdown-inner">
                <div className="top-countdown-lead">
                  <span className="top-countdown-badge">
                    <span className={isExpired ? "live-dot bg-destructive animate-none" : "live-dot"} />
                    {isExpired ? "ROUND CLOSED" : (extContent.topCountdownBadge || "FLASH DROP CLOSING")}
                  </span>
                  <span className="top-countdown-text">
                    <strong>{heroFeaturedDrop.name}</strong> · {isExpired ? "Claim window has ended for this round!" : (extContent.topCountdownText || "Claim window closing soon!")}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`top-countdown-timer ${isExpired ? "opacity-60" : ""}`}>
                    <div className="top-countdown-card">
                      <span className="top-countdown-digit">{String(days).padStart(2, "0")}</span>
                      <span className="top-countdown-unit-tag">days</span>
                    </div>
                    <span className="top-countdown-sep">:</span>
                    <div className="top-countdown-card">
                      <span className="top-countdown-digit">{String(hours).padStart(2, "0")}</span>
                      <span className="top-countdown-unit-tag">hrs</span>
                    </div>
                    <span className="top-countdown-sep">:</span>
                    <div className="top-countdown-card">
                      <span className="top-countdown-digit">{String(mins).padStart(2, "0")}</span>
                      <span className="top-countdown-unit-tag">min</span>
                    </div>
                    <span className="top-countdown-sep">:</span>
                    <div className="top-countdown-card">
                      <span className="top-countdown-digit">{String(secs).padStart(2, "0")}</span>
                      <span className="top-countdown-unit-tag">sec</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="top-countdown-cta"
                    disabled={isExpired}
                    onClick={() => !isExpired && beginDropAction(heroFeaturedDrop)}
                  >
                    {isExpired ? (
                      "Round Ended"
                    ) : (
                      <>
                        <Ticket size={13} className="mr-1" /> Claim now
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </aside>
          );
        })()
      )}

      {/* Header */}
      <header className="site-header">
        <div className="header-inner">
          <a href="#top" className="brand-mark" aria-label={`${siteConfig.site_name} home`}>
            {siteConfig.logo_url ? (
              <img src={siteConfig.logo_url} alt={siteConfig.site_name} className="h-8 w-auto object-contain" />
            ) : (
              <>
                {siteConfig.icon_url ? (
                  <img src={siteConfig.icon_url} alt="" className="h-7 w-7 rounded object-contain" />
                ) : (
                  <span className="brand-symbol"><Zap size={17} fill="currentColor" /></span>
                )}
                <span>{siteConfig.site_name}<span className="text-primary">.</span></span>
              </>
            )}
          </a>
          <nav className="header-nav" aria-label="Main navigation">
            <a href="#drops">The drops</a>
            <a href="#how-it-works">How it works</a>
          </nav>
          <div className="header-actions">
            <Button variant="ghost" size="icon" className="icon-action" aria-label={searchOpen ? "Close search" : "Search drops"} onClick={() => setSearchOpen((o) => !o)}>
              {searchOpen ? <X size={16} /> : <Search size={16} />}
            </Button>
            <Button variant="ghost" size="icon" className="icon-action" aria-label="Notifications" onClick={() => setNotificationsOpen(true)}>
              <Bell size={16} />
            </Button>
          </div>
        </div>
        {searchOpen && (
          <div className="page-container pb-3">
            <label className="sr-only" htmlFor="drop-search">Search prize drops</label>
            <Input id="drop-search" autoFocus placeholder="Search prizes, categories..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        )}
      </header>

      <main id="top">
        {/* Hero */}
        <section className="page-container hero-section" aria-labelledby="hero-heading">
          <div className="hero-card">
            <div className="hero-copy">
              <span className="eyebrow hero-eyebrow"><span className="live-dot" /> THE DROP OF THE WEEK</span>
              <h1 className="hero-title" id="hero-heading">
                {heroLines.map((line, i) => (
                  <span key={i} className="block">
                    {i === heroLines.length - 1 ? <em>{line}</em> : line}
                  </span>
                ))}
              </h1>
              <p className="hero-subtitle">{siteConfig.hero_subtitle}</p>
              {heroFeaturedDrop && (
                <>
                  <ClockBlocks seconds={heroFeaturedDrop.time_left - elapsed} label="Closing in" />
                  <Button className="hero-cta h-11 rounded-full px-5 text-xs font-extrabold" onClick={() => beginDropAction(heroFeaturedDrop)}>
                    <Ticket size={15} /> Claim giveaway <ChevronRight size={15} />
                  </Button>
                  {(siteConfig.hero_entries || siteConfig.hero_prize_value || siteConfig.hero_delivery_fee) && (
                    <div className="feature-meta">
                      {siteConfig.hero_entries && <span><strong>{siteConfig.hero_entries}</strong> entries</span>}
                      {siteConfig.hero_entries && siteConfig.hero_prize_value && <span>·</span>}
                      {siteConfig.hero_prize_value && <span><strong>{siteConfig.hero_prize_value}</strong> prize value</span>}
                      {siteConfig.hero_delivery_fee && <><span>·</span><span>Just <strong>{siteConfig.hero_delivery_fee}</strong> delivery</span></>}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="hero-image-wrap">
              {(siteConfig.hero_image_url || heroFeaturedDrop?.image_url) ? (
                <img
                  className="hero-image"
                  src={siteConfig.hero_image_url || heroFeaturedDrop?.image_url}
                  alt={heroFeaturedDrop?.image_alt ?? "Featured drop"}
                />
              ) : (
                <div className="hero-image-placeholder" />
              )}
              <div className="hero-stamp">ONE OF<br />A KIND<br />*</div>
              {heroFeaturedDrop && (
                <div className="hero-image-label"><PackageCheck size={13} /> {heroFeaturedDrop.delivery_time}</div>
              )}
            </div>
          </div>
        </section>

        {/* Drops grid */}
        <section className="page-container content-layout" id="drops" aria-labelledby="drops-heading">
          <div>
            <div className="section-topline">
              <div>
                <span className="eyebrow text-primary"><Sparkles size={12} /> {extContent.sectionEyebrow || "HANDPICKED FOR YOU"}</span>
                <h2 className="section-title mt-2" id="drops-heading">{extContent.sectionTitle || "The good stuff"}</h2>
                <p className="section-caption">{extContent.sectionCaption || "Good things do not wait. Neither do these."}</p>
              </div>
              <a className="text-link hidden items-center gap-1 text-[10px] font-bold text-primary sm:flex" href="#drops">See all drops <ArrowRight size={13} /></a>
            </div>
            <div className="filter-row" role="group" aria-label="Filter drop type">
              {categories.map((item) => (
                <Button key={item} type="button" variant="ghost" className="filter-chip" aria-pressed={category === item} onClick={() => setCategory(item)}>
                  {item === "Giveaways" ? <Gift size={12} /> : item === "Shop" ? <Wallet size={12} /> : <Menu size={12} />}
                  {item}
                  {item === "All drops" ? <span>{drops.length.toString().padStart(2, "0")}</span> : null}
                </Button>
              ))}
            </div>
            <div className="product-grid">
              {visibleDrops.map((drop) => {
                const isDropExpired = drop.time_left - elapsed <= 0;
                return (
                  <article className="product-card" key={drop.id}>
                    <div className="product-image-frame">
                      {drop.image_url ? (
                        <img className="product-image" src={drop.image_url} alt={drop.image_alt} />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted">
                          <Gift size={28} className="text-muted-foreground/40" />
                        </div>
                      )}
                      <span className={`product-badge ${drop.kind === "shop" ? "is-paid" : ""}`}>
                        {drop.kind === "giveaway" ? (
                          <><Gift size={11} className="mr-1 inline text-emerald-400" /> Free Giveaway</>
                        ) : (
                          <><ShoppingBag size={11} className="mr-1 inline text-foreground" /> Direct Purchase</>
                        )}
                      </span>
                      <Button variant="ghost" size="icon" className="product-save" aria-label={savedDrops.includes(drop.id) ? `Remove ${drop.name} from saved` : `Save ${drop.name}`} onClick={() => toggleSaved(drop.id)}>
                        <Heart size={14} fill={savedDrops.includes(drop.id) ? "currentColor" : "none"} />
                      </Button>
                    </div>

                    <div className="product-card-body">
                      <div className="product-category">{drop.category}</div>
                      <h3 className="product-name">{drop.name}</h3>

                      <div className="product-value">
                        {drop.kind === "shop" ? (
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl font-black text-foreground">{drop.amount}</span>
                            <span className="text-xs text-muted-foreground line-through">{drop.prize_value}</span>
                          </div>
                        ) : (
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">100% FREE</span>
                            <span className="text-xs text-muted-foreground font-medium">({drop.prize_value} value)</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
                        <span className="inline-flex items-center gap-1 font-mono font-semibold text-foreground">
                          <Clock3 size={12} className="text-muted-foreground" />
                          {isDropExpired ? "Round Ended" : formatCountdown(drop.time_left - elapsed)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px]">
                          <Truck size={12} /> {drop.delivery_fee} delivery
                        </span>
                      </div>

                      <div className="mt-4">
                        <Button
                          size="sm"
                          className="w-full rounded-full h-10 font-bold text-xs shadow-sm cursor-pointer"
                          disabled={isDropExpired}
                          onClick={() => !isDropExpired && beginDropAction(drop)}
                        >
                          {isDropExpired
                            ? "Allocation Ended"
                            : drop.kind === "giveaway"
                            ? "Claim This Tesla Drop"
                            : `Buy Now · ${drop.amount}`}
                          {!isDropExpired && <ArrowRight size={13} className="ml-1" />}
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
              {visibleDrops.length === 0 && (
                <p className="col-span-full py-12 text-center text-sm text-muted-foreground">
                  {drops.length === 0 ? "No drops available yet. Check back soon." : "No drops match that search."}
                </p>
              )}
            </div>
          </div>

          <aside className="sidebar" aria-label="More drops and updates">
            {drops.length > 0 && (
              <section className="side-module">
                <div className="side-heading"><span>On everyone's list</span><span className="text-primary">up</span></div>
                <div className="side-feature">
                  {drops[drops.length - 1].image_url ? (
                    <img className="side-feature-image" src={drops[drops.length - 1].image_url} alt={drops[drops.length - 1].image_alt} />
                  ) : (
                    <div className="side-feature-image flex items-center justify-center bg-muted"><Gift size={24} className="text-muted-foreground/40" /></div>
                  )}
                  <div className="side-feature-info">
                    <p className="product-category">MOST-LOVED DROP · {drops[drops.length - 1].category.split("·")[0].trim()}</p>
                    <h3 className="side-feature-title">{drops[drops.length - 1].name}</h3>
                    <div className="side-feature-row">
                      <span>{drops[drops.length - 1].entry_label}</span>
                      <span className="side-timer">{formatCountdown(drops[drops.length - 1].time_left - elapsed)}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[9px] text-muted-foreground">{drops[drops.length - 1].delivery_fee !== "Free" ? drops[drops.length - 1].delivery_fee + " delivery" : "Free delivery"}</span>
                      <Button size="sm" className="h-7 rounded-full px-3 text-[9px]" onClick={() => beginDropAction(drops[drops.length - 1])}>Take a look <ArrowRight size={11} /></Button>
                    </div>
                  </div>
                </div>
              </section>
            )}
            {drops.length >= 2 && (
              <section className="side-module">
                <div className="side-heading"><span>Almost gone</span><small>Tick-tock <Clock3 size={11} className="ml-1 inline" /></small></div>
                <div className="featured-list">
                  {drops.slice(0, 2).map((drop) => (
                    <button className="featured-row w-full border-0 bg-transparent p-0 text-left" type="button" key={drop.id} onClick={() => beginDropAction(drop)}>
                      {drop.image_url ? (
                        <img className="featured-thumb" src={drop.image_url} alt="" />
                      ) : (
                        <div className="featured-thumb flex items-center justify-center bg-muted rounded"><Gift size={14} className="text-muted-foreground/40" /></div>
                      )}
                      <span>
                        <span className="featured-name block">{drop.name}</span>
                        <span className="featured-sub">{drop.kind === "shop" ? `${drop.amount} · ${drop.entry_label}` : `${drop.entry_label} · ${drop.delivery_fee} delivery`}</span>
                      </span>
                      <span className="featured-time">{formatCountdown(drop.time_left - elapsed).split(" ").slice(0, 2).join(" ")}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </section>

        {/* How it works */}
        <section className="how-band" id="how-it-works">
          <div className="page-container how-inner">
            <div className="how-step"><span className="how-number">01</span><span><strong>Find your next favourite</strong><span>Thoughtful drops, fresh every week.</span></span></div>
            <div className="how-step"><span className="how-number">02</span><span><strong>Claim or make it yours</strong><span>Giveaways to claim, goodies to shop.</span></span></div>
            <div className="how-step"><span className="how-number">03</span><span><strong>We will keep you in the loop</strong><span>Every winner gets a little happy dance.</span></span></div>
          </div>
        </section>
      </main>

      <footer className="page-container site-footer">
        <span>{siteConfig.footer_text}</span>
        <span className="flex items-center gap-3">
          <span><ShieldCheck size={11} className="mr-1 inline" />Thoughtfully picked</span>
          <a className="text-link" href="#top">Back to top</a>
        </span>
      </footer>

      {/* ── Notifications ──────────────────────────────────────── */}
      <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <DialogContent className="gap-5 rounded-md p-5 sm:max-w-[380px] sm:p-6">
          <DialogTitle className="font-serif text-2xl">Little updates.</DialogTitle>
          <DialogDescription className="modal-copy">The good news and the almost-gone news.</DialogDescription>
          <div className="grid gap-3">
            {drops.slice(0, 2).map((drop) => (
              <div key={drop.id} className="flex items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                <span className="toast-icon"><Sparkles size={14} /></span>
                <p className="m-0 text-[11px] leading-relaxed">
                  <strong className="mb-1 block">{drop.name}</strong>
                  {drop.kind === "giveaway" ? `${drop.entry_label} · ${drop.delivery_fee} delivery` : `${drop.amount} · ${drop.entry_label}`}
                </p>
              </div>
            ))}
            {drops.length === 0 && <p className="text-xs text-muted-foreground">No drops yet.</p>}
          </div>
          <Button variant="outline" className="w-full rounded-full" onClick={() => setNotificationsOpen(false)}>Lovely, thanks <Check size={14} /></Button>
        </DialogContent>
      </Dialog>

      {/* ── Live Claim Notification Popup (2-min interval + vibrate) ── */}
      {currentAlert && (
        <aside className="claim-alert-popup" aria-live="polite">
          <div className="claim-alert-icon">
            <Gift size={16} />
          </div>
          <div className="claim-alert-content">
            <div className="claim-alert-title">
              <span>{currentAlert.name}</span>
              <span className="claim-alert-location">({currentAlert.location})</span>
            </div>
            <div className="claim-alert-desc">
              Just claimed <strong>{currentAlert.dropName}</strong> · {currentAlert.timeAgo}
            </div>
          </div>
          <button
            type="button"
            className="claim-alert-close"
            onClick={() => setCurrentAlert(null)}
            aria-label="Close notification"
          >
            <X size={12} />
          </button>
        </aside>
      )}

      {/* ── Toast stack ────────────────────────────────────────── */}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div className="toast-card" key={toast.id}>
            <span className="toast-icon"><CheckCircle2 size={15} /></span>
            <span className="toast-copy"><strong>{toast.title}</strong>{toast.message}</span>
            <Button variant="ghost" size="icon" className="toast-close" aria-label="Dismiss" onClick={() => setToasts((items) => items.filter((i) => i.id !== toast.id))}><X size={13} /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}