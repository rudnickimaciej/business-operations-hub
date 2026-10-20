using System.Text.Json;
using Microsoft.Xrm.Sdk;
using RentMaszyny.Dataverse.Common.Notifications;
using RentMaszyny.Dataverse.Model;

namespace RentMaszyny.Dataverse.Common.Tests;

public class AppNotificationBuilderTests
{
    private static readonly Guid UserId = Guid.Parse("5630d081-56b0-f011-bbd2-000d3ab50637");
    private static readonly Guid InvoiceId = Guid.Parse("87411879-e6c6-f111-aaad-70a8a57f8bd2");

    [Fact]
    public void Builds_a_timed_info_notification_for_a_user_by_default()
    {
        var notification = AppNotificationBuilder.To(UserId).WithTitle("Hello").Build();

        Assert.Equal(new EntityReference("systemuser", UserId), notification.OwnerId);
        Assert.Equal("Hello", notification.Title);
        Assert.Null(notification.Body);
        Assert.Equal(notification_iconid.Info, notification.IconType);
        Assert.Equal(notification_toasttype.Timed, notification.ToastType);
        Assert.Equal(notification_priority.Normal, notification.Priority);
        Assert.Null(notification.TTLInSeconds);
        Assert.Null(notification.Data);
    }

    [Fact]
    public void Applies_icon_toast_priority_and_time_to_live()
    {
        var notification = AppNotificationBuilder.To(UserId)
            .WithTitle("Failed")
            .WithBody("Reason")
            .AsFailure()
            .Silently()
            .WithHighPriority()
            .ExpiresAfter(TimeSpan.FromDays(1))
            .Build();

        Assert.Equal("Reason", notification.Body);
        Assert.Equal(notification_iconid.Failure, notification.IconType);
        Assert.Equal(notification_toasttype.Hidden, notification.ToastType);
        Assert.Equal(notification_priority.High, notification.Priority);
        Assert.Equal(86400, notification.TTLInSeconds);
    }

    [Fact]
    public void Adds_actions_that_open_records_as_valid_json()
    {
        var notification = AppNotificationBuilder.To(UserId)
            .WithTitle("Ready")
            .WithOpenRecordAction("Otwórz \"fakturę\"", cr679_invoice.EntityLogicalName, InvoiceId)
            .WithOpenRecordAction("Order", cr679_order.EntityLogicalName, InvoiceId, NavigationTarget.NewWindow)
            .Build();

        using var json = JsonDocument.Parse(notification.Data);
        var actions = json.RootElement.GetProperty("actions");
        Assert.Equal(2, actions.GetArrayLength());

        var first = actions[0];
        Assert.Equal("Otwórz \"fakturę\"", first.GetProperty("title").GetString());
        Assert.Equal($"?pagetype=entityrecord&etn=cr679_invoice&id={InvoiceId}", first.GetProperty("data").GetProperty("url").GetString());
        Assert.Equal("inline", first.GetProperty("data").GetProperty("navigationTarget").GetString());
        Assert.Equal("newWindow", actions[1].GetProperty("data").GetProperty("navigationTarget").GetString());
    }

    [Fact]
    public void Escapes_control_characters_in_action_labels()
    {
        var notification = AppNotificationBuilder.To(UserId)
            .WithTitle("t")
            .WithOpenRecordAction("line\nbreak\tab\t\u0001", "account", InvoiceId)
            .Build();

        using var json = JsonDocument.Parse(notification.Data);
        Assert.Equal("line\nbreak\tab\t\u0001", json.RootElement.GetProperty("actions")[0].GetProperty("title").GetString());
    }

    [Fact]
    public void Truncates_title_and_body_to_the_column_lengths()
    {
        var notification = AppNotificationBuilder.To(UserId).WithTitle(new string('t', 500)).WithBody(new string('b', 5000)).Build();

        Assert.Equal(200, notification.Title.Length);
        Assert.Equal(2000, notification.Body.Length);
    }

    [Fact]
    public void Rejects_a_missing_recipient_title_or_time_to_live()
    {
        Assert.Throws<ArgumentException>(() => AppNotificationBuilder.To(Guid.Empty));
        Assert.Throws<InvalidOperationException>(() => AppNotificationBuilder.To(UserId).Build());
        Assert.Throws<ArgumentOutOfRangeException>(() => AppNotificationBuilder.To(UserId).ExpiresAfter(TimeSpan.Zero));
    }

    [Theory]
    [InlineData("systemuser", true)]
    [InlineData("team", false)]
    public void Only_users_can_be_notified(string ownerType, bool expected)
    {
        Assert.Equal(expected, AppNotificationBuilder.CanNotify(new EntityReference(ownerType, UserId)));
    }

    [Fact]
    public void A_missing_owner_cannot_be_notified()
    {
        Assert.False(AppNotificationBuilder.CanNotify(null));
    }
}
