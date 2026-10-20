using System;
using Microsoft.Xrm.Sdk;
using RentMaszyny.Dataverse.Model;

namespace RentMaszyny.Dataverse.Common.Notifications;

/// <summary>Creates notifications with the plug-in's organization service.</summary>
public sealed class AppNotificationSender(IOrganizationService service) : IAppNotificationSender
{
    public Guid Send(appnotification notification) => service.Create(AppNotificationRules.EnsureSendable(notification));
}
