const CONTACTO_PREFIX = "Ultimo contacto:";

export function getComentarioFromNotas(notas?: string | null) {
  return (notas ?? "")
    .split("\n")
    .filter((line) => !line.trim().startsWith(CONTACTO_PREFIX))
    .join("\n")
    .trim();
}

export function getContactoFromNotas(notas?: string | null) {
  const line = (notas ?? "")
    .split("\n")
    .find((item) => item.trim().startsWith(CONTACTO_PREFIX));

  return line?.replace(CONTACTO_PREFIX, "").trim() ?? "";
}

export function setComentarioInNotas(notas: string | null | undefined, comentario: string) {
  const contacto = getContactoFromNotas(notas);
  const lines = [comentario.trim()];

  if (contacto) {
    lines.push(`${CONTACTO_PREFIX} ${contacto}`);
  }

  return lines.filter(Boolean).join("\n");
}

export function setContactoInNotas(notas: string | null | undefined, fecha: string) {
  const comentario = getComentarioFromNotas(notas);
  const lines = [comentario, `${CONTACTO_PREFIX} ${fecha}`];

  return lines.filter(Boolean).join("\n");
}
