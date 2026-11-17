import { BeheerNav } from "@/components/beheer-nav";
import { vereisAdmin } from "@/lib/auth";

export default async function BeheerLayout({ children }: { children: React.ReactNode }) {
  await vereisAdmin();
  return (
    <>
      <BeheerNav />
      {children}
    </>
  );
}
