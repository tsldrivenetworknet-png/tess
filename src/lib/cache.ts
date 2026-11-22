/**
 * Synchronous client-side cache for drops, site config, and wallet config.
 * Allows instant 0ms transitions from storefront cards to the checkout / allocation page.
 */

import type { DbDrop, DbSiteConfig, DbWalletConfig, DbTestimonial } from "./supabase";

let memoryDrops: DbDrop[] = [];
let memorySiteConfig: DbSiteConfig | null = null;
let memoryWalletConfig: DbWalletConfig | null = null;
let memoryTestimonials: DbTestimonial[] = [];

// Try to hydrate from sessionStorage if available
if (typeof window !== "undefined") {
  try {
    const sDrops = sessionStorage.getItem("tdc_drops");
    if (sDrops) memoryDrops = JSON.parse(sDrops);

    const sSite = sessionStorage.getItem("tdc_site_config");
    if (sSite) memorySiteConfig = JSON.parse(sSite);

    const sWallet = sessionStorage.getItem("tdc_wallet_config");
    if (sWallet) memoryWalletConfig = JSON.parse(sWallet);

    const sTest = sessionStorage.getItem("tdc_testimonials");
    if (sTest) memoryTestimonials = JSON.parse(sTest);
  } catch {
    // Session storage unavailable or corrupt
  }
}

export function setCachedDrops(drops: DbDrop[]) {
  if (!drops || drops.length === 0) return;
  memoryDrops = drops;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem("tdc_drops", JSON.stringify(drops));
    } catch {}
  }
}

export function getCachedDrops(): DbDrop[] {
  return memoryDrops;
}

export function setCachedSiteConfig(config: DbSiteConfig) {
  if (!config) return;
  memorySiteConfig = config;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem("tdc_site_config", JSON.stringify(config));
    } catch {}
  }
}

export function getCachedSiteConfig(): DbSiteConfig | null {
  return memorySiteConfig;
}

export function setCachedWalletConfig(config: DbWalletConfig) {
  if (!config) return;
  memoryWalletConfig = config;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem("tdc_wallet_config", JSON.stringify(config));
    } catch {}
  }
}

export function getCachedWalletConfig(): DbWalletConfig | null {
  return memoryWalletConfig;
}

export function setCachedTestimonials(testimonials: DbTestimonial[]) {
  if (!testimonials || testimonials.length === 0) return;
  memoryTestimonials = testimonials;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem("tdc_testimonials", JSON.stringify(testimonials));
    } catch {}
  }
}

export function getCachedTestimonials(): DbTestimonial[] {
  return memoryTestimonials;
}
