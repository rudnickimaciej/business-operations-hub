using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using Microsoft.Xrm.Sdk;
using RentMaszyny.Dataverse.Model;

namespace RentMaszyny.Dataverse.Common.Notifications;

/// <summary>
/// Builds in-app notifications (<see cref="appnotification"/>) for model-driven apps.
/// Pure: the caller saves the row with its own service, so the same code serves plug-ins (IOrganizationService)
/// and functions (IOrganizationServiceAsync2). The app must have in-app notifications switched on.
/// </summary>
/// <example>
/// <code>
/// var notification = AppNotificationBuilder.To(ownerId)
///     .WithTitle("Faktura FV-01007 jest gotowa")
///     .AsSuccess()
///     .WithOpenRecordAction("Otwórz fakturę", cr679_invoice.EntityLogicalName, invoiceId)
///     .Build();
/// await service.CreateAsync(notification, cancellationToken);
/// </code>
/// </example>
public sealed class AppNotificationBuilder
{
    /// <summary>Notifications go to users only; a team or another owner type cannot receive them.</summary>
    public const string RecipientEntityName = "systemuser";

    private const int MaxTitleLength = 200;
    private const int MaxBodyLength = 2000;

    private readonly Guid recipientId;
    private readonly List<NotificationAction> actions = [];
    private string? title;
    private string? body;
    private notification_iconid icon = notification_iconid.Info;
    private notification_toasttype toast = notification_toasttype.Timed;
    private notification_priority priority = notification_priority.Normal;
    private TimeSpan? timeToLive;

    private AppNotificationBuilder(Guid recipientId) => this.recipientId = recipientId;

    /// <summary>Starts a notification for one user.</summary>
    public static AppNotificationBuilder To(Guid userId) =>
        userId == Guid.Empty ? throw new ArgumentException("The recipient is required.", nameof(userId)) : new AppNotificationBuilder(userId);

    /// <summary>True when the owner can receive notifications (a user, not a team).</summary>
    public static bool CanNotify(EntityReference? owner) => owner?.LogicalName == RecipientEntityName && owner.Id != Guid.Empty;

    public AppNotificationBuilder WithTitle(string value)
    {
        title = value;
        return this;
    }

    public AppNotificationBuilder WithBody(string value)
    {
        body = value;
        return this;
    }

    public AppNotificationBuilder WithIcon(notification_iconid value)
    {
        icon = value;
        return this;
    }

    public AppNotificationBuilder AsSuccess() => WithIcon(notification_iconid.Success);

    public AppNotificationBuilder AsFailure() => WithIcon(notification_iconid.Failure);

    /// <summary>Kept in the notification centre only; no pop-up toast.</summary>
    public AppNotificationBuilder Silently()
    {
        toast = notification_toasttype.Hidden;
        return this;
    }

    public AppNotificationBuilder WithHighPriority()
    {
        priority = notification_priority.High;
        return this;
    }

    /// <summary>Deletes the notification after this time. The platform default is 14 days.</summary>
    public AppNotificationBuilder ExpiresAfter(TimeSpan value)
    {
        timeToLive = value > TimeSpan.Zero ? value : throw new ArgumentOutOfRangeException(nameof(value), "Must be positive.");
        return this;
    }

    /// <summary>Adds a button that opens a record. The URL is relative, so it works in every environment.</summary>
    public AppNotificationBuilder WithOpenRecordAction(
        string label, string entityName, Guid recordId, NavigationTarget target = NavigationTarget.Inline)
    {
        var url = $"?pagetype=entityrecord&etn={Uri.EscapeDataString(entityName)}&id={recordId:D}";
        actions.Add(new NotificationAction(label, url, target));
        return this;
    }

    public appnotification Build()
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            throw new InvalidOperationException("An app notification needs a title.");
        }

        return new appnotification
        {
            OwnerId = new EntityReference(RecipientEntityName, recipientId),
            Title = Truncate(title!, MaxTitleLength),
            Body = body is null ? null : Truncate(body, MaxBodyLength),
            IconType = icon,
            ToastType = toast,
            Priority = priority,
            TTLInSeconds = timeToLive is { } ttl ? (int?)Math.Min(ttl.TotalSeconds, int.MaxValue) : null,
            Data = actions.Count == 0 ? null : ActionsJson(),
        };
    }

    // {"actions":[{"title":"…","data":{"url":"…","navigationTarget":"inline"}}]}, written by hand:
    // plug-ins run in a sandbox where extra serializer packages are a burden.
    private string ActionsJson() =>
        "{\"actions\":[" + string.Join(",", actions.Select(action =>
            "{\"title\":" + Json(action.Label) +
            ",\"data\":{\"url\":" + Json(action.Url) +
            ",\"navigationTarget\":" + Json(TargetName(action.Target)) + "}}")) + "]}";

    private static string TargetName(NavigationTarget target) => target switch
    {
        NavigationTarget.Dialog => "dialog",
        NavigationTarget.NewWindow => "newWindow",
        _ => "inline",
    };

    private static string Json(string value)
    {
        var json = new StringBuilder("\"", value.Length + 2);
        foreach (var c in value)
        {
            switch (c)
            {
                case '"': json.Append("\\\""); break;
                case '\\': json.Append("\\\\"); break;
                case '\n': json.Append("\\n"); break;
                case '\r': json.Append("\\r"); break;
                case '\t': json.Append("\\t"); break;
                default:
                    if (c < ' ')
                    {
                        json.Append("\\u").Append(((int)c).ToString("x4", CultureInfo.InvariantCulture));
                    }
                    else
                    {
                        json.Append(c);
                    }
                    break;
            }
        }
        return json.Append('"').ToString();
    }

    private static string Truncate(string value, int maxLength) => value.Length <= maxLength ? value : value.Substring(0, maxLength);

    // A class, not a record: records need IsExternalInit, which net462 does not have.
    private sealed class NotificationAction(string label, string url, NavigationTarget target)
    {
        public string Label { get; } = label;
        public string Url { get; } = url;
        public NavigationTarget Target { get; } = target;
    }
}
