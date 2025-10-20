import React from "react";
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
}) {
  if (!visible) return null;

  return (
    <div className="modal-overlay">
      <div className={`modal-contenedor ${tipo}`}>
        <h3 className="modal-titulo">{titulo}</h3>
        <p className="modal-mensaje">{mensaje}</p>

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
}
