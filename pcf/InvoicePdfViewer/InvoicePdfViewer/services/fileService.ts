import { DEFAULT_FILE_NAME, FILE_NAME_HEADER, PDF_MIME_TYPE, WEB_API_PATH } from "../constants";

/** A file column of one Dataverse row. */
export interface FileReference {
  entitySetName: string;
  recordId: string;
  column: string;
}

export interface PdfFile {
  blob: Blob;
  fileName: string;
}

/** Any response other than the file or "no file" (e.g. 401, 403, 500). */
export class FileRequestError extends Error {
  constructor(readonly status: number) {
    super(`File download failed with HTTP ${status}`);
    this.name = "FileRequestError";
  }
}

export function fileUrl({ entitySetName, recordId, column }: FileReference): string {
  const id = recordId.replace(/[{}]/g, "");
  return `${WEB_API_PATH}/${entitySetName}(${id})/${column}/$value`;
}

/**
 * Downloads a file column as a PDF blob; null when the column is empty.
 * The request is relative to the app's origin and uses the user's session, so Dataverse security applies.
 */
export async function downloadPdf(file: FileReference, signal: AbortSignal, fetchImpl: typeof fetch = fetch): Promise<PdfFile | null> {
  const response = await fetchImpl(fileUrl(file), { signal, credentials: "same-origin" });

  // An empty file column answers 404 (or 204 on some API versions).
  if (response.status === 404 || response.status === 204) {
    return null;
  }
  if (!response.ok) {
    throw new FileRequestError(response.status);
  }

  // The type is forced to PDF so the browser renders it instead of offering a download.
  const blob = new Blob([await response.arrayBuffer()], { type: PDF_MIME_TYPE });
  const fileName = decodeURIComponent(response.headers.get(FILE_NAME_HEADER) ?? "") || DEFAULT_FILE_NAME;
  return { blob, fileName };
}
