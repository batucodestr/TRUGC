import { Suspense } from "react";
import { CreatorDirectory } from "@/features/creators/creator-directory";
import { LockedCreatorsTeaser } from "@/components/shared/locked-creators-teaser";
import { listCreators } from "@/lib/api/creators";
import { ApiError } from "@/lib/api";

export const metadata = { title: "İçerik Üreticileri Keşfet — TRUGC" };

export default async function CreatorsPage() {
  try {
    const creators = await listCreators();
    return (
      <Suspense>
        <CreatorDirectory allCreators={creators} />
      </Suspense>
    );
  } catch (err) {
    if (err instanceof ApiError && err.kind === "unauthorized") {
      return (
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <LockedCreatorsTeaser reason="login" />
        </div>
      );
    }
    if (err instanceof ApiError && err.kind === "forbidden") {
      return (
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <LockedCreatorsTeaser reason="payment" />
        </div>
      );
    }
    throw err;
  }
}
