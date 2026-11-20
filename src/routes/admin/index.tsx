import { useState, useRef, useCallback, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle, ArrowLeft, Bell, Check, CheckCircle2, ChevronRight,
  Copy, Edit2, ExternalLink, Eye, EyeOff, Gift, ImagePlus,
  LayoutDashboard, Loader2, Lock, LogOut, Package, Plus, Settings,
  ShoppingBag, Trash2, Users, Wallet, X, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchSiteConfig, saveSiteConfig,
  fetchAllDrops, createDrop, updateDrop, deleteDrop,
  fetchWalletConfig, saveWalletConfig,
  fetchOrders, updateOrderStatus,
  uploadImage, fetchWalletQrUrls, uploadWalletQr,
  type DbSiteConfig, type DbDrop, type DbWalletConfig, type DbOrder,
} from "@/lib/supabase";
import {
  getExtendedContent,
  saveExtendedContent,
  type ExtendedSiteContent,
  type DemoNotification,
} from "@/lib/siteContent";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin - Drop Club" }] }),
  component: AdminPageWithAuth,
});

const ADMIN_PASSWORD = (import.meta.env.VITE_ADMIN_PASSWORD || "tsldrivenetworknet**##***").trim();

function AdminPageWithAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("admin_authenticated") === "true";
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim() === ADMIN_PASSWORD) {
      sessionStorage.setItem("admin_authenticated", "true");
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/60 p-4">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-7 shadow-2xl">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Lock size={26} />
            </div>
            <h1 className="font-serif text-2xl font-bold text-foreground">Admin Access</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Enter administrator password to access the management portal.
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Admin Password</label>
              <div className="relative flex items-center">
                <Input
                  type={showPassword ? "text" : "password"}
                  autoFocus
                  placeholder="Enter password..."
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(false);
                  }}
                  className={`pr-10 ${error ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                <button
                  type="button"
                  className="absolute right-3 text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {error && (
                <p className="text-[11px] font-semibold text-destructive mt-1">
                  Incorrect password. Please verify and try again.
                </p>
              )}
            </div>

            <Button type="submit" className="w-full rounded-full font-bold h-10">
              Unlock Admin Panel
            </Button>
          </form>

          <div className="mt-5 border-t border-border pt-4 text-center">
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
              ← Back to Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <AdminPanel />;
}

type AdminSection = "dashboard" | "site" | "drops" | "wallet" | "orders" | "alerts";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function ImageUploadBox({
  label,
  value,
  onChange,
  onRemove,
  onUrlInput,
  aspectClass = "aspect-video",
}: {
  label: string;
  value: string;
  onChange: (url: string, file: File) => void;
  onRemove?: () => void;
  onUrlInput?: (url: string) => void;
  aspectClass?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlText, setUrlText] = useState("");

  const handleFile = async (file: File) => {
    const preview = await fileToDataUrl(file);
    onChange(preview, file);
  };

  const handleApplyUrl = () => {
    if (urlText.trim()) {
      if (onUrlInput) {
        onUrlInput(urlText.trim());
      } else {
        onChange(urlText.trim(), new File([], "url-image"));
      }
      setShowUrlInput(false);
    }
  };

  return (
    <div className="admin-field">
      <div className="flex items-center justify-between mb-1">
        <span className="admin-label">{label}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-[10px] text-muted-foreground hover:text-foreground underline cursor-pointer"
            onClick={() => setShowUrlInput((v) => !v)}
          >
            {showUrlInput ? "Hide URL" : "Enter URL"}
          </button>
          {value && onRemove && (
            <button
              type="button"
              className="text-[10px] text-destructive hover:underline cursor-pointer"
              onClick={onRemove}
            >
              Remove
            </button>
          )}
        </div>
      </div>
      {showUrlInput && (
        <div className="flex items-center gap-2 mb-2">
          <Input
            value={urlText}
            onChange={(e) => setUrlText(e.target.value)}
            placeholder="Paste image URL (https://...)"
            className="h-8 text-xs"
          />
          <Button size="sm" type="button" className="h-8 text-xs px-3" onClick={handleApplyUrl}>
            Apply
          </Button>
        </div>
      )}
      <div
        className={`admin-upload-box ${aspectClass} group cursor-pointer`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
      >
        {value ? (
          <div className="relative h-full w-full">
            <img src={value} alt={label} className="h-full w-full rounded-md object-contain p-1" />
            <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="text-xs font-bold text-white">Change image</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImagePlus size={28} />
            <span className="text-xs font-semibold">Click or drag to upload</span>
            <span className="text-[10px]">PNG, JPG, WebP, SVG</span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) await handleFile(f);
        }}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: DbOrder["status"] }) {
  const styles = { entered: "bg-sunshine text-sunshine-foreground", paid: "bg-green-100 text-green-800", abandoned: "bg-red-100 text-red-800" };
  const labels = { entered: "Claimed", paid: "Paid", abandoned: "Abandoned" };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${styles[status]}`}>{labels[status]}</span>;
}

function SaveBar({ saving, saved }: { saving: boolean; saved: boolean }) {
  if (!saving && !saved) return null;
  return (
    <span className="admin-saved-badge">
      {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
      {saving ? "Saving..." : "Saved"}
    </span>
  );
}

function AdminPanel() {
  const [section, setSection] = useState<AdminSection>("dashboard");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const markSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  const navItems: { id: AdminSection; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={15} /> },
    { id: "site", label: "Site Settings", icon: <Settings size={15} /> },
    { id: "drops", label: "Drops & Products", icon: <Package size={15} /> },
    { id: "wallet", label: "Crypto Wallets", icon: <Wallet size={15} /> },
    { id: "orders", label: "Orders & Claims", icon: <Users size={15} /> },
    { id: "alerts", label: "Live Claim Alerts", icon: <Bell size={15} /> },
  ];

  const handleLogout = () => {
    sessionStorage.removeItem("admin_authenticated");
    window.location.reload();
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="brand-symbol"><Zap size={15} fill="currentColor" /></span>
          <span className="text-sm font-black">Admin</span>
        </div>
        <nav className="admin-nav">
          {navItems.map((item) => (
            <button key={item.id} type="button"
              className={`admin-nav-item ${section === item.id ? "active" : ""}`}
              onClick={() => setSection(item.id)}>
              {item.icon}{item.label}
              {section === item.id && <ChevronRight size={12} className="ml-auto" />}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer flex flex-col gap-1">
          <Link to="/" className="admin-nav-item text-muted-foreground">
            <ExternalLink size={14} /> View storefront
          </Link>
          <button
            type="button"
            className="admin-nav-item text-destructive hover:bg-destructive/10 cursor-pointer"
            onClick={handleLogout}
          >
            <LogOut size={14} /> Lock & Sign out
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <div className="admin-topbar">
          <h1 className="admin-page-title">{navItems.find((n) => n.id === section)?.label}</h1>
          <SaveBar saving={saving} saved={saved} />
        </div>
        <div className="admin-content">
          {section === "dashboard" && <DashboardSection setSection={setSection} />}
          {section === "site" && <SiteSection setSaving={setSaving} onSaved={markSaved} />}
          {section === "drops" && <DropsSection setSaving={setSaving} onSaved={markSaved} />}
          {section === "wallet" && <WalletSection setSaving={setSaving} onSaved={markSaved} />}
          {section === "orders" && <OrdersSection />}
          {section === "alerts" && <AlertsSection setSaving={setSaving} onSaved={markSaved} />}
        </div>
      </main>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────
function DashboardSection({ setSection }: { setSection: (s: AdminSection) => void }) {
  const [drops, setDrops] = useState<DbDrop[]>([]);
  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchAllDrops(), fetchOrders()])
      .then(([d, o]) => { setDrops(d); setOrders(o); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-primary" /></div>;

  const paid = orders.filter((o) => o.status === "paid").length;
  const claimed = orders.filter((o) => o.status === "entered").length;
  const abandoned = orders.filter((o) => o.status === "abandoned").length;

  return (
    <div className="admin-section-grid">
      <div className="admin-stat-row">
        <div className="admin-stat-card"><span className="admin-stat-label">Total submissions</span><span className="admin-stat-value">{orders.length}</span></div>
        <div className="admin-stat-card"><span className="admin-stat-label">Paid orders</span><span className="admin-stat-value text-green-600">{paid}</span></div>
        <div className="admin-stat-card"><span className="admin-stat-label">Claimed giveaways</span><span className="admin-stat-value text-primary">{claimed}</span></div>
        <div className="admin-stat-card"><span className="admin-stat-label">Abandoned</span><span className="admin-stat-value text-muted-foreground">{abandoned}</span></div>
      </div>
      <div className="admin-card">
        <div className="admin-card-head">
          <h2 className="admin-card-title">Active drops ({drops.length})</h2>
          <Button size="sm" variant="outline" className="h-7 rounded-full text-[10px]" onClick={() => setSection("drops")}>Manage <ChevronRight size={11} /></Button>
        </div>
        <div className="admin-list">
          {drops.map((drop) => (
            <div className="admin-list-row" key={drop.id}>
              {drop.image_url ? <img src={drop.image_url} alt={drop.name} className="h-10 w-10 rounded object-cover flex-shrink-0" /> : <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0"><Gift size={16} className="text-muted-foreground/40" /></div>}
              <div className="min-w-0 flex-1"><p className="admin-list-name">{drop.name}</p><p className="admin-list-sub">{drop.kind === "giveaway" ? "Giveaway" : "Shop"} · {drop.category}</p></div>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${drop.kind === "giveaway" ? "bg-sunshine text-sunshine-foreground" : "bg-secondary text-secondary-foreground"}`}>
                {drop.kind === "giveaway" ? <Gift size={9} className="mr-1" /> : <ShoppingBag size={9} className="mr-1" />}
                {drop.kind === "giveaway" ? "Giveaway" : "Shop"}
              </span>
            </div>
          ))}
          {drops.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">No drops yet.</p>}
        </div>
      </div>
      <div className="admin-card">
        <div className="admin-card-head">
          <h2 className="admin-card-title">Recent submissions</h2>
          <Button size="sm" variant="outline" className="h-7 rounded-full text-[10px]" onClick={() => setSection("orders")}>View all <ChevronRight size={11} /></Button>
        </div>
        {orders.length === 0 ? <p className="py-4 text-center text-xs text-muted-foreground">No submissions yet.</p> : (
          <div className="admin-list">
            {orders.slice(0, 5).map((o) => (
              <div className="admin-list-row" key={o.id}>
                <div className="min-w-0 flex-1"><p className="admin-list-name">{o.email}</p><p className="admin-list-sub">{o.drop_name} · {new Date(o.created_at).toLocaleDateString()}</p></div>
                <StatusBadge status={o.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Site Settings ─────────────────────────────────────────────
function SiteSection({ setSaving, onSaved }: { setSaving: (v: boolean) => void; onSaved: () => void }) {
  const [form, setForm] = useState<DbSiteConfig | null>(null);
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});
  const [loading, setLoading] = useState(true);
  const [ext, setExt] = useState<ExtendedSiteContent>(() => getExtendedContent());

  useEffect(() => {
    fetchSiteConfig().then((cfg) => {
      if (cfg) {
        setForm({
          ...cfg,
          hero_headline: (cfg.hero_headline || "").replace(/\\n/g, "\n"),
        });
      }
    }).finally(() => setLoading(false));
  }, []);

  if (loading || !form) return <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-primary" /></div>;

  const set = (key: keyof DbSiteConfig) => (val: string) => setForm((f) => f ? { ...f, [key]: val } : f);

  const handleImageChange = (key: keyof DbSiteConfig) => (preview: string, file: File) => {
    setForm((f) => f ? { ...f, [key]: preview } : f);
    setPendingFiles((p) => ({ ...p, [key]: file }));
  };

  const removeImage = (key: keyof DbSiteConfig) => () => {
    setForm((f) => f ? { ...f, [key]: "" } : f);
    setPendingFiles((p) => {
      const copy = { ...p };
      delete copy[key];
      return copy;
    });
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const updates: Partial<DbSiteConfig> = { ...form };
      for (const [key, file] of Object.entries(pendingFiles)) {
        const path = `site/${key}-${Date.now()}`;
        try {
          const url = await uploadImage(file, path);
          (updates as Record<string, string>)[key] = url;
        } catch (uploadErr) {
          console.warn(`Storage upload for ${key} failed, falling back to data URL`, uploadErr);
        }
      }
      await saveSiteConfig(updates);
      saveExtendedContent({
        topCountdownBadge: ext.topCountdownBadge,
        topCountdownText: ext.topCountdownText,
        sectionEyebrow: ext.sectionEyebrow,
        sectionTitle: ext.sectionTitle,
        sectionCaption: ext.sectionCaption,
      });
      setPendingFiles({});
      onSaved();
    } catch (err: any) {
      console.error("Save error:", err);
      alert("Failed to save site settings: " + (err.message || String(err)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-form">
      <div className="admin-form-section">
        <h2 className="admin-section-title">Brand</h2>
        <div className="admin-field"><label className="admin-label">Site name</label><Input value={form.site_name} onChange={(e) => set("site_name")(e.target.value)} placeholder="dropclub" /></div>
        <ImageUploadBox
          label="Site logo (replaces text name in header)"
          value={form.logo_url}
          onChange={handleImageChange("logo_url")}
          onRemove={removeImage("logo_url")}
          onUrlInput={(url) => { set("logo_url")(url); setPendingFiles((p) => { const c = { ...p }; delete c.logo_url; return c; }); }}
          aspectClass="aspect-[4/1] max-h-24"
        />
        <ImageUploadBox
          label="Site icon / favicon"
          value={form.icon_url}
          onChange={handleImageChange("icon_url")}
          onRemove={removeImage("icon_url")}
          onUrlInput={(url) => { set("icon_url")(url); setPendingFiles((p) => { const c = { ...p }; delete c.icon_url; return c; }); }}
          aspectClass="aspect-square max-h-24 max-w-24"
        />
      </div>

      <div className="admin-form-section">
        <h2 className="admin-section-title">Top Announcement Bar</h2>
        <div className="admin-field">
          <label className="admin-label">Banner text (e.g. FRESH FINDS. REAL WINNERS...)</label>
          <Input value={form.announcement_text} onChange={(e) => set("announcement_text")(e.target.value)} />
        </div>
      </div>

      <div className="admin-form-section">
        <h2 className="admin-section-title">Top Countdown Bar</h2>
        <div className="admin-field">
          <label className="admin-label">Countdown badge text</label>
          <Input
            value={ext.topCountdownBadge}
            onChange={(e) => setExt((prev) => ({ ...prev, topCountdownBadge: e.target.value }))}
            placeholder="FLASH DROP CLOSING"
          />
        </div>
        <div className="admin-field">
          <label className="admin-label">Countdown subtitle / claim text</label>
          <Input
            value={ext.topCountdownText}
            onChange={(e) => setExt((prev) => ({ ...prev, topCountdownText: e.target.value }))}
            placeholder="Scarlet High Tops · Claim window closing soon!"
          />
        </div>
      </div>

      <div className="admin-form-section">
        <h2 className="admin-section-title">Hero Section</h2>
        <div className="admin-field">
          <label className="admin-label">Headline (press Enter for a new line; last line is italic)</label>
          <Textarea rows={3} value={form.hero_headline} onChange={(e) => set("hero_headline")(e.target.value)} />
        </div>
        <div className="admin-field"><label className="admin-label">Subtitle</label><Input value={form.hero_subtitle} onChange={(e) => set("hero_subtitle")(e.target.value)} /></div>
        <ImageUploadBox
          label="Hero image (overrides first drop image)"
          value={form.hero_image_url}
          onChange={handleImageChange("hero_image_url")}
          onRemove={removeImage("hero_image_url")}
          onUrlInput={(url) => { set("hero_image_url")(url); setPendingFiles((p) => { const c = { ...p }; delete c.hero_image_url; return c; }); }}
          aspectClass="aspect-[16/9] max-h-56"
        />
        <div className="grid grid-cols-3 gap-3">
          <div className="admin-field"><label className="admin-label">Entry count</label><Input value={form.hero_entries} onChange={(e) => set("hero_entries")(e.target.value)} placeholder="2,184" /></div>
          <div className="admin-field"><label className="admin-label">Prize value</label><Input value={form.hero_prize_value} onChange={(e) => set("hero_prize_value")(e.target.value)} placeholder="$240" /></div>
          <div className="admin-field"><label className="admin-label">Delivery fee</label><Input value={form.hero_delivery_fee} onChange={(e) => set("hero_delivery_fee")(e.target.value)} placeholder="$8.50" /></div>
        </div>
      </div>

      <div className="admin-form-section">
        <h2 className="admin-section-title">Main Drops Section Headings</h2>
        <div className="admin-field">
          <label className="admin-label">Eyebrow</label>
          <Input
            value={ext.sectionEyebrow}
            onChange={(e) => setExt((prev) => ({ ...prev, sectionEyebrow: e.target.value }))}
            placeholder="HANDPICKED FOR YOU"
          />
        </div>
        <div className="admin-field">
          <label className="admin-label">Section Title</label>
          <Input
            value={ext.sectionTitle}
            onChange={(e) => setExt((prev) => ({ ...prev, sectionTitle: e.target.value }))}
            placeholder="The good stuff"
          />
        </div>
        <div className="admin-field">
          <label className="admin-label">Section Caption</label>
          <Input
            value={ext.sectionCaption}
            onChange={(e) => setExt((prev) => ({ ...prev, sectionCaption: e.target.value }))}
            placeholder="Good things do not wait. Neither do these."
          />
        </div>
      </div>

      <div className="admin-form-section">
        <h2 className="admin-section-title">Footer</h2>
        <div className="admin-field"><label className="admin-label">Footer text</label><Input value={form.footer_text} onChange={(e) => set("footer_text")(e.target.value)} /></div>
      </div>
      <div className="admin-form-actions">
        <Button className="rounded-full px-6 font-bold" onClick={save}><Check size={15} /> Save site settings</Button>
      </div>
    </div>
  );
}

// ── Drops ─────────────────────────────────────────────────────
const EMPTY: Omit<DbDrop, "id" | "created_at" | "updated_at"> = {
  name: "", category: "", kind: "giveaway", image_url: "", image_alt: "",
  prize_value: "", delivery_fee: "", delivery_time: "", entry_label: "",
  time_left: 86400, amount: "", shipping: "", description: "", active: true, sort_order: 0,
};

function DropsSection({ setSaving, onSaved }: { setSaving: (v: boolean) => void; onSaved: () => void }) {
  const [drops, setDrops] = useState<DbDrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<DbDrop> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [pendingImage, setPendingImage] = useState<File | null>(null);

  const load = useCallback(() => { fetchAllDrops().then(setDrops).finally(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);

  const startNew = () => { setEditing({ ...EMPTY }); setIsNew(true); setPendingImage(null); };
  const startEdit = (d: DbDrop) => { setEditing({ ...d }); setIsNew(false); setPendingImage(null); };
  const cancel = () => { setEditing(null); setIsNew(false); setPendingImage(null); };

  const setField = (key: keyof DbDrop) => (val: string | boolean | number) =>
    setEditing((e) => e ? { ...e, [key]: val } : e);

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      let imageUrl = editing.image_url ?? "";
      if (pendingImage) {
        const path = `drops/${Date.now()}-${pendingImage.name}`;
        imageUrl = await uploadImage(pendingImage, path);
      }
      const payload = { ...editing, image_url: imageUrl } as Omit<DbDrop, "id" | "created_at" | "updated_at">;
      if (isNew) {
        await createDrop(payload);
      } else {
        await updateDrop(editing.id!, payload);
      }
      await load();
      cancel();
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this drop?")) return;
    setSaving(true);
    try { await deleteDrop(id); await load(); onSaved(); } finally { setSaving(false); }
  };

  const toggleActive = async (d: DbDrop) => {
    setSaving(true);
    try { await updateDrop(d.id, { active: !d.active }); await load(); onSaved(); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-primary" /></div>;

  if (editing) {
    return (
      <div className="admin-form">
        <div className="mb-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" className="rounded-full" onClick={cancel}><ArrowLeft size={14} /> Back</Button>
          <h2 className="text-sm font-bold">{isNew ? "New drop" : `Edit: ${editing.name}`}</h2>
        </div>
        <div className="admin-form-section">
          <h2 className="admin-section-title">Basic info</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="admin-field"><label className="admin-label">Drop name</label><Input value={editing.name ?? ""} onChange={(e) => setField("name")(e.target.value)} /></div>
            <div className="admin-field"><label className="admin-label">Category tag</label><Input value={editing.category ?? ""} onChange={(e) => setField("category")(e.target.value)} placeholder="STYLE · LIMITED EDITION" /></div>
          </div>
          <div className="admin-field">
            <label className="admin-label">Type</label>
            <div className="flex gap-3 mt-1">
              <button type="button" className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-all ${editing.kind === "giveaway" ? "border-primary bg-secondary text-primary" : "border-border"}`} onClick={() => setField("kind")("giveaway")}><Gift size={13} /> Giveaway</button>
              <button type="button" className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-all ${editing.kind === "shop" ? "border-primary bg-secondary text-primary" : "border-border"}`} onClick={() => setField("kind")("shop")}><ShoppingBag size={13} /> Shop (product)</button>
            </div>
          </div>
          <div className="admin-field"><label className="admin-label">Description</label><Textarea rows={3} value={editing.description ?? ""} onChange={(e) => setField("description")(e.target.value)} /></div>
        </div>
        <div className="admin-form-section">
          <h2 className="admin-section-title">Product image</h2>
          <ImageUploadBox label="Upload product image from computer" value={editing.image_url ?? ""}
            onChange={(preview, file) => { setField("image_url")(preview); setPendingImage(file); }}
            aspectClass="aspect-[4/3] max-h-64" />
          <div className="admin-field"><label className="admin-label">Image alt text</label><Input value={editing.image_alt ?? ""} onChange={(e) => setField("image_alt")(e.target.value)} /></div>
        </div>
        <div className="admin-form-section">
          <h2 className="admin-section-title">Pricing</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="admin-field"><label className="admin-label">Prize value / RRP</label><Input value={editing.prize_value ?? ""} onChange={(e) => setField("prize_value")(e.target.value)} placeholder="$240" /></div>
            {editing.kind === "shop" && <div className="admin-field"><label className="admin-label">Sale price</label><Input value={editing.amount ?? ""} onChange={(e) => setField("amount")(e.target.value)} placeholder="$899" /></div>}
          </div>
        </div>
        <div className="admin-form-section">
          <h2 className="admin-section-title">Delivery</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="admin-field">
              <label className="admin-label">Delivery fee</label>
              <Input value={editing.delivery_fee ?? ""} onChange={(e) => setField("delivery_fee")(e.target.value)} placeholder="$8.50 or Free" />
              <span className="text-[10px] text-muted-foreground">For giveaways, users pay this fee to receive their item.</span>
            </div>
            <div className="admin-field"><label className="admin-label">Shipping display text</label><Input value={editing.shipping ?? ""} onChange={(e) => setField("shipping")(e.target.value)} placeholder="$8.50 or Free" /></div>
          </div>
          <div className="admin-field"><label className="admin-label">Delivery time</label><Input value={editing.delivery_time ?? ""} onChange={(e) => setField("delivery_time")(e.target.value)} placeholder="Ships in 2-4 days" /></div>
        </div>
        <div className="admin-form-section">
          <h2 className="admin-section-title">Drop timer and label</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="admin-field">
              <label className="admin-label">Time left (seconds)</label>
              <Input type="number" value={editing.time_left ?? 86400} onChange={(e) => setEditing((ed) => ed ? { ...ed, time_left: Number(e.target.value) } : ed)} />
              <span className="text-[10px] text-muted-foreground">86400 = 1 day · 604800 = 1 week</span>
            </div>
            <div className="admin-field"><label className="admin-label">Entry / stock label</label><Input value={editing.entry_label ?? ""} onChange={(e) => setField("entry_label")(e.target.value)} placeholder="2,184 entered" /></div>
          </div>
          <div className="admin-field"><label className="admin-label">Sort order (lower = first)</label><Input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing((ed) => ed ? { ...ed, sort_order: Number(e.target.value) } : ed)} /></div>
        </div>
        <div className="admin-form-actions">
          <Button className="rounded-full px-6 font-bold" onClick={saveEdit}><Check size={15} /> {isNew ? "Add drop" : "Save changes"}</Button>
          <Button variant="outline" className="rounded-full" onClick={cancel}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-section-grid">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{drops.length} drop{drops.length !== 1 ? "s" : ""}</p>
        <Button className="rounded-full font-bold" size="sm" onClick={startNew}><Plus size={14} /> Add new drop</Button>
      </div>
      {drops.length === 0 ? (
        <div className="admin-empty-state"><Package size={40} className="text-muted-foreground/40" /><p className="text-sm text-muted-foreground">No drops yet.</p><Button className="rounded-full" onClick={startNew}><Plus size={14} /> Add drop</Button></div>
      ) : (
        <div className="admin-drops-grid">
          {drops.map((drop) => (
            <div className={`admin-drop-card ${!drop.active ? "opacity-50" : ""}`} key={drop.id}>
              <div className="admin-drop-image">
                {drop.image_url ? <img src={drop.image_url} alt={drop.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-muted"><ImagePlus size={24} className="text-muted-foreground" /></div>}
                <span className={`admin-drop-badge ${drop.kind === "shop" ? "is-paid" : ""}`}>{drop.kind === "giveaway" ? <Gift size={9} className="mr-1" /> : <ShoppingBag size={9} className="mr-1" />}{drop.kind === "giveaway" ? "Giveaway" : "Shop"}</span>
              </div>
              <div className="admin-drop-body">
                <p className="admin-drop-category">{drop.category}</p>
                <h3 className="admin-drop-name">{drop.name}</h3>
                <p className="admin-drop-price">{drop.kind === "shop" ? <><strong>{drop.amount}</strong> <span className="text-muted-foreground">· {drop.prize_value}</span></> : <><strong>{drop.prize_value}</strong> prize</>}</p>
                <p className="admin-drop-delivery text-muted-foreground">{drop.delivery_fee} delivery · {drop.delivery_time}</p>
              </div>
              <div className="admin-drop-actions">
                <Button size="sm" variant="outline" className="rounded-full text-[10px]" onClick={() => startEdit(drop)}><Edit2 size={11} /> Edit</Button>
                <Button size="sm" variant="ghost" className={`rounded-full text-[10px] ${drop.active ? "text-muted-foreground" : "text-primary"}`} onClick={() => toggleActive(drop)}>{drop.active ? "Hide" : "Show"}</Button>
                <Button size="sm" variant="ghost" className="rounded-full text-[10px] text-destructive hover:text-destructive" onClick={() => remove(drop.id)}><Trash2 size={11} /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Wallet ────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" className="ml-2 rounded p-1 text-muted-foreground hover:text-foreground transition-colors" onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

function WalletSection({ setSaving, onSaved }: { setSaving: (v: boolean) => void; onSaved: () => void }) {
  const [form, setForm] = useState<DbWalletConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showP, setShowP] = useState(false);
  const [showS, setShowS] = useState(false);
  const [newCoin, setNewCoin] = useState("");
  const [primaryQr, setPrimaryQr] = useState("");
  const [secondaryQr, setSecondaryQr] = useState("");
  const [pendingQrFiles, setPendingQrFiles] = useState<{ primary?: File; secondary?: File }>({});

  useEffect(() => {
    fetchWalletConfig().then(setForm).finally(() => setLoading(false));
    fetchWalletQrUrls().then((res) => {
      setPrimaryQr(res.primaryQr);
      setSecondaryQr(res.secondaryQr);
    });
  }, []);

  if (loading || !form) return <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-primary" /></div>;

  const set = (key: keyof DbWalletConfig) => (val: string) => setForm((f) => f ? { ...f, [key]: val } : f);
  const addCoin = () => {
    const c = newCoin.trim().toUpperCase();
    if (!c || form.accepted_coins.includes(c)) return;
    setForm((f) => f ? { ...f, accepted_coins: [...f.accepted_coins, c] } : f);
    setNewCoin("");
  };
  const removeCoin = (c: string) => setForm((f) => f ? { ...f, accepted_coins: f.accepted_coins.filter((x) => x !== c) } : f);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await saveWalletConfig(form);
      if (pendingQrFiles.primary) {
        try {
          const url = await uploadWalletQr("primary", pendingQrFiles.primary);
          setPrimaryQr(url);
        } catch (err) {
          console.warn("Primary QR upload issue:", err);
        }
      }
      if (pendingQrFiles.secondary) {
        try {
          const url = await uploadWalletQr("secondary", pendingQrFiles.secondary);
          setSecondaryQr(url);
        } catch (err) {
          console.warn("Secondary QR upload issue:", err);
        }
      }
      setPendingQrFiles({});
      onSaved();
    } catch (err: any) {
      console.error("Save error:", err);
      alert("Error saving wallet settings: " + (err.message || String(err)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-form">
      <div className="admin-form-section">
        <h2 className="admin-section-title">Primary wallet</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="admin-field col-span-2">
            <label className="admin-label">Wallet address</label>
            <div className="relative flex items-center">
              <Input type={showP ? "text" : "password"} value={form.primary_address} onChange={(e) => set("primary_address")(e.target.value)} placeholder="0x... or bc1..." className="pr-16 font-mono text-xs" />
              <div className="absolute right-2 flex items-center gap-1">
                {form.primary_address && <CopyBtn text={form.primary_address} />}
                <button type="button" className="p-1 text-muted-foreground hover:text-foreground" onClick={() => setShowP((v) => !v)}>{showP ? <EyeOff size={13} /> : <Eye size={13} />}</button>
              </div>
            </div>
          </div>
          <div className="admin-field"><label className="admin-label">Coin</label><Input value={form.primary_coin} onChange={(e) => set("primary_coin")(e.target.value.toUpperCase())} placeholder="ETH" /></div>
        </div>
        {form.primary_address && <div className="mt-2 rounded-md bg-muted p-3"><p className="text-[9px] font-bold uppercase text-muted-foreground mb-1">Preview (shown to users)</p><p className="font-mono text-xs break-all">{form.primary_address}</p></div>}
        
        {/* Upload QR Code for Primary Wallet */}
        <div className="mt-3">
          <ImageUploadBox
            label="Primary QR Code (optional — auto-generates if not uploaded)"
            value={primaryQr}
            onChange={(preview, file) => {
              setPrimaryQr(preview);
              setPendingQrFiles((p) => ({ ...p, primary: file }));
            }}
            onRemove={() => {
              setPrimaryQr("");
              localStorage.removeItem("dropclub_primary_qr");
              setPendingQrFiles((p) => { const c = { ...p }; delete c.primary; return c; });
            }}
            onUrlInput={(url) => {
              setPrimaryQr(url);
              localStorage.setItem("dropclub_primary_qr", url);
            }}
            aspectClass="aspect-square max-h-36 max-w-36"
          />
        </div>
      </div>

      <div className="admin-form-section">
        <h2 className="admin-section-title">Secondary wallet</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="admin-field col-span-2">
            <label className="admin-label">Wallet address</label>
            <div className="relative flex items-center">
              <Input type={showS ? "text" : "password"} value={form.secondary_address} onChange={(e) => set("secondary_address")(e.target.value)} placeholder="0x... or bc1..." className="pr-16 font-mono text-xs" />
              <div className="absolute right-2 flex items-center gap-1">
                {form.secondary_address && <CopyBtn text={form.secondary_address} />}
                <button type="button" className="p-1 text-muted-foreground hover:text-foreground" onClick={() => setShowS((v) => !v)}>{showS ? <EyeOff size={13} /> : <Eye size={13} />}</button>
              </div>
            </div>
          </div>
          <div className="admin-field"><label className="admin-label">Coin</label><Input value={form.secondary_coin} onChange={(e) => set("secondary_coin")(e.target.value.toUpperCase())} placeholder="BTC" /></div>
        </div>

        {/* Upload QR Code for Secondary Wallet */}
        <div className="mt-3">
          <ImageUploadBox
            label="Secondary QR Code (optional — auto-generates if not uploaded)"
            value={secondaryQr}
            onChange={(preview, file) => {
              setSecondaryQr(preview);
              setPendingQrFiles((p) => ({ ...p, secondary: file }));
            }}
            onRemove={() => {
              setSecondaryQr("");
              localStorage.removeItem("dropclub_secondary_qr");
              setPendingQrFiles((p) => { const c = { ...p }; delete c.secondary; return c; });
            }}
            onUrlInput={(url) => {
              setSecondaryQr(url);
              localStorage.setItem("dropclub_secondary_qr", url);
            }}
            aspectClass="aspect-square max-h-36 max-w-36"
          />
        </div>
      </div>

      <div className="admin-form-section">
        <h2 className="admin-section-title">Accepted coins (shown as payment options at checkout)</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {form.accepted_coins.map((coin) => (
            <span key={coin} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-bold">
              {coin}<button type="button" className="ml-1 text-muted-foreground hover:text-destructive" onClick={() => removeCoin(coin)}><X size={11} /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={newCoin} onChange={(e) => setNewCoin(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCoin()} placeholder="Add coin e.g. USDT" className="max-w-48" />
          <Button size="sm" variant="outline" className="rounded-full" onClick={addCoin}><Plus size={13} /> Add</Button>
        </div>
        <div className="mt-3 rounded-md bg-muted p-3 text-[10px] text-muted-foreground"><AlertCircle size={12} className="inline mr-1" />First coin in list is selected by default. Primary wallet address shows for primary coin, secondary for secondary coin.</div>
      </div>
      <div className="admin-form-actions">
        <Button className="rounded-full px-6 font-bold" onClick={save}><Check size={15} /> Save wallet settings</Button>
      </div>
    </div>
  );
}

// ── Orders ────────────────────────────────────────────────────
function OrdersSection() {
  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | DbOrder["status"]>("all");
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(() => { fetchOrders().then(setOrders).finally(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);

  const changeStatus = async (id: string, status: DbOrder["status"]) => {
    setUpdating(id);
    try { await updateOrderStatus(id, status); await load(); } finally { setUpdating(null); }
  };

  const filtered = orders.filter((o) => {
    const matchF = filter === "all" || o.status === filter;
    const q = search.toLowerCase();
    const matchS = !q || o.email.toLowerCase().includes(q) || o.drop_name.toLowerCase().includes(q) || o.full_name.toLowerCase().includes(q);
    return matchF && matchS;
  });

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-primary" /></div>;

  return (
    <div className="admin-section-grid">
      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Search by email, name or drop..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-72 h-9" />
        <div className="flex gap-2">
          {(["all", "entered", "paid", "abandoned"] as const).map((f) => (
            <button key={f} type="button"
              className={`rounded-full border px-3 py-1 text-[10px] font-bold transition-all ${filter === f ? "border-foreground bg-foreground text-background" : "border-border bg-background text-muted-foreground"}`}
              onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f === "entered" ? "Claimed" : f === "paid" ? "Paid" : "Abandoned"}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="admin-empty-state"><Users size={40} className="text-muted-foreground/40" /><p className="text-sm text-muted-foreground">{orders.length === 0 ? "No submissions yet. They will appear here when users claim or order." : "No results match."}</p></div>
      ) : (
        <div className="overflow-x-auto">
          <div className="admin-orders-table min-w-[700px]">
            <div className="admin-orders-header">
              <span>Email</span><span>Name</span><span>Drop</span><span>Delivery</span><span>Date</span><span>Status</span><span></span>
            </div>
            {filtered.map((o) => (
              <div className="admin-orders-row" key={o.id}>
                <div><p className="text-xs font-semibold truncate">{o.email}</p></div>
                <div><p className="text-xs truncate">{o.full_name}</p><p className="text-[10px] text-muted-foreground truncate">{o.address}</p></div>
                <div><p className="text-xs truncate">{o.drop_name}</p><span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold ${o.kind === "giveaway" ? "bg-sunshine text-sunshine-foreground" : "bg-secondary text-secondary-foreground"}`}>{o.kind}</span></div>
                <div><p className="text-[10px] text-muted-foreground">{o.delivery_fee}</p>{o.crypto && <p className="text-[10px] text-muted-foreground">{o.crypto}</p>}</div>
                <div><p className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</p></div>
                <div><StatusBadge status={o.status} /></div>
                <div className="flex gap-1 flex-wrap">
                  {updating === o.id ? <Loader2 size={14} className="animate-spin text-muted-foreground" /> : (
                    <>
                      {o.status !== "paid" && <button type="button" className="rounded px-2 py-1 text-[10px] font-semibold text-green-700 hover:bg-green-50 transition-colors" onClick={() => changeStatus(o.id, "paid")}>Mark paid</button>}
                      {o.status !== "abandoned" && <button type="button" className="rounded px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-muted transition-colors" onClick={() => changeStatus(o.id, "abandoned")}>Abandon</button>}
                      {o.status === "abandoned" && <button type="button" className="rounded px-2 py-1 text-[10px] font-semibold text-primary hover:bg-secondary transition-colors" onClick={() => changeStatus(o.id, "entered")}>Restore</button>}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="text-[10px] text-muted-foreground"><CheckCircle2 size={11} className="inline mr-1 text-green-600" />Showing {filtered.length} of {orders.length} submissions.</div>
    </div>
  );
}

// ── Demo Live Claim Alerts ─────────────────────────────────────
function AlertsSection({ setSaving, onSaved }: { setSaving: (v: boolean) => void; onSaved: () => void }) {
  const [ext, setExt] = useState<ExtendedSiteContent>(() => getExtendedContent());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formAlert, setFormAlert] = useState<DemoNotification>({
    id: "",
    name: "",
    location: "",
    dropName: "",
    timeAgo: "",
  });

  const handleToggleEnabled = () => {
    const updated = saveExtendedContent({ demoNotificationsEnabled: !ext.demoNotificationsEnabled });
    setExt(updated);
  };

  const handleStartAdd = () => {
    setEditingId("new");
    setFormAlert({
      id: Date.now().toString(),
      name: "",
      location: "",
      dropName: "Scarlet High Tops",
      timeAgo: "Just now",
    });
  };

  const handleStartEdit = (alertItem: DemoNotification) => {
    setEditingId(alertItem.id);
    setFormAlert({ ...alertItem });
  };

  const handleSaveItem = () => {
    if (!formAlert.name.trim() || !formAlert.dropName.trim()) {
      alert("Name and drop name are required.");
      return;
    }
    let updatedList = [...ext.demoNotifications];
    if (editingId === "new") {
      updatedList = [formAlert, ...updatedList];
    } else {
      updatedList = updatedList.map((item) => (item.id === editingId ? formAlert : item));
    }
    const updated = saveExtendedContent({ demoNotifications: updatedList });
    setExt(updated);
    setEditingId(null);
    onSaved();
  };

  const handleDeleteItem = (id: string) => {
    const updatedList = ext.demoNotifications.filter((item) => item.id !== id);
    const updated = saveExtendedContent({ demoNotifications: updatedList });
    setExt(updated);
    onSaved();
  };

  const handleResetDefaults = () => {
    if (confirm("Reset all claim alerts to demo defaults?")) {
      const updated = saveExtendedContent({
        demoNotificationsEnabled: true,
        demoNotifications: [
          { id: "1", name: "Sarah M.", location: "London, UK", dropName: "Scarlet High Tops", timeAgo: "Just now" },
          { id: "2", name: "David K.", location: "New York, USA", dropName: "Tesla Cyberbackpack", timeAgo: "1m ago" },
          { id: "3", name: "Elena R.", location: "Berlin, DE", dropName: "Scarlet High Tops", timeAgo: "2m ago" },
          { id: "4", name: "Liam P.", location: "Toronto, CA", dropName: "Wireless Earbuds Pro", timeAgo: "3m ago" },
          { id: "5", name: "Marcus T.", location: "Sydney, AU", dropName: "Scarlet High Tops", timeAgo: "4m ago" },
        ],
      });
      setExt(updated);
      onSaved();
    }
  };

  return (
    <div className="admin-form">
      <div className="admin-form-section">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="admin-section-title mb-1">Live Claim Notifications (2-Min Cycle)</h2>
            <p className="text-xs text-muted-foreground">
              Displays social-proof toast alerts on storefront every 2 minutes showing recent winners/claims, triggering mobile vibration.
            </p>
          </div>
          <Button
            size="sm"
            variant={ext.demoNotificationsEnabled ? "default" : "outline"}
            className="rounded-full text-xs font-bold"
            onClick={handleToggleEnabled}
          >
            {ext.demoNotificationsEnabled ? "Enabled" : "Disabled"}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" className="rounded-full text-xs font-bold" onClick={handleStartAdd}>
            <Plus size={14} className="mr-1" /> Add claim notification
          </Button>
          <Button size="sm" variant="outline" className="rounded-full text-xs" onClick={handleResetDefaults}>
            Reset defaults
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">
          {ext.demoNotifications.length} alerts in rotation
        </span>
      </div>

      {editingId && (
        <div className="rounded-lg border border-primary/30 bg-card p-4 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-foreground">
            {editingId === "new" ? "Add New Notification" : "Edit Notification"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold">User Name</label>
              <Input
                value={formAlert.name}
                onChange={(e) => setFormAlert((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Sarah M."
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold">Location</label>
              <Input
                value={formAlert.location}
                onChange={(e) => setFormAlert((f) => ({ ...f, location: e.target.value }))}
                placeholder="e.g. London, UK"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold">Drop / Prize Claimed</label>
              <Input
                value={formAlert.dropName}
                onChange={(e) => setFormAlert((f) => ({ ...f, dropName: e.target.value }))}
                placeholder="e.g. Scarlet High Tops"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold">Time Text</label>
              <Input
                value={formAlert.timeAgo}
                onChange={(e) => setFormAlert((f) => ({ ...f, timeAgo: e.target.value }))}
                placeholder="e.g. Just now, 2m ago"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
            <Button size="sm" className="rounded-full font-bold" onClick={handleSaveItem}>
              <Check size={13} className="mr-1" /> Save alert
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {ext.demoNotifications.map((alertItem) => (
          <div
            key={alertItem.id}
            className="flex items-center justify-between rounded-md border border-border bg-card p-3 shadow-xs"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                {alertItem.name.slice(0, 1) || "U"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground truncate">
                  {alertItem.name} <span className="font-normal text-muted-foreground">({alertItem.location})</span>
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  Claimed <strong>{alertItem.dropName}</strong> · {alertItem.timeAgo}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-3">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => handleStartEdit(alertItem)}
              >
                <Edit2 size={13} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                onClick={() => handleDeleteItem(alertItem.id)}
              >
                <Trash2 size={13} />
              </Button>
            </div>
          </div>
        ))}
        {ext.demoNotifications.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">
            No claim notifications configured. Add one or click Reset Defaults.
          </p>
        )}
      </div>
    </div>
  );
}