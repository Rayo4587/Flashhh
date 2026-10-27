const MESSAGES: Record<string, string> = {
  NO_AUTH: "Inicia sesión para reservar.",
  CLASE_NO_DISPONIBLE: "Esta clase ya no está disponible.",
  FECHA_INVALIDA: "La fecha seleccionada no es válida para esta clase.",
  CLASE_PASADA: "Esta clase ya comenzó.",
  YA_RESERVADO: "Ya tienes una reserva para esta clase.",
  CUPO_LLENO: "La clase está llena (12/12). Elige otro horario.",
  RESERVA_NO_ENCONTRADA: "No encontramos la reserva.",
  FUERA_DE_PLAZO: "Ya no es posible cancelar: faltan menos de 12 horas para la clase.",
  NO_AUTORIZADO: "No tienes permisos para esta acción.",
};

export function friendlyError(message: string | undefined) {
  if (!message) return "Ocurrió un error. Intenta de nuevo.";
  const code = Object.keys(MESSAGES).find((k) => message.includes(k));
  return code ? MESSAGES[code] : "Ocurrió un error. Intenta de nuevo.";
}
