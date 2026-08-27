import { PackageEditorDialog } from "@/features/creators/package-editor-dialog";
import { PackagesGrid } from "@/features/creators/packages-grid";
import { listMyPackages } from "@/lib/api/creators";

export default async function CreatorPackagesPage() {
  const packages = await listMyPackages();

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Paketlerim</h1>
          <p className="text-muted-foreground">Markaların herkese açık profilinizde gördüğü teklifleri yönetin.</p>
        </div>
        <PackageEditorDialog />
      </div>

      <PackagesGrid packages={packages} />
    </div>
  );
}
