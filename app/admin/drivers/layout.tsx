import { ModuleTabs } from '@/app/components/ModuleNavigation';
export default function Layout({ children }: { children: React.ReactNode }) {
  return <><ModuleTabs moduleKey="drivers" />{children}</>;
}
