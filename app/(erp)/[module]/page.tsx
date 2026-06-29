import { notFound } from "next/navigation";
import { getModule, moduleKeys } from "@/lib/erp-data";
import { ModuleWorkspace } from "@/components/module-workspace";
import { HRWorkspace } from "@/components/hr-workspace";

export function generateStaticParams() { return moduleKeys.map(module => ({ module })); }

export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module: key } = await params;
  const moduleConfig = getModule(key);
  if (!moduleConfig) notFound();
  if (moduleConfig.key === "hr") return <HRWorkspace />;
  return <ModuleWorkspace moduleKey={moduleConfig.key} />;
}
