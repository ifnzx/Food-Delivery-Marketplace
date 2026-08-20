import { OutletShell } from "@/components/OutletShell";

export default function OutletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OutletShell>{children}</OutletShell>;
}
