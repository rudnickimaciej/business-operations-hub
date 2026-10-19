#if NET
using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.PowerPlatform.Dataverse.Client;
using RentMaszyny.Dataverse.Model;

namespace RentMaszyny.Dataverse.Common.Notifications;

/// <summary>Creates notifications with the async Dataverse client (.NET 8 only, e.g. Azure Functions).</summary>
public sealed class AsyncAppNotificationSender(IOrganizationServiceAsync2 service) : IAsyncAppNotificationSender
{
    public Task<Guid> SendAsync(appnotification notification, CancellationToken cancellationToken = default) =>
        service.CreateAsync(AppNotificationRules.EnsureSendable(notification), cancellationToken);
}
#endif
