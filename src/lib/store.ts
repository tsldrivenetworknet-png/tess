/**
 * Drop Club — shared localStorage-backed store.
 * All admin-editable state lives here so both the storefront and admin panel
 * read from the same source of truth.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type DropKind = "giveaway" | "shop";

export type Drop = {
  id: string;
  name: string;
  category: string;
  kind: DropKind;
  image: string;
  imageAlt: string;
  prizeValue: string;
  delivery: string;
  deliveryTime: string;
  entryLabel: string;
  timeLeft: number; // seconds from epoch when this drop was last saved
  amount?: string; // shop only
  shipping: string; // "Free" or "$X.XX"
  deliveryFee: string; // display string e.g. "$8.50"
  description?: string;
  pickupAvailable?: boolean;
};

export type SiteConfig = {
  siteName: string;
  logoDataUrl: string; // base64 or empty string (falls back to Zap icon)
  iconDataUrl: string; // base64 favicon or empty
  announcementText: string;
  heroHeadline: string;
  heroSubtitle: string;
  heroImageDataUrl: string; // base64 or empty (falls back to default sneaker)
  heroEntries: string;
  heroPrizeValue: string;
  heroDeliveryFee: string;
  footerText: string;
};

export type WalletConfig = {
  primaryAddress: string;
  primaryCoin: string; // "ETH" | "BTC" | "USDC" | ...
  secondaryAddress: string;
  secondaryCoin: string;
  acceptedCoins: string[]; // coins shown in checkout
};

export type OrderStatus = "entered" | "paid" | "abandoned";

export type Order = {
  id: string;
  dropId: string;
  dropName: string;
  kind: DropKind;
  email: string;
  status: OrderStatus;
  crypto?: string;
  amount?: string;
  createdAt: string; // ISO
  deliveryFee?: string;
  pickupSelected?: boolean;
};

export type StoreData = {
  siteConfig: SiteConfig;
  drops: Drop[];
  walletConfig: WalletConfig;
  orders: Order[];
};

// ─── Default data ────────────────────────────────────────────────────────────

const SNEAKER_URL =
  "/__l5e/assets-v1/1ee6a773-87ea-4cbb-96d4-5102700c9ddb/dropclub-sneakers.png";
const CAMERA_URL =
  "/__l5e/assets-v1/f878da8d-b389-4b76-bbb7-55928c3c5c41/dropclub-camera.png";
const WATCH_URL =
  "/__l5e/assets-v1/cab8b32c-b035-4455-be60-62568f53ad17/dropclub-watch.png";

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  siteName: "dropclub",
  logoDataUrl: "",
  iconDataUrl: "",
  announcementText: "FRESH FINDS. REAL WINNERS. YOUR NEXT FAVOURITE STARTS HERE.",
  heroHeadline: "A little luck.\nA lot of love.",
  heroSubtitle:
    "Your next favourite thing is one drop away. Meet the prize everyone's talking about.",
  heroImageDataUrl: "",
  heroEntries: "2,184",
  heroPrizeValue: "$240",
  heroDeliveryFee: "$8.50",
  footerText: "© 2026 Drop Club. Good things happen here.",
};

export const DEFAULT_DROPS: Drop[] = [
  {
    id: "scarlet-high-tops",
    name: "Scarlet High Tops",
    category: "STYLE · LIMITED EDITION",
    kind: "giveaway",
    image: SNEAKER_URL,
    imageAlt: "White and scarlet high-top sneakers in a red spotlight",
    prizeValue: "$240",
    delivery: "$8.50 delivery",
    deliveryTime: "Ships in 2–4 days",
    entryLabel: "2,184 entered",
    timeLeft: 4 * 86400 + 13 * 3600 + 28 * 60 + 11,
    shipping: "$8.50",
    deliveryFee: "$8.50",
    description: "Limited edition scarlet and white high-top sneakers.",
    pickupAvailable: true,
  },
  {
    id: "studio-camera",
    name: "Studio Camera Kit",
    category: "TECH · CREATOR PICK",
    kind: "shop",
    image: CAMERA_URL,
    imageAlt: "Black mirrorless camera and lens in a soft studio",
    prizeValue: "$1,299 value",
    amount: "$899",
    delivery: "Delivery on us",
    deliveryTime: "Ships in 1–2 days",
    entryLabel: "Only 12 left",
    timeLeft: 1 * 86400 + 6 * 3600 + 42 * 60 + 30,
    shipping: "Free",
    deliveryFee: "Free",
    description: "Professional mirrorless camera kit for creators.",
    pickupAvailable: false,
  },
  {
    id: "evergreen-watch",
    name: "Evergreen Automatic",
    category: "OBJECTS · EDITION 04",
    kind: "giveaway",
    image: WATCH_URL,
    imageAlt: "Stainless-steel watch with a deep green face",
    prizeValue: "$680",
    delivery: "$6 delivery",
    deliveryTime: "Ships in 3–5 days",
    entryLabel: "816 entered",
    timeLeft: 2 * 86400 + 7 * 3600 + 9 * 60 + 4,
    shipping: "$6.00",
    deliveryFee: "$6.00",
    description: "Stainless-steel automatic watch, edition 04.",
    pickupAvailable: true,
  },
];

export const DEFAULT_WALLET_CONFIG: WalletConfig = {
  primaryAddress: "",
  primaryCoin: "ETH",
  secondaryAddress: "",
  secondaryCoin: "BTC",
  acceptedCoins: ["BTC", "ETH", "USDC"],
};

// ─── Storage helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY = "dropclub_store";

function isServer(): boolean {
  return typeof window === "undefined";
}

export function loadStore(): StoreData {
  if (isServer()) {
    return {
      siteConfig: DEFAULT_SITE_CONFIG,
      drops: DEFAULT_DROPS,
      walletConfig: DEFAULT_WALLET_CONFIG,
      orders: [],
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("empty");
    const parsed = JSON.parse(raw) as Partial<StoreData>;
    return {
      siteConfig: { ...DEFAULT_SITE_CONFIG, ...(parsed.siteConfig ?? {}) },
      drops: parsed.drops ?? DEFAULT_DROPS,
      walletConfig: { ...DEFAULT_WALLET_CONFIG, ...(parsed.walletConfig ?? {}) },
      orders: parsed.orders ?? [],
    };
  } catch {
    return {
      siteConfig: DEFAULT_SITE_CONFIG,
      drops: DEFAULT_DROPS,
      walletConfig: DEFAULT_WALLET_CONFIG,
      orders: [],
    };
  }
}

export function saveStore(data: StoreData): void {
  if (isServer()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ─── Order helpers ────────────────────────────────────────────────────────────

export function addOrder(order: Omit<Order, "id" | "createdAt">): Order {
  const store = loadStore();
  const newOrder: Order = {
    ...order,
    id: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  store.orders = [newOrder, ...store.orders];
  saveStore(store);
  return newOrder;
}

export function updateOrderStatus(id: string, status: OrderStatus): void {
  const store = loadStore();
  store.orders = store.orders.map((o) => (o.id === id ? { ...o, status } : o));
  saveStore(store);
}
