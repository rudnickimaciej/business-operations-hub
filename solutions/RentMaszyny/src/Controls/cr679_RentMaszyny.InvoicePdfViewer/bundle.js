/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
var pcf_tools_652ac3f36e1e4bca82eb3c1dc44e6fad;
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./InvoicePdfViewer/components/PdfViewer.tsx"
/*!***************************************************!*\
  !*** ./InvoicePdfViewer/components/PdfViewer.tsx ***!
  \***************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

eval("{__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   PdfViewer: () => (/* binding */ PdfViewer)\n/* harmony export */ });\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _fluentui_react_components__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @fluentui/react-components */ \"@fluentui/react-components\");\n/* harmony import */ var _fluentui_react_components__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_fluentui_react_components__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _hooks_useEntitySetName__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../hooks/useEntitySetName */ \"./InvoicePdfViewer/hooks/useEntitySetName.ts\");\n/* harmony import */ var _hooks_usePdfDocument__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../hooks/usePdfDocument */ \"./InvoicePdfViewer/hooks/usePdfDocument.ts\");\nfunction _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }\nfunction _nonIterableRest() { throw new TypeError(\"Invalid attempt to destructure non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.\"); }\nfunction _unsupportedIterableToArray(r, a) { if (r) { if (\"string\" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return \"Object\" === t && r.constructor && (t = r.constructor.name), \"Map\" === t || \"Set\" === t ? Array.from(r) : \"Arguments\" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }\nfunction _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }\nfunction _iterableToArrayLimit(r, l) { var t = null == r ? null : \"undefined\" != typeof Symbol && r[Symbol.iterator] || r[\"@@iterator\"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }\nfunction _arrayWithHoles(r) { if (Array.isArray(r)) return r; }\n;\n\n\n\nvar useStyles = (0,_fluentui_react_components__WEBPACK_IMPORTED_MODULE_1__.makeStyles)({\n  root: {\n    display: \"flex\",\n    flexDirection: \"column\",\n    width: \"100%\",\n    border: \"\".concat(_fluentui_react_components__WEBPACK_IMPORTED_MODULE_1__.tokens.strokeWidthThin, \" solid \").concat(_fluentui_react_components__WEBPACK_IMPORTED_MODULE_1__.tokens.colorNeutralStroke2),\n    borderRadius: _fluentui_react_components__WEBPACK_IMPORTED_MODULE_1__.tokens.borderRadiusMedium,\n    backgroundColor: _fluentui_react_components__WEBPACK_IMPORTED_MODULE_1__.tokens.colorNeutralBackground1,\n    overflow: \"hidden\"\n  },\n  toolbar: {\n    display: \"flex\",\n    alignItems: \"center\",\n    gap: _fluentui_react_components__WEBPACK_IMPORTED_MODULE_1__.tokens.spacingHorizontalS,\n    padding: \"\".concat(_fluentui_react_components__WEBPACK_IMPORTED_MODULE_1__.tokens.spacingVerticalS, \" \").concat(_fluentui_react_components__WEBPACK_IMPORTED_MODULE_1__.tokens.spacingHorizontalM),\n    borderBottom: \"\".concat(_fluentui_react_components__WEBPACK_IMPORTED_MODULE_1__.tokens.strokeWidthThin, \" solid \").concat(_fluentui_react_components__WEBPACK_IMPORTED_MODULE_1__.tokens.colorNeutralStroke2),\n    backgroundColor: _fluentui_react_components__WEBPACK_IMPORTED_MODULE_1__.tokens.colorNeutralBackground2\n  },\n  fileName: {\n    flexGrow: 1,\n    minWidth: 0,\n    overflow: \"hidden\",\n    textOverflow: \"ellipsis\",\n    whiteSpace: \"nowrap\"\n  },\n  badge: {\n    flexShrink: 0,\n    padding: \"0 \".concat(_fluentui_react_components__WEBPACK_IMPORTED_MODULE_1__.tokens.spacingHorizontalXS),\n    borderRadius: _fluentui_react_components__WEBPACK_IMPORTED_MODULE_1__.tokens.borderRadiusSmall,\n    backgroundColor: _fluentui_react_components__WEBPACK_IMPORTED_MODULE_1__.tokens.colorPaletteRedBackground3,\n    color: _fluentui_react_components__WEBPACK_IMPORTED_MODULE_1__.tokens.colorNeutralForegroundOnBrand,\n    fontSize: _fluentui_react_components__WEBPACK_IMPORTED_MODULE_1__.tokens.fontSizeBase100,\n    fontWeight: _fluentui_react_components__WEBPACK_IMPORTED_MODULE_1__.tokens.fontWeightBold,\n    lineHeight: _fluentui_react_components__WEBPACK_IMPORTED_MODULE_1__.tokens.lineHeightBase200\n  },\n  frame: {\n    width: \"100%\",\n    border: \"none\",\n    display: \"block\"\n  },\n  placeholder: {\n    display: \"flex\",\n    alignItems: \"center\",\n    justifyContent: \"center\",\n    padding: _fluentui_react_components__WEBPACK_IMPORTED_MODULE_1__.tokens.spacingVerticalXXL\n  }\n});\nvar PdfViewer = _ref => {\n  var entityName = _ref.entityName,\n    recordId = _ref.recordId,\n    column = _ref.column,\n    reloadKey = _ref.reloadKey,\n    height = _ref.height,\n    texts = _ref.texts,\n    resolveEntitySetName = _ref.resolveEntitySetName;\n  var styles = useStyles();\n  var entitySetName = (0,_hooks_useEntitySetName__WEBPACK_IMPORTED_MODULE_2__.useEntitySetName)(entityName, resolveEntitySetName);\n  var file = react__WEBPACK_IMPORTED_MODULE_0__.useMemo(() => entitySetName && recordId ? {\n    entitySetName,\n    recordId,\n    column\n  } : null, [entitySetName, recordId, column]);\n  var _usePdfDocument = (0,_hooks_usePdfDocument__WEBPACK_IMPORTED_MODULE_3__.usePdfDocument)(file, reloadKey),\n    _usePdfDocument2 = _slicedToArray(_usePdfDocument, 2),\n    pdf = _usePdfDocument2[0],\n    retry = _usePdfDocument2[1];\n  if (!recordId) {\n    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(Notice, {\n      intent: \"info\",\n      text: texts.unsaved\n    });\n  }\n  if (!entitySetName || pdf.status === \"loading\") {\n    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(\"div\", {\n      className: styles.placeholder\n    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_fluentui_react_components__WEBPACK_IMPORTED_MODULE_1__.Spinner, {\n      size: \"small\",\n      label: texts.loading\n    }));\n  }\n  if (pdf.status === \"empty\") {\n    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(Notice, {\n      intent: \"info\",\n      text: texts.empty\n    });\n  }\n  if (pdf.status === \"error\") {\n    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(Notice, {\n      intent: \"error\",\n      text: texts.error,\n      action: /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_fluentui_react_components__WEBPACK_IMPORTED_MODULE_1__.Button, {\n        appearance: \"transparent\",\n        size: \"small\",\n        onClick: retry\n      }, texts.retry)\n    });\n  }\n  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(\"div\", {\n    className: styles.root\n  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(\"div\", {\n    className: styles.toolbar\n  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(\"span\", {\n    className: styles.badge,\n    \"aria-hidden\": true\n  }, \"PDF\"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_fluentui_react_components__WEBPACK_IMPORTED_MODULE_1__.Text, {\n    weight: \"semibold\",\n    className: styles.fileName,\n    title: pdf.fileName\n  }, pdf.fileName), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_fluentui_react_components__WEBPACK_IMPORTED_MODULE_1__.Button, {\n    appearance: \"subtle\",\n    size: \"small\",\n    as: \"a\",\n    href: pdf.url,\n    target: \"_blank\",\n    rel: \"noopener noreferrer\"\n  }, texts.openInNewTab), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_fluentui_react_components__WEBPACK_IMPORTED_MODULE_1__.Button, {\n    appearance: \"subtle\",\n    size: \"small\",\n    as: \"a\",\n    href: pdf.url,\n    download: pdf.fileName\n  }, texts.download)), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(\"iframe\", {\n    className: styles.frame,\n    style: {\n      height\n    },\n    src: pdf.url,\n    title: pdf.fileName\n  }));\n};\nvar Notice = _ref2 => {\n  var intent = _ref2.intent,\n    text = _ref2.text,\n    action = _ref2.action;\n  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_fluentui_react_components__WEBPACK_IMPORTED_MODULE_1__.MessageBar, {\n    intent: intent\n  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_fluentui_react_components__WEBPACK_IMPORTED_MODULE_1__.MessageBarBody, null, text), action && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_fluentui_react_components__WEBPACK_IMPORTED_MODULE_1__.MessageBarActions, null, action));\n};\n\n//# sourceURL=webpack://pcf_tools_652ac3f36e1e4bca82eb3c1dc44e6fad/./InvoicePdfViewer/components/PdfViewer.tsx?\n}");

/***/ },

/***/ "./InvoicePdfViewer/constants.ts"
/*!***************************************!*\
  !*** ./InvoicePdfViewer/constants.ts ***!
  \***************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

eval("{__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   DEFAULT_FILE_NAME: () => (/* binding */ DEFAULT_FILE_NAME),\n/* harmony export */   DEFAULT_HEIGHT: () => (/* binding */ DEFAULT_HEIGHT),\n/* harmony export */   FILE_NAME_HEADER: () => (/* binding */ FILE_NAME_HEADER),\n/* harmony export */   MIN_HEIGHT: () => (/* binding */ MIN_HEIGHT),\n/* harmony export */   PDF_MIME_TYPE: () => (/* binding */ PDF_MIME_TYPE),\n/* harmony export */   Strings: () => (/* binding */ Strings),\n/* harmony export */   WEB_API_PATH: () => (/* binding */ WEB_API_PATH)\n/* harmony export */ });\nvar WEB_API_PATH = \"/api/data/v9.2\";\nvar PDF_MIME_TYPE = \"application/pdf\";\n/** Dataverse returns the stored file name in this header when a file column is downloaded. */\nvar FILE_NAME_HEADER = \"x-ms-file-name\";\n/** Fallback when the record or the header has no file name. */\nvar DEFAULT_FILE_NAME = \"document.pdf\";\nvar MIN_HEIGHT = 300;\nvar DEFAULT_HEIGHT = 900;\n/** Keys of the strings/*.resx files. */\nvar Strings = {\n  loading: \"Status_Loading\",\n  empty: \"Status_Empty\",\n  unsaved: \"Status_Unsaved\",\n  error: \"Status_Error\",\n  retry: \"Action_Retry\",\n  openInNewTab: \"Action_OpenInNewTab\",\n  download: \"Action_Download\"\n};\n\n//# sourceURL=webpack://pcf_tools_652ac3f36e1e4bca82eb3c1dc44e6fad/./InvoicePdfViewer/constants.ts?\n}");

/***/ },

/***/ "./InvoicePdfViewer/hooks/useEntitySetName.ts"
/*!****************************************************!*\
  !*** ./InvoicePdfViewer/hooks/useEntitySetName.ts ***!
  \****************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

eval("{__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   useEntitySetName: () => (/* binding */ useEntitySetName)\n/* harmony export */ });\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);\nfunction _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }\nfunction _nonIterableRest() { throw new TypeError(\"Invalid attempt to destructure non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.\"); }\nfunction _unsupportedIterableToArray(r, a) { if (r) { if (\"string\" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return \"Object\" === t && r.constructor && (t = r.constructor.name), \"Map\" === t || \"Set\" === t ? Array.from(r) : \"Arguments\" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }\nfunction _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }\nfunction _iterableToArrayLimit(r, l) { var t = null == r ? null : \"undefined\" != typeof Symbol && r[Symbol.iterator] || r[\"@@iterator\"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }\nfunction _arrayWithHoles(r) { if (Array.isArray(r)) return r; }\n;\n/** Web API collection name of a table (e.g. cr679_invoice -> cr679_invoices), read from metadata once per table. */\nfunction useEntitySetName(entityName, resolve) {\n  var _React$useState = react__WEBPACK_IMPORTED_MODULE_0__.useState(),\n    _React$useState2 = _slicedToArray(_React$useState, 2),\n    entitySetName = _React$useState2[0],\n    setEntitySetName = _React$useState2[1];\n  react__WEBPACK_IMPORTED_MODULE_0__.useEffect(() => {\n    if (!entityName) {\n      return;\n    }\n    var active = true;\n    resolve(entityName).then(name => active && setEntitySetName(name)).catch(error => console.error(\"[RentMaszyny.InvoicePdfViewer] Reading table metadata failed\", error));\n    return () => {\n      active = false;\n    };\n  }, [entityName, resolve]);\n  return entitySetName;\n}\n\n//# sourceURL=webpack://pcf_tools_652ac3f36e1e4bca82eb3c1dc44e6fad/./InvoicePdfViewer/hooks/useEntitySetName.ts?\n}");

/***/ },

/***/ "./InvoicePdfViewer/hooks/usePdfDocument.ts"
/*!**************************************************!*\
  !*** ./InvoicePdfViewer/hooks/usePdfDocument.ts ***!
  \**************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

eval("{__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   usePdfDocument: () => (/* binding */ usePdfDocument)\n/* harmony export */ });\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _services_fileService__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../services/fileService */ \"./InvoicePdfViewer/services/fileService.ts\");\nfunction _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }\nfunction _nonIterableRest() { throw new TypeError(\"Invalid attempt to destructure non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.\"); }\nfunction _unsupportedIterableToArray(r, a) { if (r) { if (\"string\" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return \"Object\" === t && r.constructor && (t = r.constructor.name), \"Map\" === t || \"Set\" === t ? Array.from(r) : \"Arguments\" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }\nfunction _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }\nfunction _iterableToArrayLimit(r, l) { var t = null == r ? null : \"undefined\" != typeof Symbol && r[Symbol.iterator] || r[\"@@iterator\"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }\nfunction _arrayWithHoles(r) { if (Array.isArray(r)) return r; }\nvar __awaiter = undefined && undefined.__awaiter || function (thisArg, _arguments, P, generator) {\n  function adopt(value) {\n    return value instanceof P ? value : new P(function (resolve) {\n      resolve(value);\n    });\n  }\n  return new (P || (P = Promise))(function (resolve, reject) {\n    function fulfilled(value) {\n      try {\n        step(generator.next(value));\n      } catch (e) {\n        reject(e);\n      }\n    }\n    function rejected(value) {\n      try {\n        step(generator[\"throw\"](value));\n      } catch (e) {\n        reject(e);\n      }\n    }\n    function step(result) {\n      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);\n    }\n    step((generator = generator.apply(thisArg, _arguments || [])).next());\n  });\n};\n\n\nvar LOADING = {\n  status: \"loading\"\n};\n/**\n * Loads the PDF of a file column into an object URL for the viewer.\n * Reloads when the file reference or `reloadKey` changes; aborts stale requests and frees the URL on cleanup.\n */\nfunction usePdfDocument(file, reloadKey) {\n  var _React$useState = react__WEBPACK_IMPORTED_MODULE_0__.useState(LOADING),\n    _React$useState2 = _slicedToArray(_React$useState, 2),\n    state = _React$useState2[0],\n    setState = _React$useState2[1];\n  var _React$useState3 = react__WEBPACK_IMPORTED_MODULE_0__.useState(0),\n    _React$useState4 = _slicedToArray(_React$useState3, 2),\n    attempt = _React$useState4[0],\n    setAttempt = _React$useState4[1];\n  var retry = react__WEBPACK_IMPORTED_MODULE_0__.useCallback(() => setAttempt(value => value + 1), []);\n  var entitySetName = file === null || file === void 0 ? void 0 : file.entitySetName;\n  var recordId = file === null || file === void 0 ? void 0 : file.recordId;\n  var column = file === null || file === void 0 ? void 0 : file.column;\n  react__WEBPACK_IMPORTED_MODULE_0__.useEffect(() => {\n    if (!entitySetName || !recordId || !column) {\n      setState({\n        status: \"empty\"\n      });\n      return;\n    }\n    var controller = new AbortController();\n    var url;\n    setState(LOADING);\n    var load = () => __awaiter(this, void 0, void 0, function* () {\n      try {\n        var pdf = yield (0,_services_fileService__WEBPACK_IMPORTED_MODULE_1__.downloadPdf)({\n          entitySetName,\n          recordId,\n          column\n        }, controller.signal);\n        if (!pdf) {\n          setState({\n            status: \"empty\"\n          });\n          return;\n        }\n        url = URL.createObjectURL(pdf.blob);\n        setState({\n          status: \"ready\",\n          url,\n          fileName: pdf.fileName\n        });\n      } catch (error) {\n        if (!controller.signal.aborted) {\n          console.error(\"[RentMaszyny.InvoicePdfViewer] Loading the PDF failed\", error);\n          setState({\n            status: \"error\"\n          });\n        }\n      }\n    });\n    void load();\n    return () => {\n      controller.abort();\n      if (url) {\n        URL.revokeObjectURL(url);\n      }\n    };\n  }, [entitySetName, recordId, column, reloadKey, attempt]);\n  return [state, retry];\n}\n\n//# sourceURL=webpack://pcf_tools_652ac3f36e1e4bca82eb3c1dc44e6fad/./InvoicePdfViewer/hooks/usePdfDocument.ts?\n}");

/***/ },

/***/ "./InvoicePdfViewer/index.ts"
/*!***********************************!*\
  !*** ./InvoicePdfViewer/index.ts ***!
  \***********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

eval("{__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   InvoicePdfViewer: () => (/* binding */ InvoicePdfViewer)\n/* harmony export */ });\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _fluentui_react_components__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @fluentui/react-components */ \"@fluentui/react-components\");\n/* harmony import */ var _fluentui_react_components__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_fluentui_react_components__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _components_PdfViewer__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./components/PdfViewer */ \"./InvoicePdfViewer/components/PdfViewer.tsx\");\n/* harmony import */ var _constants__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./constants */ \"./InvoicePdfViewer/constants.ts\");\nvar __awaiter = undefined && undefined.__awaiter || function (thisArg, _arguments, P, generator) {\n  function adopt(value) {\n    return value instanceof P ? value : new P(function (resolve) {\n      resolve(value);\n    });\n  }\n  return new (P || (P = Promise))(function (resolve, reject) {\n    function fulfilled(value) {\n      try {\n        step(generator.next(value));\n      } catch (e) {\n        reject(e);\n      }\n    }\n    function rejected(value) {\n      try {\n        step(generator[\"throw\"](value));\n      } catch (e) {\n        reject(e);\n      }\n    }\n    function step(result) {\n      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);\n    }\n    step((generator = generator.apply(thisArg, _arguments || [])).next());\n  });\n};\n\n\n\n\n/**\n * Shows the PDF stored in a file column of the current record (the invoice document).\n * Bound to the document status, so it reloads when the generator finishes.\n */\nclass InvoicePdfViewer {\n  init(context) {\n    // Created once, so hooks that depend on it do not rerun on every render.\n    this.resolveEntitySetName = entityName => __awaiter(this, void 0, void 0, function* () {\n      return (yield context.utils.getEntityMetadata(entityName)).EntitySetName;\n    });\n    this.texts = Object.fromEntries(Object.keys(_constants__WEBPACK_IMPORTED_MODULE_3__.Strings).map(key => [key, context.resources.getString(_constants__WEBPACK_IMPORTED_MODULE_3__.Strings[key])]));\n  }\n  updateView(context) {\n    var _a, _b, _c, _d, _e;\n    var _ref = (_a = context.mode.contextInfo) !== null && _a !== void 0 ? _a : {},\n      entityId = _ref.entityId,\n      entityTypeName = _ref.entityTypeName;\n    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_fluentui_react_components__WEBPACK_IMPORTED_MODULE_1__.FluentProvider, {\n      theme: (_c = (_b = context.fluentDesignLanguage) === null || _b === void 0 ? void 0 : _b.tokenTheme) !== null && _c !== void 0 ? _c : _fluentui_react_components__WEBPACK_IMPORTED_MODULE_1__.webLightTheme\n    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_components_PdfViewer__WEBPACK_IMPORTED_MODULE_2__.PdfViewer, {\n      entityName: entityTypeName,\n      recordId: entityId === \"\" ? undefined : entityId,\n      // a new record has an empty id\n      column: (_d = context.parameters.fileColumn.raw) !== null && _d !== void 0 ? _d : \"\",\n      reloadKey: context.parameters.reloadOn.raw,\n      height: Math.max((_e = context.parameters.height.raw) !== null && _e !== void 0 ? _e : _constants__WEBPACK_IMPORTED_MODULE_3__.DEFAULT_HEIGHT, _constants__WEBPACK_IMPORTED_MODULE_3__.MIN_HEIGHT),\n      texts: this.texts,\n      resolveEntitySetName: this.resolveEntitySetName\n    }));\n  }\n  getOutputs() {\n    return {};\n  }\n  destroy() {\n    // Requests and object URLs are released by the React hooks when the tree unmounts.\n  }\n}\n\n//# sourceURL=webpack://pcf_tools_652ac3f36e1e4bca82eb3c1dc44e6fad/./InvoicePdfViewer/index.ts?\n}");

/***/ },

/***/ "./InvoicePdfViewer/services/fileService.ts"
/*!**************************************************!*\
  !*** ./InvoicePdfViewer/services/fileService.ts ***!
  \**************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

eval("{__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   FileRequestError: () => (/* binding */ FileRequestError),\n/* harmony export */   downloadPdf: () => (/* binding */ downloadPdf),\n/* harmony export */   fileUrl: () => (/* binding */ fileUrl)\n/* harmony export */ });\n/* harmony import */ var _constants__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../constants */ \"./InvoicePdfViewer/constants.ts\");\nvar __awaiter = undefined && undefined.__awaiter || function (thisArg, _arguments, P, generator) {\n  function adopt(value) {\n    return value instanceof P ? value : new P(function (resolve) {\n      resolve(value);\n    });\n  }\n  return new (P || (P = Promise))(function (resolve, reject) {\n    function fulfilled(value) {\n      try {\n        step(generator.next(value));\n      } catch (e) {\n        reject(e);\n      }\n    }\n    function rejected(value) {\n      try {\n        step(generator[\"throw\"](value));\n      } catch (e) {\n        reject(e);\n      }\n    }\n    function step(result) {\n      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);\n    }\n    step((generator = generator.apply(thisArg, _arguments || [])).next());\n  });\n};\n\n/** Any response other than the file or \"no file\" (e.g. 401, 403, 500). */\nclass FileRequestError extends Error {\n  constructor(status) {\n    super(\"File download failed with HTTP \".concat(status));\n    this.status = status;\n    this.name = \"FileRequestError\";\n  }\n}\nfunction fileUrl(_ref) {\n  var entitySetName = _ref.entitySetName,\n    recordId = _ref.recordId,\n    column = _ref.column;\n  var id = recordId.replace(/[{}]/g, \"\");\n  return \"\".concat(_constants__WEBPACK_IMPORTED_MODULE_0__.WEB_API_PATH, \"/\").concat(entitySetName, \"(\").concat(id, \")/\").concat(column, \"/$value\");\n}\n/**\n * Downloads a file column as a PDF blob; null when the column is empty.\n * The request is relative to the app's origin and uses the user's session, so Dataverse security applies.\n */\nfunction downloadPdf(file_1, signal_1) {\n  return __awaiter(this, arguments, void 0, function (file, signal) {\n    var fetchImpl = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : fetch;\n    return function* () {\n      var _a;\n      var response = yield fetchImpl(fileUrl(file), {\n        signal,\n        credentials: \"same-origin\"\n      });\n      // An empty file column answers 404 (or 204 on some API versions).\n      if (response.status === 404 || response.status === 204) {\n        return null;\n      }\n      if (!response.ok) {\n        throw new FileRequestError(response.status);\n      }\n      // The type is forced to PDF so the browser renders it instead of offering a download.\n      var blob = new Blob([yield response.arrayBuffer()], {\n        type: _constants__WEBPACK_IMPORTED_MODULE_0__.PDF_MIME_TYPE\n      });\n      var fileName = decodeURIComponent((_a = response.headers.get(_constants__WEBPACK_IMPORTED_MODULE_0__.FILE_NAME_HEADER)) !== null && _a !== void 0 ? _a : \"\") || _constants__WEBPACK_IMPORTED_MODULE_0__.DEFAULT_FILE_NAME;\n      return {\n        blob,\n        fileName\n      };\n    }();\n  });\n}\n\n//# sourceURL=webpack://pcf_tools_652ac3f36e1e4bca82eb3c1dc44e6fad/./InvoicePdfViewer/services/fileService.ts?\n}");

/***/ },

/***/ "@fluentui/react-components"
/*!************************************!*\
  !*** external "FluentUIReactv940" ***!
  \************************************/
(module) {

module.exports = FluentUIReactv940;

/***/ },

/***/ "react"
/*!***************************!*\
  !*** external "Reactv16" ***!
  \***************************/
(module) {

module.exports = Reactv16;

/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	const __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		const cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		const module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		if (!(moduleId in __webpack_modules__)) {
/******/ 			delete __webpack_module_cache__[moduleId];
/******/ 			const e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = (module) => {
/******/ 		const getter = module && module.__esModule ?
/******/ 			() => (module['default']) :
/******/ 			() => (module);
/******/ 		__webpack_require__.d(getter, { a: getter });
/******/ 		return getter;
/******/ 	};
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	// define getter/value functions for harmony exports
/******/ 	__webpack_require__.d = (exports, definition) => {
/******/ 		for(var key in definition) {
/******/ 			if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 				Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 			}
/******/ 		}
/******/ 	};
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop));
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = (exports) => {
/******/ 		Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	let __webpack_exports__ = __webpack_require__("./InvoicePdfViewer/index.ts");
/******/ 	pcf_tools_652ac3f36e1e4bca82eb3c1dc44e6fad = __webpack_exports__;
/******/ 	
/******/ })()
;
if (window.ComponentFramework && window.ComponentFramework.registerControl) {
	ComponentFramework.registerControl('RentMaszyny.InvoicePdfViewer', pcf_tools_652ac3f36e1e4bca82eb3c1dc44e6fad.InvoicePdfViewer);
} else {
	var RentMaszyny = RentMaszyny || {};
	RentMaszyny.InvoicePdfViewer = pcf_tools_652ac3f36e1e4bca82eb3c1dc44e6fad.InvoicePdfViewer;
	pcf_tools_652ac3f36e1e4bca82eb3c1dc44e6fad = undefined;
}