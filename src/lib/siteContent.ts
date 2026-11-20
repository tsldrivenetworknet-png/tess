export type DemoNotification = {
  id: string;
  name: string;
  location: string;
  dropName: string;
  timeAgo: string;
};

export type ExtendedSiteContent = {
  topCountdownBadge: string;
  topCountdownText: string;
  sectionEyebrow: string;
  sectionTitle: string;
  sectionCaption: string;
  demoNotificationsEnabled: boolean;
  demoNotifications: DemoNotification[];
};

export const DEFAULT_SITE_CONTENT: ExtendedSiteContent = {
  topCountdownBadge: "FLASH DROP CLOSING",
  topCountdownText: "Scarlet High Tops · Claim window closing soon!",
  sectionEyebrow: "HANDPICKED FOR YOU",
  sectionTitle: "The good stuff",
  sectionCaption: "Good things do not wait. Neither do these.",
  demoNotificationsEnabled: true,
  demoNotifications: [
    { id: "1", name: "Sarah M.", location: "London, UK", dropName: "Scarlet High Tops", timeAgo: "Just now" },
    { id: "2", name: "David K.", location: "New York, USA", dropName: "Tesla Cyberbackpack", timeAgo: "1m ago" },
    { id: "3", name: "Elena R.", location: "Berlin, DE", dropName: "Scarlet High Tops", timeAgo: "2m ago" },
    { id: "4", name: "Liam P.", location: "Toronto, CA", dropName: "Wireless Earbuds Pro", timeAgo: "3m ago" },
    { id: "5", name: "Marcus T.", location: "Sydney, AU", dropName: "Scarlet High Tops", timeAgo: "4m ago" },
  ],
};

const STORAGE_KEY = "dropclub_extended_content";

export function getExtendedContent(): ExtendedSiteContent {
  if (typeof window === "undefined") return DEFAULT_SITE_CONTENT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SITE_CONTENT;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SITE_CONTENT,
      ...parsed,
      demoNotifications: Array.isArray(parsed.demoNotifications) && parsed.demoNotifications.length > 0
        ? parsed.demoNotifications
        : DEFAULT_SITE_CONTENT.demoNotifications,
    };
  } catch (err) {
    console.warn("Error reading extended site content:", err);
    return DEFAULT_SITE_CONTENT;
  }
}

export function saveExtendedContent(updates: Partial<ExtendedSiteContent>): ExtendedSiteContent {
  const current = getExtendedContent();
  const next = { ...current, ...updates };
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("dropclub_content_updated"));
  }
  return next;
}
