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
 * Other files in a table folder (e.g. machineAvailability.ts) and everything in src/shared/ are modules
 * imported by entries, not bundles of their own.
 * The pipeline copies each bundle over solutions/RentMaszyny/src/WebResources/<name>; the web resource must
 * already exist in the solution (create it once in DEV, then sync), otherwise the build fails.
 */
const PREFIX = "cr679_";
const NAMESPACE = "RentMaszyny";
const srcDir = path.resolve(__dirname, "src");

function findEntries() {
  return fs
    .readdirSync(srcDir, { withFileTypes: true })
    .filter((dir) => dir.isDirectory() && dir.name !== "shared")
    .flatMap((dir) => {
      const pattern = new RegExp(`^${dir.name}\\.([a-z0-9]+)\\.ts$`);
      return fs
        .readdirSync(path.join(srcDir, dir.name))
        .map((file) => file.match(pattern))
        .filter(Boolean)
        .map((match) => ({ table: dir.name, form: match[1], entry: `./src/${dir.name}/${match[0]}` }));
    });
}

// Development builds embed a source map, so DevTools shows and debugs the original .ts files.
// Production builds (pipeline, TST) have no source map.
module.exports = (_env, argv) => findEntries().map(({ table, form, entry }) => ({
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
