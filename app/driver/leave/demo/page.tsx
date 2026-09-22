import { notFound } from 'next/navigation';
import DriverLeavePage from '@/app/components/DriverLeavePage';
export default function Page() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <DriverLeavePage demo />;
}
