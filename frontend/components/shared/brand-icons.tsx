// lucide-react v1 dropped brand/social icons, so these are hand-authored
// in the same 24x24 stroke style to match the rest of the icon set.
import type { SVGProps } from "react";

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function YoutubeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21.6 7.2a2.7 2.7 0 0 0-1.9-1.9C18 5 12 5 12 5s-6 0-7.7.3A2.7 2.7 0 0 0 2.4 7.2 28 28 0 0 0 2 12a28 28 0 0 0 .4 4.8 2.7 2.7 0 0 0 1.9 1.9C6 19 12 19 12 19s6 0 7.7-.3a2.7 2.7 0 0 0 1.9-1.9A28 28 0 0 0 22 12a28 28 0 0 0-.4-4.8Z" />
      <path d="m10 9.5 5 2.5-5 2.5Z" />
    </svg>
  );
}

export function TwitchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 3 3.5 6.5v13H8V22l3-2.5h3.5L19 15V3Z" />
      <path d="M13.5 7.5v4M9.5 7.5v4" />
    </svg>
  );
}

export function TikTokIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M16.6 5.82a4.28 4.28 0 0 1-3.14-1.39V15.4a5.32 5.32 0 1 1-4.6-5.27v2.34a2.98 2.98 0 1 0 2.08 2.84V2h2.44a4.28 4.28 0 0 0 3.22 4.14z" />
    </svg>
  );
}

export function TwitterIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 4 18.2 20M4 20 18.2 4" opacity="0" />
      <path d="M3 3l7.5 9.5L3.5 21H6l6-6.8 5 6.8h4l-8-10.2L20.5 3H18l-5.6 6.3L7 3Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function LinkedinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M7.5 10.5v6M7.5 7.75v.01M12 16.5v-4a2 2 0 0 1 4 0v4M12 12.5v4" />
    </svg>
  );
}
