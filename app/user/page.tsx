/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg } from "@fullcalendar/core";
import EventDetailModal from "../components/EventDetailModal";

/* ----------------------------------------------------
   TYPES
---------------------------------------------------- */
type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  color: string;
};

type BookingDetail = {
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
   COLOR MAP: สีตามรถ
---------------------------------------------------- */
const VEHICLE_COLORS: Record<string, string> = {
  "07607f9f-225a-4caf-939f-0d73155e68cd": "#93C5FD",
  "0c2eb051-128f-4552-9f78-619f1039e898": "#FCA5A5",
  "48aae147-44d1-4d02-9ad5-25db51dbf1fb": "#E9D5FF",
  "89fcb151-32c4-49e6-aee6-c3fb9eac0665": "#FDE68A",
};

const DEFAULT_COLOR = "#CBD5E1";

/* ----------------------------------------------------
   PAGE
---------------------------------------------------- */
export default function UserPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<BookingDetail | null>(null);

  /* โหลด booking */
  const loadBookings = useCallback(async () => {
    const res = await fetch("/api/get-bookings");
    const raw = await res.json();

    const formatted: CalendarEvent[] = raw.map((item: any) => {
      const vehicleColor =
        VEHICLE_COLORS[item.vehicle_id] ?? DEFAULT_COLOR;

      return {
        id: item.id,
        title: item.title || "ใช้งานรถ",
        start: item.start,
        end: item.end ?? undefined,
        color:
          item.status === "COMPLETED"
            ? "#22C55E"
            : vehicleColor,
      };
    });

    setEvents(formatted);
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  /* คลิกวันที่ว่าง */
  const onDateClick = (info: { dateStr: string; jsEvent: MouseEvent }) => {
    const target = info.jsEvent.target as HTMLElement;
    if (target.closest(".fc-event")) return;
    window.location.href = `/user/request?date=${info.dateStr}`;
  };

  /* คลิก event */
  const onEventClick = async (info: EventClickArg) => {
    info.jsEvent.preventDefault();

    setModalOpen(true);
    setSelected(null); // loading state

    try {
      const res = await fetch(
        `/api/get-booking-detail?id=${info.event.id}`
      );
      const detail: BookingDetail = await res.json();
      setSelected(detail);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale="th"
        height="auto"
        timeZone="local"
        events={events}
        eventDisplay="block"
        dayMaxEvents
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
    </>
  );
}
