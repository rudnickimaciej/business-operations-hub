using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using RentMaszyny.Dataverse.Common.Notifications;
using RentMaszyny.Dataverse.Model;

namespace RentMaszyny.Dataverse.Common.Tests;

public class AppNotificationSenderTests
{
    private static readonly Guid UserId = Guid.Parse("5630d081-56b0-f011-bbd2-000d3ab50637");

    [Fact]
    public void Creates_the_notification_and_returns_its_id()
    {
        var service = new RecordingOrganizationService();
        var notification = AppNotificationBuilder.To(UserId).WithTitle("Ready").Build();

        var id = new AppNotificationSender(service).Send(notification);

        Assert.Equal(service.CreatedId, id);
        Assert.Same(notification, Assert.Single(service.Created));
    }

    [Fact]
    public void Refuses_a_notification_for_a_team_before_calling_Dataverse()
    {
        var service = new RecordingOrganizationService();
        var notification = AppNotificationBuilder.To(UserId).WithTitle("Ready").Build();
        notification.OwnerId = new EntityReference("team", Guid.NewGuid());

        Assert.Throws<ArgumentException>(() => new AppNotificationSender(service).Send(notification));
        Assert.Empty(service.Created);
    }

    /// <summary>Records creates; nothing else is used by the sender.</summary>
    private sealed class RecordingOrganizationService : IOrganizationService
    {
        public Guid CreatedId { get; } = Guid.NewGuid();
        public List<Entity> Created { get; } = [];

        public Guid Create(Entity entity)
        {
            Created.Add(entity);
            return CreatedId;
        }

        public Entity Retrieve(string entityName, Guid id, ColumnSet columnSet) => throw new NotSupportedException();
        public void Update(Entity entity) => throw new NotSupportedException();
        public void Delete(string entityName, Guid id) => throw new NotSupportedException();
        public OrganizationResponse Execute(OrganizationRequest request) => throw new NotSupportedException();
        public void Associate(string entityName, Guid entityId, Relationship relationship, EntityReferenceCollection relatedEntities) => throw new NotSupportedException();
        public void Disassociate(string entityName, Guid entityId, Relationship relationship, EntityReferenceCollection relatedEntities) => throw new NotSupportedException();
        public EntityCollection RetrieveMultiple(QueryBase query) => throw new NotSupportedException();
    }
}
