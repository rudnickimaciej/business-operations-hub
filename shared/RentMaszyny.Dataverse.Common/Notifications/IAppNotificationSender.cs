using System;
using RentMaszyny.Dataverse.Model;

namespace RentMaszyny.Dataverse.Common.Notifications;

/// <summary>Sends in-app notifications synchronously, as plug-ins must (they run on IOrganizationService).</summary>
public interface IAppNotificationSender
{
    /// <summary>Creates the notification and returns its id.</summary>
    Guid Send(appnotification notification);
}
