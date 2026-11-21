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
  topCountdownBadge: "EXCLUSIVE TESLA DROP CLOSING",
  topCountdownText: "Tesla Cybertruck (Cyberbeast) · Claim window closing soon!",
  sectionEyebrow: "OFFICIAL TESLA ALLOCATIONS",
  sectionTitle: "The Tesla Fleet",
  sectionCaption: "Exclusive promotional drops, giveaways, and immediate delivery allocations.",
  demoNotificationsEnabled: true,
  demoNotifications: [
    { id: "1", name: "Sarah M.", location: "London, UK", dropName: "Tesla Cybertruck Cyberbeast", timeAgo: "Just now" },
    { id: "2", name: "Michael B.", location: "Austin, TX", dropName: "Tesla Roadster 2.0 Gold", timeAgo: "1m ago" },
    { id: "3", name: "David K.", location: "Miami, FL", dropName: "Tesla Model X Plaid", timeAgo: "2m ago" },
    { id: "4", name: "Liam P.", location: "Toronto, CA", dropName: "Tesla Cyber Roadster SpaceX", timeAgo: "3m ago" },
    { id: "5", name: "Elena R.", location: "Berlin, DE", dropName: "Tesla Model S Plaid", timeAgo: "4m ago" },
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
