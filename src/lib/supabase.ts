import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://prtgnpvypqrdhtnimwrc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_vVQBq4V7RB_Csjkd6U8sFA_jzcYmOag";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// ── Types matching DB schema ──────────────────────────────────

export type DbDrop = {
  id: string;
  name: string;
  category: string;
  kind: "giveaway" | "shop";
  image_url: string;
  image_alt: string;
  prize_value: string;
  delivery_fee: string;
  delivery_time: string;
  entry_label: string;
  time_left: number;
  amount: string;
  shipping: string;
  description: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type DbSiteConfig = {
  id: number;
  site_name: string;
  logo_url: string;
  icon_url: string;
  announcement_text: string;
  hero_headline: string;
  hero_subtitle: string;
  hero_image_url: string;
  hero_entries: string;
  hero_prize_value: string;
  hero_delivery_fee: string;
  footer_text: string;
  updated_at: string;
};

export type DbWalletConfig = {
  id: number;
  primary_address: string;
  primary_coin: string;
  secondary_address: string;
  secondary_coin: string;
  accepted_coins: string[];
  updated_at: string;
};

export type DbOrder = {
  id: string;
  drop_id: string | null;
  drop_name: string;
  kind: "giveaway" | "shop";
  email: string;
  full_name: string;
  address: string;
  status: "entered" | "paid" | "abandoned";
  crypto: string;
  amount: string;
  delivery_fee: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

// ── Storage helpers ───────────────────────────────────────────

const BUCKET = "dropclub";

export async function uploadImage(file: File, path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(data.path);
  return urlData.publicUrl;
}

export async function uploadDataUrl(
  dataUrl: string,
  path: string,
): Promise<string> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const file = new File([blob], path, { type: blob.type });
  return uploadImage(file, path);
}

// ── Site config ───────────────────────────────────────────────

export async function fetchSiteConfig(): Promise<DbSiteConfig> {
  const { data, error } = await supabase
    .from("site_config")
    .select("*")
    .single();
  if (error) throw error;
  return data as DbSiteConfig;
}

export async function saveSiteConfig(
  config: Partial<DbSiteConfig>,
): Promise<void> {
  const { error } = await supabase
    .from("site_config")
    .update({ ...config, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw error;
}

// ── Drops ─────────────────────────────────────────────────────

export async function fetchDrops(): Promise<DbDrop[]> {
  const { data, error } = await supabase
    .from("drops")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbDrop[];
}

export async function fetchAllDrops(): Promise<DbDrop[]> {
  const { data, error } = await supabase
    .from("drops")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbDrop[];
}

export async function createDrop(
  drop: Omit<DbDrop, "id" | "created_at" | "updated_at">,
): Promise<DbDrop> {
  const { data, error } = await supabase
    .from("drops")
    .insert(drop)
    .select()
    .single();
  if (error) throw error;
  return data as DbDrop;
}

export async function updateDrop(
  id: string,
  drop: Partial<DbDrop>,
): Promise<void> {
  const { error } = await supabase
    .from("drops")
    .update({ ...drop, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteDrop(id: string): Promise<void> {
  const { error } = await supabase.from("drops").delete().eq("id", id);
  if (error) throw error;
}

// ── Wallet config ─────────────────────────────────────────────

export async function fetchWalletConfig(): Promise<DbWalletConfig> {
  const { data, error } = await supabase
    .from("wallet_config")
    .select("*")
    .single();
  if (error) throw error;
  return data as DbWalletConfig;
}

export async function saveWalletConfig(
  config: Partial<DbWalletConfig>,
): Promise<void> {
  const { error } = await supabase
    .from("wallet_config")
    .update({ ...config, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw error;
}

export async function fetchWalletQrUrls(): Promise<{ primaryQr: string; secondaryQr: string }> {
  let primaryQr = typeof window !== "undefined" ? localStorage.getItem("dropclub_primary_qr") || "" : "";
  let secondaryQr = typeof window !== "undefined" ? localStorage.getItem("dropclub_secondary_qr") || "" : "";

  try {
    const { data } = await supabase.storage.from(BUCKET).list("wallets");
    if (data) {
      const primaryFile = data.find((f) => f.name.startsWith("primary_qr"));
      const secondaryFile = data.find((f) => f.name.startsWith("secondary_qr"));

      if (primaryFile && !primaryQr) {
        primaryQr = supabase.storage.from(BUCKET).getPublicUrl(`wallets/${primaryFile.name}`).data.publicUrl;
      }
      if (secondaryFile && !secondaryQr) {
        secondaryQr = supabase.storage.from(BUCKET).getPublicUrl(`wallets/${secondaryFile.name}`).data.publicUrl;
      }
    }
  } catch (err) {
    console.warn("Storage QR check failed, using local fallback:", err);
  }

  return { primaryQr, secondaryQr };
}

export async function uploadWalletQr(
  type: "primary" | "secondary",
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop() || "png";
  const path = `wallets/${type}_qr.${ext}`;
  const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || "image/png",
  });
  if (error) throw error;
  const url = supabase.storage.from(BUCKET).getPublicUrl(data.path).data.publicUrl;
  if (typeof window !== "undefined") {
    localStorage.setItem(`dropclub_${type}_qr`, url);
  }
  return url;
}

// ── Orders ────────────────────────────────────────────────────

export async function fetchOrders(): Promise<DbOrder[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbOrder[];
}

export async function createOrder(
  order: Omit<DbOrder, "id" | "created_at" | "updated_at">,
): Promise<DbOrder> {
  const { data, error } = await supabase
    .from("orders")
    .insert(order)
    .select()
    .single();
  if (error) throw error;
  return data as DbOrder;
}

export async function updateOrderStatus(
  id: string,
  status: "entered" | "paid" | "abandoned",
): Promise<void> {
  const { error } = await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// ── Testimonials ──────────────────────────────────────────────

export type DbTestimonial = {
  id: string;
  name: string;
  location: string;
  vehicle_model: string;
  quote: string;
  image_url?: string;
  rating?: number;
  created_at?: string;
};

export const DEFAULT_TESTIMONIALS: DbTestimonial[] = [
  {
    id: "t1",
    name: "Marcus Vance",
    location: "Austin, Texas",
    vehicle_model: "Tesla Cybertruck (Cyberbeast Matte Black)",
    quote: "Secured my allocation spot and received enclosed white-glove transport right to my driveway. Vehicle arrived in pristine factory condition. Simply incredible!",
    rating: 5,
    image_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    created_at: "2026-11-20T10:00:00Z",
  },
  {
    id: "t2",
    name: "Elena Rostova",
    location: "Miami, Florida",
    vehicle_model: "Tesla Model S Plaid (Ultra Red)",
    quote: "I thought it was too good to be true until the dispatch carrier called with the bill of lading. Delivery fee paid via BTC, transport was right on schedule.",
    rating: 5,
    image_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    created_at: "2026-11-19T14:30:00Z",
  },
  {
    id: "t3",
    name: "David K. Campbell",
    location: "London, United Kingdom",
    vehicle_model: "Tesla Roadster 2.0 (Glitter Gold Edition)",
    quote: "Allocation verified, locked in my priority transport and the carrier updates via email kept me informed every step of the journey. 10/10 service.",
    rating: 5,
    image_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    created_at: "2026-11-18T09:15:00Z",
  },
  {
    id: "t4",
    name: "Sophia Martinez",
    location: "Toronto, Canada",
    vehicle_model: "Tesla Model X Plaid SUV (Pearl White)",
    quote: "Carrier arrived with enclosed auto-transport trailer. Flawless handover and delivery paperwork. Couldn't be happier with this allocation experience!",
    rating: 5,
    image_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    created_at: "2026-11-17T16:45:00Z",
  },
];

export async function fetchTestimonials(): Promise<DbTestimonial[]> {
  try {
    const { data, error } = await supabase
      .from("testimonials")
      .select("*")
      .order("created_at", { ascending: false });
    if (error || !data || data.length === 0) {
      return DEFAULT_TESTIMONIALS;
    }
    return data as DbTestimonial[];
  } catch {
    return DEFAULT_TESTIMONIALS;
  }
}

export async function createTestimonial(
  testimonial: Omit<DbTestimonial, "id" | "created_at">,
): Promise<void> {
  const { error } = await supabase.from("testimonials").insert(testimonial);
  if (error) throw error;
}

export async function deleteTestimonial(id: string): Promise<void> {
  const { error } = await supabase.from("testimonials").delete().eq("id", id);
  if (error) throw error;
}
