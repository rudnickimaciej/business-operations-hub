/**
 * Minimal Xrm mocks for Jest. Only the members used by the scripts are mocked;
 * cast to the Xrm type at the call site with `as unknown as Xrm.…`.
 */

export function lookupAttribute(id: string | null) {
  return {
    getValue: jest.fn().mockReturnValue(id ? [{ id, name: "x", entityType: "x" }] : null),
  };
}

export function formContext(attributes: Record<string, unknown> = {}) {
  return {
    getAttribute: jest.fn((name: string) => attributes[name] ?? null),
    data: { entity: { save: jest.fn(), addOnSave: jest.fn() } },
    ui: { setFormNotification: jest.fn(), clearFormNotification: jest.fn() },
  };
}

export function saveEventContext(form: ReturnType<typeof formContext>, saveMode = 1) {
  const eventArgs = { preventDefault: jest.fn(), getSaveMode: jest.fn().mockReturnValue(saveMode) };
  return {
    getFormContext: jest.fn().mockReturnValue(form),
    getEventArgs: jest.fn().mockReturnValue(eventArgs),
    eventArgs,
  };
}

export function webApi(order: Record<string, unknown>, conflicts: Record<string, unknown>[] = []) {
  return {
    retrieveRecord: jest.fn().mockResolvedValue(order),
    retrieveMultipleRecords: jest.fn().mockResolvedValue({ entities: conflicts }),
  };
}

/** Lets pending promise callbacks run. */
export const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));
