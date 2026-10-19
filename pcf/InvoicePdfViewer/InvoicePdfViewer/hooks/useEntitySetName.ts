import * as React from "react";

export type EntitySetNameResolver = (entityName: string) => Promise<string>;

/** Web API collection name of a table (e.g. cr679_invoice -> cr679_invoices), read from metadata once per table. */
export function useEntitySetName(entityName: string | undefined, resolve: EntitySetNameResolver): string | undefined {
  const [entitySetName, setEntitySetName] = React.useState<string>();

  React.useEffect(() => {
    if (!entityName) {
      return;
    }
    let active = true;
    resolve(entityName)
      .then((name) => active && setEntitySetName(name))
      .catch((error: unknown) => console.error("[RentMaszyny.InvoicePdfViewer] Reading table metadata failed", error));
    return () => {
      active = false;
    };
  }, [entityName, resolve]);

  return entitySetName;
}
