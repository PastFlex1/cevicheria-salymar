export interface ValidationResult {
  valido: boolean;
  tipo: string;
  mensaje: string;
  datos?: {
    provincia?: string;
    tipoRuc?: string;
    establecimiento?: string;
  };
}

const PROVINCIAS: Record<string, string> = {
  "01": "Azuay",
  "02": "Bolívar",
  "03": "Cañar",
  "04": "Carchi",
  "05": "Cotopaxi",
  "06": "Chimborazo",
  "07": "El Oro",
  "08": "Esmeraldas",
  "09": "Guayas",
  "10": "Imbabura",
  "11": "Loja",
  "12": "Los Ríos",
  "13": "Manabí",
  "14": "Morona Santiago",
  "15": "Napo",
  "16": "Pastaza",
  "17": "Pichincha",
  "18": "Tungurahua",
  "19": "Zamora Chinchipe",
  "20": "Galápagos",
  "21": "Sucumbíos",
  "22": "Orellana",
  "23": "Santo Domingo de los Tsáchilas",
  "24": "Santa Elena",
};

export function limpiarDocumento(documento: string): string {
  if (!documento) return "";
  return documento.replace(/[^a-zA-Z0-9-]/g, "").trim().toUpperCase();
}

export function obtenerProvincia(codigo: string): string | undefined {
  return PROVINCIAS[codigo];
}

export function validarCedula(documento: string): ValidationResult {
  const cedula = limpiarDocumento(documento);
  
  if (!/^\d{10}$/.test(cedula)) {
    return { valido: false, tipo: "CEDULA", mensaje: "La cédula debe tener exactamente 10 dígitos numéricos." };
  }

  const codProvincia = cedula.substring(0, 2);
  const provincia = obtenerProvincia(codProvincia);
  if (!provincia) {
    return { valido: false, tipo: "CEDULA", mensaje: "Código de provincia inválido." };
  }

  const tercerDigito = parseInt(cedula.charAt(2), 10);
  if (tercerDigito < 0 || tercerDigito > 5) {
    return { valido: false, tipo: "CEDULA", mensaje: "El tercer dígito es inválido para personas naturales." };
  }

  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let valor = parseInt(cedula.charAt(i), 10) * coeficientes[i];
    if (valor > 9) {
      valor -= 9;
    }
    suma += valor;
  }

  const modulo = suma % 10;
  const digitoVerificadorCalculado = modulo === 0 ? 0 : 10 - modulo;
  const digitoVerificadorCedula = parseInt(cedula.charAt(9), 10);

  if (digitoVerificadorCalculado !== digitoVerificadorCedula) {
    return { valido: false, tipo: "CEDULA", mensaje: "La cédula ingresada no es válida." };
  }

  return {
    valido: true,
    tipo: "CEDULA",
    mensaje: "Cédula válida.",
    datos: { provincia },
  };
}

export function validarRucPersonaNatural(documento: string): ValidationResult {
  const ruc = limpiarDocumento(documento);
  if (!/^\d{13}$/.test(ruc)) {
    return { valido: false, tipo: "RUC", mensaje: "El RUC debe tener exactamente 13 dígitos numéricos." };
  }

  const cedulaBase = ruc.substring(0, 10);
  const establecimiento = ruc.substring(10, 13);
  
  if (establecimiento === "000") {
    return { valido: false, tipo: "RUC", mensaje: "El establecimiento no puede ser 000." };
  }

  const valCedula = validarCedula(cedulaBase);
  if (!valCedula.valido) {
    return { valido: false, tipo: "RUC", mensaje: "RUC de persona natural inválido: la cédula base es incorrecta." };
  }

  return {
    valido: true,
    tipo: "RUC",
    mensaje: "RUC de persona natural válido.",
    datos: {
      provincia: valCedula.datos?.provincia,
      tipoRuc: "PERSONA_NATURAL",
      establecimiento,
    },
  };
}

export function validarRucSociedadPrivada(documento: string): ValidationResult {
  const ruc = limpiarDocumento(documento);
  if (!/^\d{13}$/.test(ruc)) {
    return { valido: false, tipo: "RUC", mensaje: "El RUC debe tener exactamente 13 dígitos numéricos." };
  }

  const codProvincia = ruc.substring(0, 2);
  const provincia = obtenerProvincia(codProvincia);
  if (!provincia) {
    return { valido: false, tipo: "RUC", mensaje: "Código de provincia inválido." };
  }

  const tercerDigito = parseInt(ruc.charAt(2), 10);
  if (tercerDigito !== 9) {
    return { valido: false, tipo: "RUC", mensaje: "El tercer dígito debe ser 9 para sociedades privadas." };
  }

  const establecimiento = ruc.substring(10, 13);
  if (establecimiento === "000") {
    return { valido: false, tipo: "RUC", mensaje: "El establecimiento no puede ser 000." };
  }

  const coeficientes = [4, 3, 2, 7, 6, 5, 4, 3, 2];
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    suma += parseInt(ruc.charAt(i), 10) * coeficientes[i];
  }

  const modulo = suma % 11;
  const digitoVerificadorCalculado = modulo === 0 ? 0 : 11 - modulo;
  if (digitoVerificadorCalculado === 10) {
    return { valido: false, tipo: "RUC", mensaje: "El RUC de sociedad privada es inválido (dígito 10)." };
  }

  const digitoVerificadorRuc = parseInt(ruc.charAt(9), 10);
  if (digitoVerificadorCalculado !== digitoVerificadorRuc) {
    return { valido: false, tipo: "RUC", mensaje: "RUC de sociedad privada inválido." };
  }

  return {
    valido: true,
    tipo: "RUC",
    mensaje: "RUC de sociedad privada válido.",
    datos: {
      provincia,
      tipoRuc: "SOCIEDAD_PRIVADA",
      establecimiento,
    },
  };
}

export function validarRucEntidadPublica(documento: string): ValidationResult {
  const ruc = limpiarDocumento(documento);
  if (!/^\d{13}$/.test(ruc)) {
    return { valido: false, tipo: "RUC", mensaje: "El RUC debe tener exactamente 13 dígitos numéricos." };
  }

  const codProvincia = ruc.substring(0, 2);
  const provincia = obtenerProvincia(codProvincia);
  if (!provincia) {
    return { valido: false, tipo: "RUC", mensaje: "Código de provincia inválido." };
  }

  const tercerDigito = parseInt(ruc.charAt(2), 10);
  if (tercerDigito !== 6) {
    return { valido: false, tipo: "RUC", mensaje: "El tercer dígito debe ser 6 para entidades públicas." };
  }

  const establecimiento = ruc.substring(9, 13);
  if (establecimiento === "0000") {
    return { valido: false, tipo: "RUC", mensaje: "El establecimiento no puede ser 0000." };
  }

  const coeficientes = [3, 2, 7, 6, 5, 4, 3, 2];
  let suma = 0;
  for (let i = 0; i < 8; i++) {
    suma += parseInt(ruc.charAt(i), 10) * coeficientes[i];
  }

  const modulo = suma % 11;
  const digitoVerificadorCalculado = modulo === 0 ? 0 : 11 - modulo;
  if (digitoVerificadorCalculado === 10) {
    return { valido: false, tipo: "RUC", mensaje: "El RUC de entidad pública es inválido (dígito 10)." };
  }

  const digitoVerificadorRuc = parseInt(ruc.charAt(8), 10);
  if (digitoVerificadorCalculado !== digitoVerificadorRuc) {
    return { valido: false, tipo: "RUC", mensaje: "RUC de entidad pública inválido." };
  }

  return {
    valido: true,
    tipo: "RUC",
    mensaje: "RUC de entidad pública válido.",
    datos: {
      provincia,
      tipoRuc: "ENTIDAD_PUBLICA",
      establecimiento,
    },
  };
}

export function validarRuc(documento: string): ValidationResult {
  const ruc = limpiarDocumento(documento);
  if (!/^\d{13}$/.test(ruc)) {
    return { valido: false, tipo: "RUC", mensaje: "El RUC debe tener exactamente 13 dígitos numéricos." };
  }
  
  const tercerDigito = parseInt(ruc.charAt(2), 10);
  
  if (tercerDigito === 9) {
    return validarRucSociedadPrivada(ruc);
  } else if (tercerDigito === 6) {
    return validarRucEntidadPublica(ruc);
  } else if (tercerDigito >= 0 && tercerDigito <= 5) {
    return validarRucPersonaNatural(ruc);
  } else {
    return { valido: false, tipo: "RUC", mensaje: "RUC inválido: tercer dígito incorrecto." };
  }
}

export function validarPasaporte(documento: string): ValidationResult {
  const pasaporte = limpiarDocumento(documento);
  if (/^[A-Z0-9-]{5,20}$/.test(pasaporte)) {
    return { valido: true, tipo: "PASAPORTE", mensaje: "Pasaporte válido." };
  }
  return { valido: false, tipo: "PASAPORTE", mensaje: "Formato de pasaporte inválido (5 a 20 caracteres alfanuméricos)." };
}

export type TipoDocumento = "CEDULA" | "RUC" | "PASAPORTE" | "CONSUMIDOR_FINAL" | "Cédula" | "Pasaporte" | "Consumidor Final";

export function validarDocumento(tipoDocumento: TipoDocumento | string, numeroDocumento: string): ValidationResult {
  const limpio = limpiarDocumento(numeroDocumento);
  
  if (tipoDocumento === "CONSUMIDOR_FINAL" || tipoDocumento === "Consumidor Final") {
    if (limpio === "9999999999999") {
      return { valido: true, tipo: "CONSUMIDOR_FINAL", mensaje: "Consumidor final válido." };
    }
    return { valido: false, tipo: "CONSUMIDOR_FINAL", mensaje: "El número para consumidor final debe ser 9999999999999." };
  }

  if (!limpio) {
    return { valido: false, tipo: tipoDocumento, mensaje: "El documento no puede estar vacío." };
  }

  switch (tipoDocumento) {
    case "CEDULA":
    case "Cédula":
      return validarCedula(limpio);
    case "RUC":
      return validarRuc(limpio);
    case "PASAPORTE":
    case "Pasaporte":
      return validarPasaporte(limpio);
    default:
      // Si el tipo es genérico y no está especificado, intentamos adivinar.
      if (limpio === "9999999999999") return { valido: true, tipo: "CONSUMIDOR_FINAL", mensaje: "Consumidor final válido." };
      if (limpio.length === 10 && /^\d+$/.test(limpio)) return validarCedula(limpio);
      if (limpio.length === 13 && /^\d+$/.test(limpio)) return validarRuc(limpio);
      return validarPasaporte(limpio); // Fallback
  }
}
