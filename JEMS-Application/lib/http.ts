/** Small HTTP helpers shared by route handlers. */

export interface JsonResult {
  data?: unknown;
  error?: string;
  status?: number;
}

/**
 * Reads and parses a JSON request body, rejecting anything larger than
 * `maxBytes` *before* doing work with it. This caps memory use and stops a
 * single oversized request from degrading the API for everyone else.
 */
export async function readJsonLimited(
  request: Request,
  maxBytes: number,
): Promise<JsonResult> {
  // Cheap pre-check on the declared size (can be spoofed/absent — see below).
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared && declared > maxBytes) {
    return { error: "Payload too large.", status: 413 };
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return { error: "Could not read request body.", status: 400 };
  }

  // Authoritative check on the actual decoded byte length.
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    return { error: "Payload too large.", status: 413 };
  }

  try {
    return { data: JSON.parse(text) };
  } catch {
    return { error: "Invalid JSON.", status: 400 };
  }
}
