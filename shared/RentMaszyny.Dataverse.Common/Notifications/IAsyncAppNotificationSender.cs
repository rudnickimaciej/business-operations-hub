using System;
using System.Threading;
using System.Threading.Tasks;
using RentMaszyny.Dataverse.Model;

namespace RentMaszyny.Dataverse.Common.Notifications;

/// <summary>Sends in-app notifications asynchronously, for services such as Azure Functions.</summary>
public interface IAsyncAppNotificationSender
{
    /// <summary>Creates the notification and returns its id.</summary>
    Task<Guid> SendAsync(appnotification notification, CancellationToken cancellationToken = default);
}
