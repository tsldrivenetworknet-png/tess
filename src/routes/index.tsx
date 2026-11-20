import { useEffect, useMemo, useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
  Sparkles,
  Ticket,
  Wallet,
  X,
  Zap,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { QrCode } from "@/components/QrCode";
import { COUNTRIES } from "@/lib/countries";
import {
  fetchDrops,
  fetchSiteConfig,
  fetchWalletConfig,
  fetchWalletQrUrls,
  createOrder,
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function Index() {
  // ── Data from Supabase ───────────────────────────────────────
  const [drops, setDrops] = useState<DbDrop[]>([]);
  const [siteConfig, setSiteConfig] = useState<DbSiteConfig>(DEFAULT_SITE);
  const [walletConfig, setWalletConfig] = useState<DbWalletConfig>(DEFAULT_WALLET);
  const [qrUrls, setQrUrls] = useState<{ primaryQr: string; secondaryQr: string }>({ primaryQr: "", secondaryQr: "" });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [dropsData, siteData, walletData, qrData] = await Promise.all([
        fetchDrops(),
        fetchSiteConfig(),
        fetchWalletConfig(),
        fetchWalletQrUrls(),
      ]);
      setDrops(dropsData);
      setSiteConfig(siteData);
      setWalletConfig(walletData);
      setQrUrls(qrData);
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
  const [selectedDrop, setSelectedDrop] = useState<DbDrop | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [crypto, setCrypto] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [street, setStreet] = useState("");
  const [apartment, setApartment] = useState("");
  const [city, setCity] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("United States");
  const [savedDrops, setSavedDrops] = useState<string[]>([]);
  const [toasts, setToasts] = useState<{ id: number; title: string; message: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [claimDone, setClaimDone] = useState(false);
  const [checkoutDone, setCheckoutDone] = useState(false);

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

  const resetForm = () => {
    setEmail("");
    setFullName("");
    setStreet("");
    setApartment("");
    setCity("");
    setStateProvince("");
    setPostalCode("");
    setCountry("United States");
  };

  const isAddressValid = Boolean(
    street.trim() &&
    city.trim() &&
    stateProvince.trim() &&
    postalCode.trim() &&
    country.trim()
  );

  const getFormattedAddress = () => {
    return [
      street.trim(),
      apartment.trim() ? `Apt ${apartment.trim()}` : "",
      city.trim(),
      `${stateProvince.trim()} ${postalCode.trim()}`.trim(),
      country.trim(),
    ].filter(Boolean).join(", ");
  };

  const getAddressNotes = () => {
    return `Street: ${street.trim()} | Apt: ${apartment.trim()} | City: ${city.trim()} | State: ${stateProvince.trim()} | PostalCode: ${postalCode.trim()} | Country: ${country.trim()}`;
  };

  const openClaim = (drop: DbDrop) => {
    setSelectedDrop(drop);
    setClaimDone(false);
    resetForm();
    setCrypto(walletConfig.accepted_coins[0] ?? walletConfig.primary_coin ?? "ETH");
    setClaimOpen(true);
  };

  const openCheckout = (drop: DbDrop) => {
    setSelectedDrop(drop);
    setCheckoutDone(false);
    resetForm();
    setCrypto(walletConfig.accepted_coins[0] ?? walletConfig.primary_coin ?? "ETH");
    setCheckoutOpen(true);
  };

  const beginDropAction = (drop: DbDrop) => {
    if (drop.kind === "giveaway") openClaim(drop);
    else openCheckout(drop);
  };

  // Robust wallet address calculation (never empty, falls back gracefully)
  const selectedWalletAddress = useMemo(() => {
    let addr = "";
    if (crypto === walletConfig.secondary_coin && walletConfig.secondary_address?.trim()) {
      addr = walletConfig.secondary_address.trim();
    } else if (walletConfig.primary_address?.trim()) {
      addr = walletConfig.primary_address.trim();
    } else if (walletConfig.secondary_address?.trim()) {
      addr = walletConfig.secondary_address.trim();
    } else {
      addr = crypto === "BTC"
        ? "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq"
        : "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
    }
    return addr;
  }, [crypto, walletConfig]);

  // Active QR code image uploaded from Admin (if available)
  const activeQrUrl = useMemo(() => {
    if (crypto === walletConfig.secondary_coin && qrUrls.secondaryQr) {
      return qrUrls.secondaryQr;
    }
    if (qrUrls.primaryQr) {
      return qrUrls.primaryQr;
    }
    return "";
  }, [crypto, walletConfig, qrUrls]);

  // Submit giveaway claim: always moves to payment screen to display wallet address & QR
  const submitClaim = async () => {
    if (!selectedDrop) return;
    setSubmitting(true);
    try {
      await createOrder({
        drop_id: selectedDrop.id,
        drop_name: selectedDrop.name,
        kind: "giveaway",
        email,
        full_name: fullName,
        address: getFormattedAddress(),
        status: "entered",
        crypto: crypto || walletConfig.accepted_coins[0] || "ETH",
        amount: "",
        delivery_fee: selectedDrop.delivery_fee,
        notes: getAddressNotes(),
      });
    } catch (err) {
      console.warn("Order submission note:", err);
    } finally {
      setClaimDone(true);
      setSubmitting(false);
    }
  };

  // Submit shop order
  const submitCheckout = async () => {
    if (!selectedDrop) return;
    setSubmitting(true);
    try {
      await createOrder({
        drop_id: selectedDrop.id,
        drop_name: selectedDrop.name,
        kind: "shop",
        email,
        full_name: fullName,
        address: getFormattedAddress(),
        status: "entered",
        crypto: crypto || walletConfig.accepted_coins[0] || "ETH",
        amount: selectedDrop.amount,
        delivery_fee: selectedDrop.delivery_fee,
        notes: getAddressNotes(),
      });
    } catch (err) {
      console.warn("Order submission note:", err);
    } finally {
      setCheckoutDone(true);
      setSubmitting(false);
    }
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
        <aside className="top-countdown-bar" aria-label="Limited drop countdown">
          <div className="top-countdown-inner">
            <div className="top-countdown-lead">
              <span className="top-countdown-badge">
                <span className="live-dot" /> FLASH DROP CLOSING
              </span>
              <span className="top-countdown-text">
                <strong>{heroFeaturedDrop.name}</strong> · Claim window closing soon!
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="top-countdown-timer">
                {(() => {
                  const rem = Math.max(0, heroFeaturedDrop.time_left - elapsed);
                  const days = Math.floor(rem / 86400);
                  const hours = Math.floor((rem % 86400) / 3600);
                  const mins = Math.floor((rem % 3600) / 60);
                  const secs = rem % 60;
                  return (
                    <>
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
                    </>
                  );
                })()}
              </div>
              <Button
                size="sm"
                className="top-countdown-cta"
                onClick={() => beginDropAction(heroFeaturedDrop)}
              >
                <Ticket size={13} className="mr-1" /> Claim now
              </Button>
            </div>
          </div>
        </aside>
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
                <span className="eyebrow text-primary"><Sparkles size={12} /> HANDPICKED FOR YOU</span>
                <h2 className="section-title mt-2" id="drops-heading">The good stuff</h2>
                <p className="section-caption">Good things do not wait. Neither do these.</p>
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
              {visibleDrops.map((drop) => (
                <article className="product-card" key={drop.id}>
                  <div className={`product-image-frame ${drop.kind === "giveaway" ? "is-sneaker" : ""}`}>
                    {drop.image_url ? (
                      <img className="product-image" src={drop.image_url} alt={drop.image_alt} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted">
                        <Gift size={28} className="text-muted-foreground/40" />
                      </div>
                    )}
                    <span className={`product-badge ${drop.kind === "shop" ? "is-paid" : ""}`}>
                      {drop.kind === "giveaway" ? <Gift size={10} /> : <Zap size={10} />}
                      {drop.kind === "giveaway" ? "Free giveaway" : "Available to buy"}
                    </span>
                    <Button variant="ghost" size="icon" className="product-save" aria-label={savedDrops.includes(drop.id) ? `Remove ${drop.name} from saved` : `Save ${drop.name}`} onClick={() => toggleSaved(drop.id)}>
                      <Heart size={14} fill={savedDrops.includes(drop.id) ? "currentColor" : "none"} />
                    </Button>
                  </div>
                  <div className="product-card-body">
                    <div className="product-category">{drop.category}</div>
                    <h3 className="product-name">{drop.name}</h3>
                    <div className="product-value">
                      {drop.kind === "shop"
                        ? <><strong>{drop.amount}</strong> <span>· {drop.prize_value}</span></>
                        : <><strong>{drop.prize_value}</strong> prize value</>}
                    </div>
                    <div className="product-timer">
                      <Clock3 size={13} />
                      <span>{formatCountdown(drop.time_left - elapsed)}</span>
                      <span className="product-timer-label">{drop.kind === "shop" ? "OFFER ENDS" : "LEFT TO CLAIM"}</span>
                    </div>
                    <div className="product-footer">
                      <span className="entry-count"><PackageCheck size={12} /> {drop.delivery_fee !== "Free" ? drop.delivery_fee + " delivery" : "Free delivery"} · {drop.delivery_time}</span>
                      <Button size="sm" className="product-cta rounded-full" onClick={() => beginDropAction(drop)}>
                        {drop.kind === "giveaway" ? "Claim" : "Shop"} <ArrowRight size={12} />
                      </Button>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[8px] text-muted-foreground">
                      <span><Ticket size={10} className="mr-1 inline" />{drop.entry_label}</span>
                      <span>{drop.shipping === "Free" ? "Free shipping" : drop.delivery_fee + " delivery"}</span>
                    </div>
                  </div>
                </article>
              ))}
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

      {/* ── Claim Giveaway Dialog ──────────────────────────────── */}
      <Dialog open={claimOpen} onOpenChange={(open) => { setClaimOpen(open); if (!open) { setClaimDone(false); resetForm(); } }}>
        <DialogContent className="max-h-[90dvh] gap-5 overflow-y-auto rounded-md p-5 sm:max-w-[460px] sm:p-6">
          {claimDone ? (
            /* ── Success: show payment info ── */
            <div className="grid gap-4">
              <div className="grid justify-items-center gap-2 text-center">
                <CheckCircle2 size={44} className="text-primary" />
                <DialogTitle className="font-serif text-2xl">Giveaway claimed!</DialogTitle>
                <DialogDescription className="modal-copy">
                  Your claim for <strong>{selectedDrop?.name}</strong> is confirmed. To complete, pay the delivery fee to the wallet below.
                </DialogDescription>
              </div>

              {/* Delivery fee summary */}
              <div className="rounded-md border border-border bg-muted p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">Delivery fee</span>
                  <strong>{selectedDrop?.delivery_fee}</strong>
                </div>
              </div>

              {/* Crypto selector */}
              <div className="checkout-field">
                <span className="checkout-label">Pay delivery fee with</span>
                <div className="crypto-options" role="group">
                  {(walletConfig.accepted_coins.length > 0 ? walletConfig.accepted_coins : ["ETH", "BTC", "USDC"]).map((coin) => (
                    <Button key={coin} type="button" variant="ghost" className="crypto-option" aria-pressed={crypto === coin} onClick={() => setCrypto(coin)}>
                      <span className="font-black">{coin[0]}</span>{coin}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Wallet address + QR */}
              <div className="grid gap-3">
                <div className="rounded-md border border-border bg-muted p-3.5 shadow-sm">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{crypto || "ETH"} Wallet Address</p>
                    <CopyButton text={selectedWalletAddress} />
                  </div>
                  <p className="font-mono text-xs break-all font-semibold select-all text-foreground bg-background/60 p-2 rounded border border-border/50">{selectedWalletAddress}</p>
                </div>

                <div className="flex flex-col items-center justify-center p-4 rounded-md border border-border bg-white dark:bg-card">
                  {activeQrUrl ? (
                    <img
                      src={activeQrUrl}
                      alt={`${crypto} payment QR code`}
                      className="w-44 h-44 object-contain rounded shadow-sm"
                    />
                  ) : (
                    <QrCode value={selectedWalletAddress} size={170} />
                  )}
                  <p className="mt-2 text-center text-[10px] text-muted-foreground font-medium">
                    {activeQrUrl ? "Scan official QR code or copy the address above" : "Scan QR code or copy the address above"}
                  </p>
                </div>
              </div>

              <Button className="h-10 rounded-full font-bold" onClick={() => { setClaimOpen(false); setClaimDone(false); }}>
                Done <Check size={14} />
              </Button>
            </div>
          ) : (
            /* ── Claim form ── */
            <>
              <DialogTitle className="font-serif text-2xl">Claim your giveaway.</DialogTitle>
              <DialogDescription className="modal-copy">
                Fill in your details to claim <strong>{selectedDrop?.name}</strong>. You will pay the delivery fee after.
              </DialogDescription>

              {/* Reassurance Guaranteed Banner */}
              <div className="guaranteed-box">
                <CheckCircle2 size={20} className="shrink-0 text-emerald-600 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <strong className="block text-emerald-950 font-bold">100% Guaranteed Allocation — You Will Get This Item!</strong>
                  <span>Your entry qualifies and reserves this item directly for you. Complete your shipping address below to secure dispatch to your doorstep.</span>
                </div>
              </div>

              {/* Live Shipping Day Countdown */}
              <div className="shipping-timer-box">
                <div className="flex items-center gap-2.5">
                  <Clock3 size={16} className="text-primary shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Estimated Dispatch</span>
                    <span className="text-xs font-bold text-foreground">Dispatches in {formatShippingCountdown(shippingSeconds)}</span>
                  </div>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-extrabold text-primary">Tracked & Insured</span>
              </div>

              {selectedDrop && (
                <div className="checkout-summary">
                  {selectedDrop.image_url ? (
                    <img className="checkout-thumb" src={selectedDrop.image_url} alt="" />
                  ) : (
                    <div className="checkout-thumb flex items-center justify-center bg-muted rounded"><Gift size={20} className="text-muted-foreground/40" /></div>
                  )}
                  <div className="min-w-0 flex-1">
                    <strong className="block text-sm">{selectedDrop.name}</strong>
                    <span className="mt-1 block text-[10px] text-muted-foreground">{selectedDrop.prize_value} prize value</span>
                  </div>
                  <Gift size={18} className="text-primary" />
                </div>
              )}

              <div className="checkout-field">
                <label className="checkout-label" htmlFor="claim-email">Email address</label>
                <Input className="checkout-input" id="claim-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="checkout-field">
                <label className="checkout-label" htmlFor="claim-name">Full name</label>
                <Input className="checkout-input" id="claim-name" placeholder="Your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>

              {/* Structured Shipping Address */}
              <div className="grid gap-2.5 pt-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-foreground">Shipping address</span>

                <div className="checkout-field">
                  <label className="checkout-label" htmlFor="claim-street">Street address</label>
                  <Input className="checkout-input" id="claim-street" placeholder="House number and street name" value={street} onChange={(e) => setStreet(e.target.value)} />
                </div>

                <div className="checkout-field">
                  <label className="checkout-label" htmlFor="claim-apt">Apartment, suite, unit (optional)</label>
                  <Input className="checkout-input" id="claim-apt" placeholder="Apt, Suite, Unit, Building (optional)" value={apartment} onChange={(e) => setApartment(e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="checkout-field">
                    <label className="checkout-label" htmlFor="claim-city">City</label>
                    <Input className="checkout-input" id="claim-city" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <div className="checkout-field">
                    <label className="checkout-label" htmlFor="claim-state">State / Province / Region</label>
                    <Input className="checkout-input" id="claim-state" placeholder="State or Region" value={stateProvince} onChange={(e) => setStateProvince(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="checkout-field">
                    <label className="checkout-label" htmlFor="claim-postcode">Postal / ZIP code</label>
                    <Input className="checkout-input" id="claim-postcode" placeholder="Postal / ZIP" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                  </div>
                  <div className="checkout-field">
                    <label className="checkout-label" htmlFor="claim-country">Country</label>
                    <select className="checkout-select" id="claim-country" value={country} onChange={(e) => setCountry(e.target.value)}>
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {selectedDrop && (
                <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-xs">
                  <div>
                    <span className="font-semibold text-foreground">Delivery fee (paid after)</span>
                    <span className="block text-[10px] text-muted-foreground">Settled with crypto after submitting details</span>
                  </div>
                  <strong className="text-sm">{selectedDrop.delivery_fee}</strong>
                </div>
              )}

              <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
                <Info size={13} className="mt-0.5 shrink-0" />
                <span>After submitting, you will receive the crypto wallet address and QR code to pay your delivery fee.</span>
              </div>

              <Button
                className="h-11 w-full rounded-full font-bold"
                disabled={!email.includes("@") || !fullName.trim() || !isAddressValid || submitting}
                onClick={submitClaim}
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
                {submitting ? "Reserving your drop..." : "Claim giveaway"}
                {!submitting && <ArrowRight size={15} />}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Shop Checkout Dialog ───────────────────────────────── */}
      <Dialog open={checkoutOpen} onOpenChange={(open) => { setCheckoutOpen(open); if (!open) { setCheckoutDone(false); resetForm(); } }}>
        <DialogContent className="max-h-[90dvh] gap-5 overflow-y-auto rounded-md p-5 sm:max-w-[460px] sm:p-6">
          {checkoutDone ? (
            <div className="grid gap-4">
              <div className="grid justify-items-center gap-2 text-center">
                <CheckCircle2 size={44} className="text-primary" />
                <DialogTitle className="font-serif text-2xl">Order received!</DialogTitle>
                <DialogDescription className="modal-copy">
                  Your order for <strong>{selectedDrop?.name}</strong> is confirmed. Send payment to the wallet below.
                </DialogDescription>
              </div>

              <div className="rounded-md border border-border bg-muted p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">Amount</span>
                  <strong>{selectedDrop?.amount}</strong>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-muted-foreground text-xs">Delivery</span>
                  <strong>{selectedDrop?.delivery_fee}</strong>
                </div>
              </div>

              {/* Wallet address + QR */}
              <div className="grid gap-3">
                <div className="rounded-md border border-border bg-muted p-3.5 shadow-sm">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{crypto || "ETH"} Wallet Address</p>
                    <CopyButton text={selectedWalletAddress} />
                  </div>
                  <p className="font-mono text-xs break-all font-semibold select-all text-foreground bg-background/60 p-2 rounded border border-border/50">{selectedWalletAddress}</p>
                </div>

                <div className="flex flex-col items-center justify-center p-4 rounded-md border border-border bg-white dark:bg-card">
                  {activeQrUrl ? (
                    <img
                      src={activeQrUrl}
                      alt={`${crypto} payment QR code`}
                      className="w-44 h-44 object-contain rounded shadow-sm"
                    />
                  ) : (
                    <QrCode value={selectedWalletAddress} size={170} />
                  )}
                  <p className="mt-2 text-center text-[10px] text-muted-foreground font-medium">
                    {activeQrUrl ? "Scan official QR code or copy the address above" : "Scan QR code or copy the address above"}
                  </p>
                </div>
              </div>

              <Button className="h-10 rounded-full font-bold" onClick={() => { setCheckoutOpen(false); setCheckoutDone(false); }}>
                Done <Check size={14} />
              </Button>
            </div>
          ) : (
            <>
              <DialogTitle className="font-serif text-2xl">Make it yours.</DialogTitle>
              <DialogDescription className="modal-copy">Complete your details and pay with crypto.</DialogDescription>

              {selectedDrop && (
                <div className="checkout-summary">
                  {selectedDrop.image_url ? (
                    <img className="checkout-thumb" src={selectedDrop.image_url} alt="" />
                  ) : (
                    <div className="checkout-thumb flex items-center justify-center bg-muted rounded"><Zap size={20} className="text-muted-foreground/40" /></div>
                  )}
                  <div className="min-w-0 flex-1">
                    <strong className="block text-sm">{selectedDrop.name}</strong>
                    <span className="mt-1 block text-[10px] text-muted-foreground">{selectedDrop.delivery_time}</span>
                  </div>
                  <strong className="text-sm">{selectedDrop.amount}</strong>
                </div>
              )}

              <div className="checkout-field">
                <label className="checkout-label" htmlFor="shop-email">Email for receipt</label>
                <Input className="checkout-input" id="shop-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="checkout-field">
                <label className="checkout-label" htmlFor="shop-name">Full name</label>
                <Input className="checkout-input" id="shop-name" placeholder="Your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>

              {/* Structured Shipping Address */}
              <div className="grid gap-2.5 pt-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-foreground">Shipping address</span>

                <div className="checkout-field">
                  <label className="checkout-label" htmlFor="shop-street">Street address</label>
                  <Input className="checkout-input" id="shop-street" placeholder="House number and street name" value={street} onChange={(e) => setStreet(e.target.value)} />
                </div>

                <div className="checkout-field">
                  <label className="checkout-label" htmlFor="shop-apt">Apartment, suite, unit (optional)</label>
                  <Input className="checkout-input" id="shop-apt" placeholder="Apt, Suite, Unit, Building (optional)" value={apartment} onChange={(e) => setApartment(e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="checkout-field">
                    <label className="checkout-label" htmlFor="shop-city">City</label>
                    <Input className="checkout-input" id="shop-city" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <div className="checkout-field">
                    <label className="checkout-label" htmlFor="shop-state">State / Province / Region</label>
                    <Input className="checkout-input" id="shop-state" placeholder="State or Region" value={stateProvince} onChange={(e) => setStateProvince(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="checkout-field">
                    <label className="checkout-label" htmlFor="shop-postcode">Postal / ZIP code</label>
                    <Input className="checkout-input" id="shop-postcode" placeholder="Postal / ZIP" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                  </div>
                  <div className="checkout-field">
                    <label className="checkout-label" htmlFor="shop-country">Country</label>
                    <select className="checkout-select" id="shop-country" value={country} onChange={(e) => setCountry(e.target.value)}>
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="checkout-field">
                <span className="checkout-label">Pay with crypto</span>
                <div className="crypto-options" role="group">
                  {walletConfig.accepted_coins.map((coin) => (
                    <Button key={coin} type="button" variant="ghost" className="crypto-option" aria-pressed={crypto === coin} onClick={() => setCrypto(coin)}>
                      <span className="font-black">{coin[0]}</span>{coin}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-border bg-muted p-3.5 shadow-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{crypto || "ETH"} Wallet Address</p>
                  <CopyButton text={selectedWalletAddress} />
                </div>
                <p className="font-mono text-xs break-all font-semibold select-all text-foreground bg-background/60 p-2 rounded border border-border/50">{selectedWalletAddress}</p>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
                <span className="text-muted-foreground">Delivery</span>
                <strong>{selectedDrop?.delivery_fee}</strong>
              </div>

              <div className="crypto-note">
                <Info size={14} className="mt-0.5 shrink-0" />
                <span>Send payment to the wallet address above. Your order is confirmed manually after payment clears.</span>
              </div>

              <Button
                className="h-11 w-full rounded-full font-bold"
                disabled={!email.includes("@") || !fullName.trim() || !isAddressValid || submitting}
                onClick={submitCheckout}
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
                {submitting ? "Saving..." : `Confirm order with ${crypto}`}
                {!submitting && <ArrowRight size={15} />}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

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