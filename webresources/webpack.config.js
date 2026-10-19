const fs = require("fs");
const path = require("path");

/**
 * Bundles are discovered by convention, no per-script configuration:
 *
 *   src/<table>/<table>.<form>.ts
 *     -> web resource  cr679_<table><form>            (dist/cr679_<table><form>.js)
 *     -> global        RentMaszyny.<table>.<form>     (form handler: RentMaszyny.<table>.<form>.onLoad)
 *
 * Example: src/orderitem/orderitem.quickcreate.ts -> cr679_orderitemquickcreate, RentMaszyny.orderitem.quickcreate
 *
 * A file is an entry only if it exports `onLoad` (a form script) or is named <table>.ribbon.ts (command bar
 * functions, e.g. RentMaszyny.order.ribbon.createInvoice). Every other file in a table folder (e.g.
 * machineAvailability.ts, invoice.helper.ts) and everything in src/shared/ is a module that entries import,
 * so it is bundled into them, never published as a web resource of its own.
 * The pipeline copies each bundle over solutions/RentMaszyny/src/WebResources/<name>; the web resource must
 * already exist in the solution (create it once in DEV, then sync), otherwise the build fails.
 */
const PREFIX = "cr679_";
const NAMESPACE = "RentMaszyny";
const srcDir = path.resolve(__dirname, "src");
const RIBBON = "ribbon";

const ON_LOAD_EXPORT = /^export\s+(async\s+)?function\s+onLoad\b/m;

function exportsOnLoad(file) {
  return ON_LOAD_EXPORT.test(fs.readFileSync(file, "utf8"));
}

function findEntries() {
  return fs
    .readdirSync(srcDir, { withFileTypes: true })
    .filter((dir) => dir.isDirectory() && dir.name !== "shared")
    .flatMap((dir) => {
      const pattern = new RegExp(`^${dir.name}\\.([a-z0-9]+)\\.ts$`);
      return fs
        .readdirSync(path.join(srcDir, dir.name))
        .map((file) => file.match(pattern))
        .filter((match) => match && (match[1] === RIBBON || exportsOnLoad(path.join(srcDir, dir.name, match[0]))))
        .map((match) => ({ table: dir.name, form: match[1], entry: `./src/${dir.name}/${match[0]}` }));
    });
}

// Development builds embed a source map, so DevTools shows and debugs the original .ts files.
// Production builds (pipeline, TST) have no source map.
module.exports = (_env, argv) => {
  const entries = findEntries();
  if (entries.length === 0) {
    throw new Error("No scripts found: expected src/<table>/<table>.<form>.ts exporting onLoad, or <table>.ribbon.ts.");
  }
  return entries.map(({ table, form, entry }) => ({
    entry,
    output: {
      filename: `${PREFIX}${table}${form}.js`,
      path: path.resolve(__dirname, "dist"),
      library: { name: [NAMESPACE, table, form], type: "window" },
    },
    devtool: argv.mode === "development" ? "inline-source-map" : false,
    resolve: { extensions: [".ts", ".js"] },
    module: {
      rules: [{ test: /\.ts$/, use: "ts-loader", exclude: /node_modules/ }],
    },
  }));
};
