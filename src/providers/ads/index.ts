import { MetaAdsProvider } from "@/providers/ads/meta";
import type { AdsProvider } from "@/providers/ads/types";

export function getAdsProvider(): AdsProvider {
  return new MetaAdsProvider();
}
