export const WEB_API_PATH = "/api/data/v9.2";
export const PDF_MIME_TYPE = "application/pdf";

/** Dataverse returns the stored file name in this header when a file column is downloaded. */
export const FILE_NAME_HEADER = "x-ms-file-name";

/** Fallback when the record or the header has no file name. */
export const DEFAULT_FILE_NAME = "document.pdf";

export const MIN_HEIGHT = 300;
export const DEFAULT_HEIGHT = 900;

/** Keys of the strings/*.resx files. */
export const Strings = {
  loading: "Status_Loading",
  empty: "Status_Empty",
  unsaved: "Status_Unsaved",
  error: "Status_Error",
  retry: "Action_Retry",
  openInNewTab: "Action_OpenInNewTab",
  download: "Action_Download",
} as const;

export type StringKey = keyof typeof Strings;
export type Texts = Record<StringKey, string>;
