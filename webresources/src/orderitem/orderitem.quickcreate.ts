/**
 * Quick create form of Order Item (cr679_orderitem).
 *
 * Blocks saving when the selected machine is already allocated to another active order in an
 * overlapping period.
 *
 * Form registration: library cr679_orderitemquickcreate,
 *   OnLoad -> RentMaszyny.orderitem.quickcreate.onLoad (pass execution context: yes)
 *
 * This is a UX check, not a guarantee: records created outside this form (import, API, flows)
 * and two users saving at the same moment are not covered.
 */

import { OrderItem } from "../shared/schema";
import { getLookupId } from "../shared/xrm";
import { checkMachineAvailability } from "./machineAvailability";

const NOTIFICATION_ID = "cr679_orderitem_availability";

// Save modes from Xrm SaveEventArgs.getSaveMode()
const SAVE_MODE_SAVE_AND_CLOSE = 2;
const SAVE_MODE_SAVE_AND_NEW = 59;

// Set right before the script re-triggers save after a successful check, so the second save is not validated again.
let skipNextCheck = false;

export function onLoad(executionContext: Xrm.Events.EventContext): void {
  executionContext.getFormContext().data.entity.addOnSave(onSave);
}

export function onSave(executionContext: Xrm.Events.SaveEventContext): void {
  if (skipNextCheck) {
    skipNextCheck = false;
    return;
  }

  const formContext = executionContext.getFormContext();
  const machineId = getLookupId(formContext, OrderItem.fields.machine);
  const orderId = getLookupId(formContext, OrderItem.fields.order);
  if (!machineId || !orderId) {
    return; // nothing to validate, let the platform save (and enforce required fields)
  }

  // The check is asynchronous: stop this save and save again once the check has passed.
  const eventArgs = executionContext.getEventArgs();
  const saveMode = eventArgs.getSaveMode();
  eventArgs.preventDefault();
  formContext.ui.clearFormNotification(NOTIFICATION_ID);

  checkMachineAvailability(Xrm.WebApi, machineId, orderId)
    .then((result) => {
      if (result.status === "available") {
        saveAgain(formContext, saveMode);
        return;
      }
      const message = result.sameOrder
        ? "Ta maszyna jest już przypisana do tego zamówienia w tym terminie."
        : "Ta maszyna jest już przypisana do innego zamówienia w tym terminie.";
      formContext.ui.setFormNotification(message, "ERROR", NOTIFICATION_ID);
    })
    .catch((error: unknown) => {
      // Fail open: an unavailable Web API must not stop users from working.
      // The user is told the check did not run; technical details go to the console.
      console.error("[RentMaszyny.orderitem.quickcreate] Availability check failed", error);
      formContext.ui.setFormNotification(
        "Nie udało się sprawdzić dostępności maszyny. Rekord zapisano bez tej weryfikacji.",
        "WARNING",
        NOTIFICATION_ID
      );
      saveAgain(formContext, saveMode);
    });
}

function saveAgain(formContext: Xrm.FormContext, saveMode: number): void {
  skipNextCheck = true;
  if (saveMode === SAVE_MODE_SAVE_AND_CLOSE) {
    formContext.data.entity.save("saveandclose");
  } else if (saveMode === SAVE_MODE_SAVE_AND_NEW) {
    formContext.data.entity.save("saveandnew");
  } else {
    formContext.data.entity.save();
  }
}
