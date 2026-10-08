/**
 * Dataverse logical names used by the form scripts. The single place to update when the data model changes.
 *
 * Values are LOGICAL names (lowercase), as used by formContext.getAttribute(), FetchXML and $select.
 * In the Web API a lookup column is returned as `_<name>_value` (e.g. `_cr679_machineid_value`).
 *
 * Columns are listed only for tables that scripts actually use; add others when a script needs them.
 */

export const StateCode = {
  Active: 0,
  Inactive: 1,
} as const;

export const Order = {
  entity: "cr679_order",
  fields: {
    id: "cr679_orderid",
    name: "cr679_name",
    orderNumber: "cr679_ordernumber",
    customer: "cr679_customerid", // Customer column: account or contact
    status: "cr679_status",
    serviceType: "cr679_servicetype",
    location: "cr679_location",
    startDate: "cr679_startdate",
    endDate: "cr679_enddate",
    equipmentDate: "cr679_dateofequipment",
    equipmentReturnDate: "cr679_equipmentreturndate",
    invoiceDate: "cr679_invoicedate",
    paymentDate: "cr679_paymentdate",
    totalPrice: "cr679_totalprice",
    stateCode: "statecode",
    statusCode: "statuscode",
  },
} as const;

export const OrderItem = {
  entity: "cr679_orderitem",
  fields: {
    id: "cr679_orderitemid",
    name: "cr679_orderitem1",
    order: "cr679_orderid",
    machine: "cr679_machineid",
    operator: "cr679_operatorid",
    itemPrice: "cr679_itemprice",
    notes: "cr679_notes",
    stateCode: "statecode",
  },
} as const;

export const Account = { entity: "account" } as const;
export const Contact = { entity: "contact" } as const;
export const Machine = { entity: "cr679_machine" } as const;
export const Operator = { entity: "cr679_operator" } as const;
export const Service = { entity: "cr679_usuga" } as const;
export const Timesheet = { entity: "cr679_timesheet" } as const;
export const TimesheetLine = { entity: "cr679_timesheetline" } as const;
export const OrderProcess = { entity: "cr679_orderbpf" } as const;

export const Invoice = {
  entity: "cr679_invoice",
  fields: {
    id: "cr679_invoiceid",
    number: "cr679_autonumber",
    order: "cr679_orderid",
    customer: "cr679_customerid", // Customer column: account or contact
    customerName: "cr679_customername",
    customerNip: "cr679_customernip",
    customerAddress: "cr679_customeraddress",
    issueDate: "cr679_issuedate",
    dueDate: "cr679_duedate",
    netAmount: "cr679_netamount",
    vatRate: "cr679_vatrate",
    vatAmount: "cr679_vatamount",
    grossAmount: "cr679_grossamount",
    documentStatus: "cr679_documentstatus",
    requestedOn: "cr679_requestedon",
    generatedOn: "cr679_generatedon",
    document: "cr679_document",
    errorMessage: "cr679_errormessage",
  },
} as const;

export const Complaint = {
  entity: "cr679_complaint",
  fields: {
    id: "cr679_complaintid",
    number: "cr679_name",
    customer: "cr679_customerid", // Customer column: account or contact
    order: "cr679_orderid",
    description: "cr679_description",
    aiSummary: "cr679_aisummary", // prompt column, read-only
    aiNextSteps: "cr679_ainextsteps", // prompt column, read-only
    stateCode: "statecode",
    statusCode: "statuscode",
  },
} as const;

/** Values of cr679_complaint.statuscode. */
export const ComplaintStatus = {
  New: 1,
  InProgress: 630100000,
  WaitingForCustomer: 630100001,
  Closed: 2,
} as const;

/** Values of cr679_invoice.cr679_documentstatus. */
export const InvoiceDocumentStatus = {
  Requested: 630100000,
  Generating: 630100001,
  Generated: 630100002,
  Failed: 630100003,
} as const;
