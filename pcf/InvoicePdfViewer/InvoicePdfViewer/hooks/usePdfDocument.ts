import * as React from "react";
import { downloadPdf, FileReference } from "../services/fileService";

export type PdfDocumentState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "error" }
  | { status: "ready"; url: string; fileName: string };

const LOADING: PdfDocumentState = { status: "loading" };

/**
 * Loads the PDF of a file column into an object URL for the viewer.
 * Reloads when the file reference or `reloadKey` changes; aborts stale requests and frees the URL on cleanup.
 */
export function usePdfDocument(file: FileReference | null, reloadKey: unknown): [PdfDocumentState, () => void] {
  const [state, setState] = React.useState<PdfDocumentState>(LOADING);
  const [attempt, setAttempt] = React.useState(0);
  const retry = React.useCallback(() => setAttempt((value) => value + 1), []);

  const entitySetName = file?.entitySetName;
  const recordId = file?.recordId;
  const column = file?.column;

  React.useEffect(() => {
    if (!entitySetName || !recordId || !column) {
      setState({ status: "empty" });
      return;
    }

    const controller = new AbortController();
    let url: string | undefined;
    setState(LOADING);

    const load = async () => {
      try {
        const pdf = await downloadPdf({ entitySetName, recordId, column }, controller.signal);
        if (!pdf) {
          setState({ status: "empty" });
          return;
        }
        url = URL.createObjectURL(pdf.blob);
        setState({ status: "ready", url, fileName: pdf.fileName });
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          console.error("[RentMaszyny.InvoicePdfViewer] Loading the PDF failed", error);
          setState({ status: "error" });
        }
      }
    };
    void load();

    return () => {
      controller.abort();
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [entitySetName, recordId, column, reloadKey, attempt]);

  return [state, retry];
}
