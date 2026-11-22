import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search, Bell, X, Zap, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatDisplayPrice, formatFeeDisplay } from "@/lib/priceFormatter";
import type { DbDrop, DbSiteConfig } from "@/lib/supabase";

interface SiteHeaderProps {
  siteConfig: DbSiteConfig | null;
  drops?: DbDrop[];
  search?: string;
  onSearchChange?: (val: string) => void;
  currentPage?: "home" | "checkout";
}

export function SiteHeader({
  siteConfig,
  drops = [],
  search = "",
  onSearchChange,
  currentPage = "home",
}: SiteHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearchInput = (val: string) => {
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      // If on checkout page, redirecting or updating search
      if (currentPage === "checkout" && val.trim()) {
        navigate({ to: "/", search: {} });
      }
    }
  };

  const siteName = siteConfig?.site_name || "Tesla Drop Club";

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="brand-mark" aria-label={`${siteName} home`}>
            {siteConfig?.logo_url ? (
              <img
                src={siteConfig.logo_url}
                alt={siteName}
                className="h-8 w-auto object-contain"
              />
            ) : (
              <>
                {siteConfig?.icon_url ? (
                  <img
                    src={siteConfig.icon_url}
                    alt=""
                    className="h-7 w-7 rounded object-contain"
                  />
                ) : (
                  <span className="brand-symbol">
                    <Zap size={17} fill="currentColor" />
                  </span>
                )}
                <span>
                  {siteName}
                  <span className="text-primary">.</span>
                </span>
              </>
            )}
          </Link>

          <nav className="header-nav" aria-label="Main navigation">
            <a href="/#drops">The Fleet</a>
            <a href="/#how-it-works">How It Works</a>
          </nav>

          <div className="header-actions">
            <Button
              variant="ghost"
              size="icon"
              className="icon-action"
              aria-label={searchOpen ? "Close search" : "Search drops"}
              onClick={() => setSearchOpen((o) => !o)}
            >
              {searchOpen ? <X size={16} /> : <Search size={16} />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="icon-action relative"
              aria-label="Notifications"
              onClick={() => setNotificationsOpen(true)}
            >
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
            </Button>
          </div>
        </div>

        {searchOpen && (
          <div className="page-container pb-3">
            <label className="sr-only" htmlFor="drop-search">
              Search vehicles
            </label>
            <Input
              id="drop-search"
              autoFocus
              placeholder="Search Tesla models, cybertruck, roadster..."
              value={search}
              onChange={(e) => handleSearchInput(e.target.value)}
            />
          </div>
        )}
      </header>

      {/* Notifications Modal */}
      <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <DialogContent className="gap-5 rounded-md p-5 sm:max-w-[380px] sm:p-6">
          <DialogTitle className="font-serif text-2xl">Fleet Updates</DialogTitle>
          <DialogDescription className="modal-copy">
            Latest Tesla allocations and priority carrier drops.
          </DialogDescription>
          <div className="grid gap-3">
            {drops.slice(0, 3).map((drop) => (
              <div
                key={drop.id}
                className="flex items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <span className="toast-icon">
                  <Sparkles size={14} />
                </span>
                <p className="m-0 text-[11px] leading-relaxed">
                  <strong className="mb-1 block">{drop.name}</strong>
                  {drop.kind === "giveaway"
                    ? `${drop.entry_label || "Giveaway"} · ${formatFeeDisplay(drop.delivery_fee)} delivery`
                    : `${formatDisplayPrice(drop.amount)} · ${drop.entry_label || "Direct Purchase"}`}
                </p>
              </div>
            ))}
            {drops.length === 0 && (
              <p className="text-xs text-muted-foreground">No recent notifications.</p>
            )}
          </div>
          <Button
            variant="outline"
            className="w-full rounded-full"
            onClick={() => setNotificationsOpen(false)}
          >
            Acknowledge <Check size={14} className="ml-1.5" />
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
