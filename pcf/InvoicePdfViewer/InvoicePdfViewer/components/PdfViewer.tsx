import * as React from "react";
import {
  Button,
  makeStyles,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  Spinner,
  Text,
  tokens,
} from "@fluentui/react-components";
import { Texts } from "../constants";
import { EntitySetNameResolver, useEntitySetName } from "../hooks/useEntitySetName";
import { usePdfDocument } from "../hooks/usePdfDocument";

export interface PdfViewerProps {
  entityName?: string;
  recordId?: string;
  column: string;
  reloadKey: unknown;
  height: number;
  texts: Texts;
  resolveEntitySetName: EntitySetNameResolver;
}

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    overflow: "hidden",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  fileName: {
    flexGrow: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  badge: {
    flexShrink: 0,
    padding: `0 ${tokens.spacingHorizontalXS}`,
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorPaletteRedBackground3,
    color: tokens.colorNeutralForegroundOnBrand,
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightBold,
    lineHeight: tokens.lineHeightBase200,
  },
  frame: {
    width: "100%",
    border: "none",
    display: "block",
  },
  placeholder: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: tokens.spacingVerticalXXL,
  },
});

export const PdfViewer: React.FC<PdfViewerProps> = ({ entityName, recordId, column, reloadKey, height, texts, resolveEntitySetName }) => {
  const styles = useStyles();
  const entitySetName = useEntitySetName(entityName, resolveEntitySetName);
  const file = React.useMemo(
    () => (entitySetName && recordId ? { entitySetName, recordId, column } : null),
    [entitySetName, recordId, column]
  );
  const [pdf, retry] = usePdfDocument(file, reloadKey);

  if (!recordId) {
    return <Notice intent="info" text={texts.unsaved} />;
  }
  if (!entitySetName || pdf.status === "loading") {
    return (
      <div className={styles.placeholder}>
        <Spinner size="small" label={texts.loading} />
      </div>
    );
  }
  if (pdf.status === "empty") {
    return <Notice intent="info" text={texts.empty} />;
  }
  if (pdf.status === "error") {
    return (
      <Notice
        intent="error"
        text={texts.error}
        action={
          <Button appearance="transparent" size="small" onClick={retry}>
            {texts.retry}
          </Button>
        }
      />
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <span className={styles.badge} aria-hidden>
          PDF
        </span>
        <Text weight="semibold" className={styles.fileName} title={pdf.fileName}>
          {pdf.fileName}
        </Text>
        <Button appearance="subtle" size="small" as="a" href={pdf.url} target="_blank" rel="noopener noreferrer">
          {texts.openInNewTab}
        </Button>
        <Button appearance="subtle" size="small" as="a" href={pdf.url} download={pdf.fileName}>
          {texts.download}
        </Button>
      </div>
      <iframe className={styles.frame} style={{ height }} src={pdf.url} title={pdf.fileName} />
    </div>
  );
};

const Notice: React.FC<{ intent: "info" | "error"; text: string; action?: React.ReactNode }> = ({ intent, text, action }) => (
  <MessageBar intent={intent}>
    <MessageBarBody>{text}</MessageBarBody>
    {action && <MessageBarActions>{action}</MessageBarActions>}
  </MessageBar>
);
