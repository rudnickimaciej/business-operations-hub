import * as React from "react";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { PdfViewer } from "./components/PdfViewer";
import { EntitySetNameResolver } from "./hooks/useEntitySetName";
import { DEFAULT_HEIGHT, MIN_HEIGHT, StringKey, Strings, Texts } from "./constants";

/** Record the form shows; not in the public typings, but always present on model-driven forms. */
interface ContextInfo {
  entityId?: string;
  entityTypeName?: string;
}

/**
 * Shows the PDF stored in a file column of the current record (the invoice document).
 * Bound to the document status, so it reloads when the generator finishes.
 */
export class InvoicePdfViewer implements ComponentFramework.ReactControl<IInputs, IOutputs> {
  private resolveEntitySetName!: EntitySetNameResolver;
  private texts!: Texts;

  public init(context: ComponentFramework.Context<IInputs>): void {
    // Created once, so hooks that depend on it do not rerun on every render.
    this.resolveEntitySetName = async (entityName) =>
      ((await context.utils.getEntityMetadata(entityName)) as { EntitySetName: string }).EntitySetName;
    this.texts = Object.fromEntries(
      (Object.keys(Strings) as StringKey[]).map((key) => [key, context.resources.getString(Strings[key])])
    ) as Texts;
  }

  public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
    const { entityId, entityTypeName } = (context.mode as unknown as { contextInfo?: ContextInfo }).contextInfo ?? {};

    return React.createElement(
      FluentProvider,
      { theme: context.fluentDesignLanguage?.tokenTheme ?? webLightTheme },
      React.createElement(PdfViewer, {
        entityName: entityTypeName,
        recordId: entityId === "" ? undefined : entityId, // a new record has an empty id
        column: context.parameters.fileColumn.raw ?? "",
        reloadKey: context.parameters.reloadOn.raw,
        height: Math.max(context.parameters.height.raw ?? DEFAULT_HEIGHT, MIN_HEIGHT),
        texts: this.texts,
        resolveEntitySetName: this.resolveEntitySetName,
      })
    );
  }

  public getOutputs(): IOutputs {
    return {};
  }

  public destroy(): void {
    // Requests and object URLs are released by the React hooks when the tree unmounts.
  }
}
