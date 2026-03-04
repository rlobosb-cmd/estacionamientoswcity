"use client";

import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";

type Building = "STEPKE" | "BARCELONA" | "TRIZANO";

const SPOTS: Record<Building, number[]> = {
  STEPKE: [1, 2, 3, 7, 11, 17, 18, 24, 29, 34, 37, 38, 46],
  BARCELONA: [1, 3, 12],
  TRIZANO: [1, 9, 11, 21, 22, 23, 31],
};

type DbReservation = {
  id: number;
  building: string;
  spot: number;
  start_at: string; // timestamptz ISO
  end_at: string;   // timestamptz ISO
  depto?: string | null;
  patente?: string | null;
  nombre?: string | null;
};

function ymd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// mediodía local para evitar líos TZ
function toMiddayISO(dateYmd: string) {
  return new Date(`${dateYmd}T12:00:00`).toISOString();
}

function prettyDate(dateYmd: string) {
  const d = new Date(`${dateYmd}T00:00:00`);
  return d.toLocaleDateString("es-CL", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

function minYmd(a: string, b: string) {
  return a <= b ? a : b;
}
function maxYmd(a: string, b: string) {
  return a >= b ? a : b;
}

export default function Page() {
  const [building, setBuilding] = useState<Building>("STEPKE");
  const [dateYmd, setDateYmd] = useState(() => ymd(new Date()));

  const spots = useMemo(() => SPOTS[building], [building]);

  const [reservasDia, setReservasDia] = useState<DbReservation[]>([]);
const [reservations, setReservations] = useState<DbReservation[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal nueva reserva
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    spot: spots[0] ?? 1,
    from: dateYmd,
    to: dateYmd,
    depto: "",
    patente: "",
    nombre: "",
  });

  // cuando cambia edificio o fecha, ajustamos spot default
  useEffect(() => {
    setForm((p) => ({
      ...p,
      spot: SPOTS[building][0] ?? 1,
      from: dateYmd,
      to: dateYmd,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [building, dateYmd]);

const loadAllReservations = async () => {
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .order("start_at", { ascending: false });

  if (!error && data) {
    setReservations(data);
  }
};
  const loadDay = async () => {
    setLoading(true);
    try {
      const startAt = toMiddayISO(dateYmd);
      const endAt = toMiddayISO(dateYmd);

      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .eq("building", building)
        // reservas que incluyen ese día
        .lte("start_at", endAt)
        .gte("end_at", startAt);

      if (error) {
        console.error(
  "loadDay error:",
  error?.message,
  error?.details,
  error?.hint,
  error?.code,
  error
);
        setReservasDia([]);
        return;
      }

      setReservasDia((data ?? []) as DbReservation[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  loadDay();
  loadAllReservations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [building, dateYmd]);

  // mapa spot -> reserva (si hay más de 1, tomamos la primera)
  const bySpot = useMemo(() => {
    const m = new Map<number, DbReservation>();
    for (const r of reservasDia) {
      if (!m.has(r.spot)) m.set(r.spot, r);
    }
    return m;
  }, [reservasDia]);

  const saveReservation = async () => {
    const from = minYmd(form.from, form.to);
    const to = maxYmd(form.from, form.to);

    if (!form.depto.trim()) {
      alert("Falta DEPTO (obligatorio).");
      return;
    }

    const startAt = toMiddayISO(from);
    const endAt = toMiddayISO(to);

    // overlap check
    const { data: overlap, error: eOverlap } = await supabase
      .from("reservations")
      .select("id")
      .eq("building", building)
      .eq("spot", form.spot)
      .lte("start_at", endAt)
      .gte("end_at", startAt);

    if (eOverlap) {
      alert("Error al validar choque: " + eOverlap.message);
      return;
    }
    if ((overlap?.length ?? 0) > 0) {
      alert("Ese estacionamiento ya está reservado en ese rango.");
      return;
    }

    const { error } = await supabase.from("reservations").insert({
      building,
      spot: form.spot,
      start_at: startAt,
      end_at: endAt,
      depto: form.depto.trim(),
      patente: form.patente.trim() || null,
      nombre: form.nombre.trim() || null,
    });

    if (error) {
      alert("Error al guardar: " + error.message);
      return;
    }

    setOpen(false);
    setForm((p) => ({ ...p, depto: "", patente: "", nombre: "" }));
    await loadDay();
    alert("Reserva guardada ✅");
  };

  const cardStyle: React.CSSProperties = {
    border: "1px solid #111",
    borderRadius: 12,
    padding: 12,
    background: "white",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid #999",
    borderRadius: 10,
    outline: "none",
  };

  return (
    <main style={{ padding: 18, fontFamily: "system-ui, sans-serif" }}>
     
	{/* Mapa visual de estacionamientos */}
    
  {(["STEPKE", "BARCELONA", "TRIZANO"] as const).map((b) => (
    <button
      key={b}
      onClick={() => setBuilding(b)}
      style={{
        padding: "6px 12px",
        borderRadius: 10,
        border: "1px solid #ccc",
        background: building === b ? "#111" : "#f5f5f5",
        color: building === b ? "#fff" : "#000",
        cursor: "pointer",
        fontWeight: 700,
      }}
    >
      {b}
    </button>
  ))}
</div>
      {/* Controles */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ fontWeight: 800 }}>Edificio:</label>
        <select
          value={building}
          onChange={(e) => setBuilding(e.target.value as Building)}
          style={{ padding: 8, border: "1px solid #999", borderRadius: 10 }}
        >
          <option value="STEPKE">STEPKE</option>
          <option value="BARCELONA">BARCELONA</option>
          <option value="TRIZANO">TRIZANO</option>
        </select>

        <label style={{ fontWeight: 800 }}>Fecha:</label>
        <input
          type="date"
          value={dateYmd}
          onChange={(e) => setDateYmd(e.target.value)}
          style={{ padding: 8, border: "1px solid #999", borderRadius: 10 }}
        />

        <button
          onClick={() => setOpen(true)}
          style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #111", fontWeight: 900 }}
        >
          + Nueva reserva
        </button>

        <span style={{ opacity: 0.75 }}>
          {loading ? "Cargando..." : prettyDate(dateYmd)}
        </span>
      </div>

      {/* Tablero */}
      <div style={{ marginTop: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {spots.map((spot) => {
            const r = bySpot.get(spot);
            const ocupado = !!r;

            return (
              <div
                key={spot}
                style={{
                  ...cardStyle,
                  background: ocupado ? "#fee2e2" : "#dcfce7",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>
                    {building} · Est {spot}
                  </div>
                  <div style={{ fontWeight: 900 }}>
                    {ocupado ? "🔴 OCUPADO" : "🟢 LIBRE"}
                  </div>
                </div>

                {ocupado ? (
                  <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.35 }}>
                    <div><b>Depto:</b> {r?.depto ?? "-"}</div>
                    <div><b>Patente:</b> {r?.patente ?? "-"}</div>
                    <div><b>Nombre:</b> {r?.nombre ?? "-"}</div>
                  </div>
                ) : (
                  <div style={{ marginTop: 10, opacity: 0.8, fontSize: 13 }}>
                    Disponible para reservar
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal simple */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(620px, 100%)", background: "white", borderRadius: 16, padding: 16, border: "1px solid #111" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>Nueva reserva</h2>
              <button onClick={() => setOpen(false)} style={{ border: "1px solid #111", borderRadius: 10, padding: "6px 10px" }}>
                Cerrar
              </button>
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontWeight: 800 }}>Estacionamiento</label>
                <select
                  value={form.spot}
                  onChange={(e) => setForm((p) => ({ ...p, spot: Number(e.target.value) }))}
                  style={{ ...inputStyle }}
                >
                  {spots.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div />

              <div>
                <label style={{ fontWeight: 800 }}>Desde</label>
                <input
                  type="date"
                  value={form.from}
                  onChange={(e) => setForm((p) => ({ ...p, from: e.target.value }))}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ fontWeight: 800 }}>Hasta</label>
                <input
                  type="date"
                  value={form.to}
                  onChange={(e) => setForm((p) => ({ ...p, to: e.target.value }))}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ fontWeight: 800 }}>Depto (obligatorio)</label>
                <input
                  value={form.depto}
                  onChange={(e) => setForm((p) => ({ ...p, depto: e.target.value }))}
                  style={inputStyle}
                  autoComplete="off"
                />
              </div>

              <div>
                <label style={{ fontWeight: 800 }}>Patente (opcional)</label>
                <input
                  value={form.patente}
                  onChange={(e) => setForm((p) => ({ ...p, patente: e.target.value }))}
                  style={inputStyle}
                  autoComplete="off"
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontWeight: 800 }}>Nombre (opcional)</label>
                <input
                  value={form.nombre}
                  onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                  style={inputStyle}
                  autoComplete="off"
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
              <button
                onClick={() => setOpen(false)}
                style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #111" }}
              >
                Cancelar
              </button>
              <button
                onClick={saveReservation}
                style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #111", fontWeight: 900 }}
              >
                Guardar
              </button>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
              * Si el rango choca con otra reserva del mismo estacionamiento, no deja guardar.
            </div>
          </div>
        </div>
      )}
<hr style={{ margin: "30px 0" }} />

<h2 style={{ fontSize: 18, fontWeight: 800 }}>Reservas guardadas</h2>

<div style={{ display: "grid", gap: 8, marginTop: 10 }}>
  {reservations.map((r) => (
    <div key={r.id}>

      <div>
        {r.building} · Est {r.spot} · {r.depto} · {r.nombre}
      </div>

      <button
        onClick={async () => {
          const ok = confirm("¿Eliminar esta reserva?");
          if (!ok) return;

          const { error } = await supabase
            .from("reservations")
            .delete()
            .eq("id", r.id);

          if (error) {
            alert("Error al eliminar: " + error.message);
            return;
          }

          loadAllReservations();
          alert("Reserva eliminada ✅");
        }}
        style={{
          marginTop: 8,
          padding: "6px 10px",
          border: "1px solid #111",
          borderRadius: 10,
          cursor: "pointer",
        }}
        >
        Eliminar
      </button>

    </div>
  ))}
</div>

    </main>
  );
}