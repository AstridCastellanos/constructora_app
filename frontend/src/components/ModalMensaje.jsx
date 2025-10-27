import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import "../styles/ModalMensaje.css";

export default function ModalMensaje({
  visible,
  titulo = "Aviso",
  mensaje = "",
  tipo = "info", // info | success | error | warning
  onAceptar,
  onCancelar,
  textoAceptar = "Aceptar",
  textoCancelar = "Cancelar",
  mostrarCancelar = false,
  children, // <<--- NUEVO
}) {
  if (!visible) return null;

  // Bloquear scroll del body mientras el modal está abierto
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const content = (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className={`modal-contenedor ${tipo}`}>
        <h3 className="modal-titulo">{titulo}</h3>

        {/* Si hay children, úsalos; si no, muestra el mensaje normal */}
        {children ? (
          <div className="modal-contenido">{children}</div>
        ) : (
          <p className="modal-mensaje">{mensaje}</p>
        )}

        <div className="modal-botones">
          <button className="btn-aceptar" onClick={onAceptar}>
            {textoAceptar}
          </button>
          {mostrarCancelar && (
            <button className="btn-cancelar" onClick={onCancelar}>
              {textoCancelar}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Renderiza fuera de cualquier stacking context del layout
  return createPortal(content, document.body);
}
