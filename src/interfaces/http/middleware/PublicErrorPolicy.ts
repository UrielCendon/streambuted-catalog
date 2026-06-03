export const PUBLIC_ERROR_MESSAGES = {
  conflict_or_state_changed: "El contenido cambio y no se pudo completar la accion. Intenta nuevamente.",
  dependency_validation_failed: "No se pudo validar la informacion relacionada con esta accion. Intenta nuevamente.",
  invalid_input: "La solicitud no cumple con el formato esperado.",
  request_timeout: "La solicitud tardo demasiado y no se pudo completar. Intenta nuevamente.",
  resource_not_found: "El contenido solicitado ya no esta disponible.",
  service_temporarily_unavailable: "Esta funcion no esta disponible en este momento. Intenta de nuevo mas tarde.",
  unauthorized: "Tu sesion expiro. Inicia sesion nuevamente.",
  unexpected_operation_failure: "No se pudo completar la accion en este momento. Intenta de nuevo mas tarde.",
  forbidden: "No tienes permisos para esta accion.",
} as const;

export type PublicErrorCode = keyof typeof PUBLIC_ERROR_MESSAGES | "ACCOUNT_BANNED";

const INTERNAL_MARKERS = [
  "jwks",
  "grpc",
  "rabbitmq",
  "minio",
  "prisma",
  "postgres",
  "mongodb",
  "redis",
  "identity service",
  "catalog service",
  "media service",
  "analytics service",
  "streaming service",
  "live service",
  "database",
];

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function hasInternalMarker(message: string | null | undefined): boolean {
  const normalized = normalize(message);
  return INTERNAL_MARKERS.some(marker => normalized.includes(marker));
}

export function inferPublicErrorCode(statusCode: number, error: string, message: string): PublicErrorCode {
  if (error === "AccountBannedException") {
    return "ACCOUNT_BANNED";
  }

  const normalizedError = normalize(error);
  const normalizedMessage = normalize(message);
  const combined = `${normalizedError} ${normalizedMessage}`;

  if (
    combined.includes("timeout")
      || combined.includes("deadline exceeded")
      || combined.includes("tardo demasiado")
  ) {
    return "request_timeout";
  }

  if (
    combined.includes("serviceunavailable")
      || combined.includes("unavailable")
      || combined.includes("no esta disponible temporalmente")
  ) {
    return "service_temporarily_unavailable";
  }

  if (
    combined.includes("no pudo validar")
      || combined.includes("no es accesible")
      || combined.includes("dependency")
  ) {
    return "dependency_validation_failed";
  }

  if (
    combined.includes("conflict")
      || combined.includes("resource changed")
      || combined.includes("changed")
  ) {
    return "conflict_or_state_changed";
  }

  if (statusCode === 401) return "unauthorized";
  if (statusCode === 403) return "forbidden";
  if (statusCode === 404) return "resource_not_found";
  if (statusCode === 408 || statusCode === 504) return "request_timeout";
  if (statusCode === 409) return "conflict_or_state_changed";
  if (statusCode === 400 || statusCode === 422) return "invalid_input";
  if (statusCode >= 500) return "service_temporarily_unavailable";

  return "unexpected_operation_failure";
}

export function resolvePublicMessage(publicCode: PublicErrorCode, rawMessage: string): string {
  if (publicCode === "ACCOUNT_BANNED") {
    return rawMessage;
  }

  if (!rawMessage || hasInternalMarker(rawMessage)) {
    return PUBLIC_ERROR_MESSAGES[publicCode];
  }

  return rawMessage;
}
