import { downloadPdf, FileReference, FileRequestError, fileUrl } from "../InvoicePdfViewer/services/fileService";

const FILE: FileReference = { entitySetName: "cr679_invoices", recordId: "{87411879-E6C6-F111-AAAD-70A8A57F8BD2}", column: "cr679_document" };

/** The part of fetch's Response the service reads (jsdom has no Response). */
function response(status: number, body = "%PDF-1.7", headers: Record<string, string> = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    arrayBuffer: () => Promise.resolve(Uint8Array.from(body, (char) => char.charCodeAt(0)).buffer),
  } as unknown as Response;
}

function fetchReturning(result: Response) {
  return jest.fn(() => Promise.resolve(result)) as unknown as jest.MockedFunction<typeof fetch>;
}

describe("fileUrl", () => {
  it("points at the raw value of the file column, without braces in the id", () => {
    expect(fileUrl(FILE)).toBe("/api/data/v9.2/cr679_invoices(87411879-E6C6-F111-AAAD-70A8A57F8BD2)/cr679_document/$value");
  });
});

describe("downloadPdf", () => {
  const signal = new AbortController().signal;

  it("returns the file as a PDF blob with its stored name", async () => {
    const fetchImpl = fetchReturning(response(200, "%PDF-1.7", { "x-ms-file-name": "FV-01007.pdf" }));
    const pdf = await downloadPdf(FILE, signal, fetchImpl);

    expect(pdf?.fileName).toBe("FV-01007.pdf");
    expect(pdf?.blob.type).toBe("application/pdf");
    expect(pdf?.blob.size).toBe(8);
    expect(fetchImpl).toHaveBeenCalledWith(fileUrl(FILE), { signal, credentials: "same-origin" });
  });

  it("decodes an encoded file name and falls back to a default one", async () => {
    const encoded = await downloadPdf(FILE, signal, fetchReturning(response(200, "x", { "x-ms-file-name": "Faktura%20FV%201.pdf" })));
    const missing = await downloadPdf(FILE, signal, fetchReturning(response(200)));
    expect(encoded?.fileName).toBe("Faktura FV 1.pdf");
    expect(missing?.fileName).toBe("document.pdf");
  });

  it.each([404, 204])("returns null for an empty file column (HTTP %i)", async (status) => {
    expect(await downloadPdf(FILE, signal, fetchReturning(response(status)))).toBeNull();
  });

  it.each([401, 403, 500])("throws a FileRequestError for HTTP %i", async (status) => {
    await expect(downloadPdf(FILE, signal, fetchReturning(response(status)))).rejects.toEqual(new FileRequestError(status));
  });
});
