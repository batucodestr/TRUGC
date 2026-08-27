import type { SocialPlatform } from "@/types";
import { cn } from "@/lib/utils";
import { InstagramIcon, TikTokIcon, YoutubeIcon, TwitchIcon } from "@/components/shared/brand-icons";

const ICON_MAP: Record<SocialPlatform, React.ComponentType<{ className?: string }>> = {
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  youtube: YoutubeIcon,
  twitch: TwitchIcon,
};

export const PLATFORM_COLOR: Record<SocialPlatform, string> = {
  instagram: "text-pink-600",
  tiktok: "text-foreground",
  youtube: "text-red-600",
  twitch: "text-purple-600",
};

export function PlatformIcon({ platform, className }: { platform: SocialPlatform; className?: string }) {
  const Icon = ICON_MAP[platform];
  return <Icon className={cn(PLATFORM_COLOR[platform], className)} />;
}
