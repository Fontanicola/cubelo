"use client";

import { Bookmark, CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { setContactoInNotas } from "@/lib/cobranzas/notas";
import { createClient } from "@/lib/supabase/client";

type DatePickerContactoProps = {
  acuerdoId: string;
  lastContact?: string | null;
  notas?: string | null;
};

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre"
];

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

function toInputDate(value?: string | null) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value.length >= 10 ? value.slice(0, 10) : "";
  }

  return parsed.toISOString().slice(0, 10);
}

function formatDate(value: string) {
  if (!value) {
    return "Fecha";
  }

  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function buildMonthDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const mondayIndex = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return [
    ...Array.from({ length: mondayIndex }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1)
  ];
}

export function DatePickerContacto({ acuerdoId, lastContact, notas }: DatePickerContactoProps) {
  const initialDate = toInputDate(lastContact);
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [savedDate, setSavedDate] = useState(initialDate);
  const [monthDate, setMonthDate] = useState(() => {
    const base = initialDate ? new Date(`${initialDate}T00:00:00`) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const days = useMemo(() => buildMonthDays(monthDate), [monthDate]);

  function selectDay(day: number) {
    const year = monthDate.getFullYear();
    const month = String(monthDate.getMonth() + 1).padStart(2, "0");
    const date = String(day).padStart(2, "0");
    setSelectedDate(`${year}-${month}-${date}`);
  }

  async function handleSave() {
    const supabase = createClient();
    const nextNotas = setContactoInNotas(notas, selectedDate);

    if (supabase) {
      const { error } = await supabase
        .from("acuerdos")
        .update({ notas: nextNotas, updated_at: new Date().toISOString() })
        .eq("id", acuerdoId);

      if (error) {
        console.error("No se pudo guardar el ultimo contacto", error);
      }
    }

    setSavedDate(selectedDate);
    setOpen(false);
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex min-w-[118px] items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
      >
        <CalendarDays className="h-4 w-4 text-cubelo-blue" aria-hidden="true" />
        <span>{formatDate(savedDate)}</span>
      </button>

      {open ? (
        <div className="absolute right-0 top-11 z-40 w-[286px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
          <div className="bg-cubelo-blue px-4 py-3 text-center text-xs font-bold uppercase text-white">
            CALENDARIO
          </div>
          <div className="p-4">
            <button
              type="button"
              className="mb-4 flex w-full items-center justify-between rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700"
            >
              Fecha exacta
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>

            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
                }
                className="rounded-md p-1 text-cubelo-blue hover:bg-gray-100"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <div className="text-sm font-bold text-gray-900">
                {MONTHS[monthDate.getMonth()]} {monthDate.getFullYear()}
              </div>
              <button
                type="button"
                onClick={() =>
                  setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
                }
                className="rounded-md p-1 text-cubelo-blue hover:bg-gray-100"
                aria-label="Mes siguiente"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-gray-400">
              {WEEKDAYS.map((day, index) => (
                <div key={`${day}-${index}`} className="py-1">
                  {day}
                </div>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {days.map((day, index) =>
                day ? (
                  <button
                    key={day}
                    type="button"
                    onClick={() => selectDay(day)}
                    className={`h-8 rounded-md text-xs font-semibold ${
                      selectedDate ===
                      `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}-${String(
                        day
                      ).padStart(2, "0")}`
                        ? "bg-cubelo-blue text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {day}
                  </button>
                ) : (
                  <div key={`empty-${index}`} className="h-8" />
                )
              )}
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={!selectedDate}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-cubelo-blue px-4 py-2.5 text-sm font-bold text-white hover:bg-[#2929a8] disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              <Bookmark className="h-4 w-4" aria-hidden="true" />
              Guardar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
