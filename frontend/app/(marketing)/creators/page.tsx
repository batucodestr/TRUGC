import { Suspense } from "react";
import { CreatorDirectory } from "@/features/creators/creator-directory";
import { listCreators } from "@/lib/api/creators";

export const metadata = { title: "İçerik Üreticileri Keşfet — TRUGC" };

export default async function CreatorsPage() {
  const creators = await listCreators();
  return (
    <Suspense>
      <CreatorDirectory allCreators={creators} />
    </Suspense>
  );
}
