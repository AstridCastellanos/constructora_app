import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Trash2 } from "lucide-react";
import { io } from "socket.io-client";

const API = "http://localhost:4000";

export default function NotificationsPopover({ open, onClose, anchorRef, usuario }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef(null);

  const fetchList = async () => {
    const token = localStorage.getItem("token");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/notificaciones?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      // Normaliza por si en algún momento cambias el shape
      const arr = Array.isArray(data)
        ? data
        : (data?.items || data?.notificaciones || data?.results || data?.rows || data?.docs || []);

      // Orden defensivo (desc)
      arr.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));
      setItems(arr);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const clearAll = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/api/notificaciones/read-all`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return; // si falla, no limpies UI
      setItems([]);
      // 🔔 Avisa al Sidebar para refrescar el badge
      window.dispatchEvent(new Event("notifs:refresh"));
    } catch {/* noop */}
  };

  // Conectar socket solo cuando se abre
  useEffect(() => {
    if (!open) return;

    // 1) Carga inicial (sin depender de _id)
    fetchList();

    // 2) Socket para tiempo real
    const s = io(API, { transports: ["websocket"] });
    socketRef.current = s;

    s.on("connect", () => {
      const userId = usuario?._id || usuario?.id;
      if (userId) s.emit("notifications:join", { userId });
    });

    s.on("notificaciones:nueva", () => {
      // Refrescar lista y badge
      fetchList();
      window.dispatchEvent(new Event("notifs:refresh"));
    });

    return () => {
      s.disconnect();
    };
  }, [open, usuario]);

  // Posicionamiento + altura dinámica para que el popover no se salga
  const pos = useMemo(() => {
    if (!anchorRef?.current) return { style: {}, bodyMaxH: 0 };
    const rect = anchorRef.current.getBoundingClientRect();
    const margin = 10;                         // separación respecto al botón
    const width = 360;                         // ancho del popover
    const top = Math.max(8, rect.top + 6);     // evita pegarse arriba
    const left = rect.right + margin;

    // Altura disponible desde top hasta borde inferior de la ventana
    const available = Math.max(220, window.innerHeight - top - 8); // mínimo 220px
    // Restamos header (48px) y footer (44px) para que el body haga scroll
    const bodyMaxH = Math.max(120, available - (48 + 44));

    return { style: { position: "fixed", top, left, zIndex: 60, width }, bodyMaxH };
  }, [anchorRef?.current, open]);

  if (!open) return null;

  return (
    <div className="sb-popover" style={pos.style}>
      {/* Header fijo */}
      <div className="sb-popover__header">
        <span>Notificaciones</span>
        <button className="sb-popover__iconbtn" onClick={onClose} title="Cerrar">
          <X size={16} />
        </button>
      </div>

      {/* Body con scroll interno */}
      <div className="sb-popover__body" style={{ maxHeight: pos.bodyMaxH }}>
        {loading && <div className="sb-popover__empty">Cargando…</div>}

        {!loading && items.length === 0 && (
          <div className="sb-popover__empty">No hay notificaciones</div>
        )}

        {!loading && items.length > 0 && (
          <ul className="sb-popover__list">
            {items.map((n) => (
              <li key={n._id} className="sb-popover__item">
                <div className="sb-popover__title">{n.titulo}</div>
                <div className="sb-popover__msg">{n.mensaje}</div>
                <div className="sb-popover__meta">
                  {new Date(n.fecha_creacion).toLocaleString()}
                  {n.id_proyecto && (
                    <a href={`/proyectos/${n.id_proyecto}`} className="sb-popover__link">
                      Ir al proyecto
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer fijo */}
      <div className="sb-popover__footer">
        <button className="sb-popover__clear" onClick={clearAll} title="Eliminar todas">
          <Trash2 size={16} /> Limpiar todo
        </button>
      </div>
    </div>
  );
}
