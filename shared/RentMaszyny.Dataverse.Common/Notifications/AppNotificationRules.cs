using System;
using RentMaszyny.Dataverse.Model;

namespace RentMaszyny.Dataverse.Common.Notifications;

/// <summary>Checks shared by the senders.</summary>
internal static class AppNotificationRules
{
    /// <summary>Fails early with a clear message instead of a Dataverse error about the owner.</summary>
    public static appnotification EnsureSendable(appnotification notification)
    {
        if (notification is null)
        {
            throw new ArgumentNullException(nameof(notification));
        }
        if (!AppNotificationBuilder.CanNotify(notification.OwnerId))
        {
            throw new ArgumentException("An app notification must be owned by a user (systemuser).", nameof(notification));
        }
        return notification;
    }
}
