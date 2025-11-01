const Proyecto = require("../models/Proyecto");
const Usuario = require("../models/Usuario");

// Participantes del proyecto (cliente y responsables)
async function participantesProyecto(proyectoId) {
  const p = await Proyecto.findById(proyectoId)
    .select("participantes.usuario_id participantes.tipo_participante")
    .lean();
  if (!p) return [];
  return (p.participantes || []).map(x => String(x.usuario_id));
}

// Solo IDs de clientes del proyecto 
async function clientesProyecto(proyectoId) {
  const p = await Proyecto.findById(proyectoId)
    .select("participantes.usuario_id participantes.tipo_participante")
    .lean();
  if (!p) return [];
  return (p.participantes || [])
    .filter(x => x.tipo_participante === "cliente")
    .map(x => String(x.usuario_id));
}

// Todos los usuarios Titular activos 
async function titularesActivosIds() {
  const us = await Usuario.find({ estado: "activo", roles: { $in: ["titular"] } })
    .select("_id")
    .lean();
  return us.map(u => String(u._id));
}

module.exports = {
  participantesProyecto,
  clientesProyecto,
  titularesActivosIds,
};
