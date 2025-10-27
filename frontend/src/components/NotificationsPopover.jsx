import React, { useEffect, useMemo, useState } from "react";
import { X, Trash2 } from "lucide-react";
import { getSocket, joinUserRoom } from "../utils/socketClient";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function NotificationsPopover({ open, onClose, anchorRef, usuario }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchList = async () => {
    const token = localStorage.getItem("token");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/notificaciones?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const arr = Array.isArray(data)
        ? data
        : (data?.items || data?.notificaciones || data?.results || data?.rows || data?.docs || []);
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
      if (!res.ok) return;
      setItems([]);
      window.dispatchEvent(new Event("notifs:refresh"));
    } catch {}
  };

  useEffect(() => {
    if (!open) return;
    fetchList();

    const s = getSocket();
    joinUserRoom(usuario);

    const handleNew = () => {
      fetchList();
      window.dispatchEvent(new Event("notifs:refresh"));
    };

    s.on("notificaciones:nueva", handleNew);
    return () => s.off("notificaciones:nueva", handleNew);
  }, [open, usuario]);

  const pos = React.useMemo(() => {
    if (!anchorRef?.current) return { style: {}, bodyMaxH: 0 };
    const rect = anchorRef.current.getBoundingClientRect();
    const margin = 10;
    const width = 360;
    const top = Math.max(8, rect.top + 6);
    const left = rect.right + margin;
    const available = Math.max(220, window.innerHeight - top - 8);
    const bodyMaxH = Math.max(120, available - (48 + 44));
    return { style: { position: "fixed", top, left, zIndex: 60, width }, bodyMaxH };
  }, [anchorRef?.current, open]);

  if (!open) return null;

  return (
    <div className="sb-popover" style={pos.style}>
      <div className="sb-popover__header">
        <span>Notificaciones</span>
        <button className="sb-popover__iconbtn" onClick={onClose} title="Cerrar">
          <X size={16} />
        </button>
      </div>

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
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="sb-popover__footer">
        <button className="sb-popover__clear" onClick={clearAll} title="Eliminar todas">
          <Trash2 size={16} /> Limpiar todo
        </button>
      </div>
    </div>
  );
}
