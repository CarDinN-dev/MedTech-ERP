import { notFound } from "next/navigation";
import { getModule, moduleKeys } from "@/lib/erp-data";
import { ModuleWorkspace } from "@/components/module-workspace";

export function generateStaticParams() { return moduleKeys.map(module => ({ module })); }

export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module: key } = await params;
  const module = getModule(key);
  if (!module) notFound();
  return <ModuleWorkspace moduleKey={module.key} />;
}
