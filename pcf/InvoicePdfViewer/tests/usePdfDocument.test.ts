import { act, renderHook } from "@testing-library/react-hooks";
import { usePdfDocument } from "../InvoicePdfViewer/hooks/usePdfDocument";
import * as fileService from "../InvoicePdfViewer/services/fileService";

const FILE = { entitySetName: "cr679_invoices", recordId: "87411879-e6c6-f111-aaad-70a8a57f8bd2", column: "cr679_document" };
const PDF = { blob: new Blob(["%PDF"], { type: "application/pdf" }), fileName: "FV-01007.pdf" };

let urlCount = 0;
const createObjectURL = jest.fn(() => `blob:pdf-${++urlCount}`);
const revokeObjectURL = jest.fn();

beforeAll(() => {
  Object.assign(URL, { createObjectURL, revokeObjectURL });
});

afterEach(() => {
  jest.restoreAllMocks();
  urlCount = 0;
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
});

describe("usePdfDocument", () => {
  it("loads the PDF into an object URL", async () => {
    jest.spyOn(fileService, "downloadPdf").mockResolvedValue(PDF);
    const { result, waitForNextUpdate } = renderHook(() => usePdfDocument(FILE, 1));

    expect(result.current[0]).toEqual({ status: "loading" });
    await waitForNextUpdate();
    expect(result.current[0]).toEqual({ status: "ready", url: "blob:pdf-1", fileName: "FV-01007.pdf" });
  });

  it("reports an empty file column", async () => {
    jest.spyOn(fileService, "downloadPdf").mockResolvedValue(null);
    const { result, waitForNextUpdate } = renderHook(() => usePdfDocument(FILE, 1));
    await waitForNextUpdate();
    expect(result.current[0]).toEqual({ status: "empty" });
  });

  it("is empty without a record, without calling Dataverse", () => {
    const download = jest.spyOn(fileService, "downloadPdf");
    const { result } = renderHook(() => usePdfDocument(null, 1));
    expect(result.current[0]).toEqual({ status: "empty" });
    expect(download).not.toHaveBeenCalled();
  });

  it("reports an error and loads again on retry", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const download = jest.spyOn(fileService, "downloadPdf").mockRejectedValueOnce(new Error("403")).mockResolvedValueOnce(PDF);
    const { result, waitForNextUpdate } = renderHook(() => usePdfDocument(FILE, 1));
    await waitForNextUpdate();
    expect(result.current[0]).toEqual({ status: "error" });

    act(() => result.current[1]());
    await waitForNextUpdate();
    expect(result.current[0].status).toBe("ready");
    expect(download).toHaveBeenCalledTimes(2);
  });

  it("reloads when the reload key changes and frees the previous URL", async () => {
    const download = jest.spyOn(fileService, "downloadPdf").mockResolvedValue(PDF);
    const { result, rerender, waitForNextUpdate } = renderHook(({ key }) => usePdfDocument(FILE, key), { initialProps: { key: 1 } });
    await waitForNextUpdate();

    rerender({ key: 2 });
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:pdf-1");
    await waitForNextUpdate();
    expect(result.current[0]).toEqual({ status: "ready", url: "blob:pdf-2", fileName: "FV-01007.pdf" });
    expect(download).toHaveBeenCalledTimes(2);
  });

  it("aborts the request and frees the URL on unmount", async () => {
    let signal: AbortSignal | undefined;
    jest.spyOn(fileService, "downloadPdf").mockImplementation((_file, s) => {
      signal = s;
      return Promise.resolve(PDF);
    });
    const { unmount, waitForNextUpdate } = renderHook(() => usePdfDocument(FILE, 1));
    await waitForNextUpdate();

    unmount();
    expect(signal?.aborted).toBe(true);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:pdf-1");
  });
});
