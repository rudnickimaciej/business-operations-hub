namespace RentMaszyny.Dataverse.Common.Notifications;

/// <summary>Where an in-app notification action opens its page.</summary>
public enum NavigationTarget
{
    /// <summary>In the current app window.</summary>
    Inline,

    /// <summary>In a dialog over the current page.</summary>
    Dialog,

    /// <summary>In a new browser tab.</summary>
    NewWindow,
}
