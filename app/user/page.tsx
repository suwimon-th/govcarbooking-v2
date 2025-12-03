/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg } from "@fullcalendar/core";

import PageContainer from "../components/PageContainer";
import EventDetailModal from "../components/EventDetailModal";

/* ----------------------------------------------------
   TYPES
---------------------------------------------------- */
export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  color: string;
};

export type BookingDetail = {
  id: string;
  request_code: string;
  requester_name: string;

  purpose: string;
  start_at: string;
  end_at: string | null;

  driver_name: string;
  driver_phone: string;

  vehicle_plate: string;
  vehicle_brand: string;
  vehicle_model: string;

  department: string;

  start_mileage: number;
  end_mileage: number;
  distance: number;

  status: string;
  created_at: string;
};

/* ----------------------------------------------------
   MAIN PAGE
---------------------------------------------------- */
export default function UserDashboard() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<BookingDetail | null>(null);

  /* ----------------------------------------------------
     โหลด booking ทั้งหมด
  ---------------------------------------------------- */
  const loadBookings = useCallback(async () => {
    console.log("📌 loadBookings()");

    const res = await fetch("/api/get-bookings");
    const raw = await res.json();

    console.log("📌 RAW:", raw);

    const formatted: CalendarEvent[] = raw.map((item: any) => ({
      id: item.id,
      title: item.title || "ใช้งานรถ",
      start: item.start,
      end: item.end ?? undefined,

      // ⭐ เปลี่ยนสี COMPLETE เป็นเขียว
      color:
        item.status === "COMPLETED"
          ? "#22C55E" // เขียว
          : "#0D47A1", // น้ำเงิน
    }));

    console.log("📌 Parsed:", formatted);

    setEvents(formatted);
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  /* ----------------------------------------------------
     คลิกวันที่ว่าง → ไปหน้า request
  ---------------------------------------------------- */
  const onDateClick = (info: { dateStr: string; jsEvent: MouseEvent }) => {
    const target = info.jsEvent.target as HTMLElement;

    // ถ้าคลิกโดน event → ไม่ redirect
    if (target.closest(".fc-event")) return;

    window.location.href = `/user/request?date=${info.dateStr}`;
  };

  /* ----------------------------------------------------
     คลิก event → เปิด modal
  ---------------------------------------------------- */
  const onEventClick = async (info: EventClickArg) => {
    info.jsEvent.preventDefault();

    const id = info.event.id;

    const res = await fetch(`/api/get-booking-detail?id=${id}`);
    const detail: BookingDetail = await res.json();

    setSelected(detail);
    setModalOpen(true);
  };

  /* ----------------------------------------------------
     RENDER
  ---------------------------------------------------- */
  return (
    <PageContainer title="ปฏิทินการใช้รถราชการ">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale="th"
        height="auto"
        events={events}
        eventDisplay="block"
        dayMaxEvents={true}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "",
        }}
        dateClick={onDateClick}
        eventClick={onEventClick}
      />

      <EventDetailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        detail={selected}
      />
    </PageContainer>
  );
}
