import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import styles from "./OfficialReportMenuLink.module.css";

export default function OfficialReportMenuLink({ active, onNavigate }: { active: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href="/admin/reports/fuel/official"
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label="รายงานน้ำมันตามแบบราชการ ทั้ง 8 แบบ"
      className={`${styles.link} ${active ? styles.active : ""}`}
    >
      <span className={styles.icon}><FileText size={18} aria-hidden="true" /></span>
      <span className={styles.content}>
        <span className={styles.title}>รายงานน้ำมัน<br />ตามแบบราชการ</span>
        <span className={styles.description}>รายเดือน · ปีงบประมาณ</span>
      </span>
      <span className={styles.trailing}>
        <span className={styles.badge}>8 แบบ</span>
        <ChevronRight size={14} aria-hidden="true" />
      </span>
    </Link>
  );
}
