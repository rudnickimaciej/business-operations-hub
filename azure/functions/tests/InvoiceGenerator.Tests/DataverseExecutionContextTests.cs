using InvoiceGenerator.Messages;

namespace InvoiceGenerator.Tests;

public class DataverseExecutionContextTests
{
    // Shape of a RemoteExecutionContext serialized as JSON by a Dataverse Service Endpoint (trimmed).
    private const string Message = """
        {
          "BusinessUnitId": "8f3a4d5e-0000-0000-0000-000000000001",
          "CorrelationId": "0c0e5b57-1d3f-4a5e-9a7b-111111111111",
          "Depth": 1,
          "InitiatingUserId": "5630d081-56b0-f011-bbd2-000d3ab50637",
          "InputParameters": [ { "key": "Target", "value": { "__type": "Entity:http://schemas.microsoft.com/xrm/2011/Contracts" } } ],
          "MessageName": "Create",
          "Mode": 1,
          "OperationCreatedOn": "\/Date(1791200000000)\/",
          "OperationId": "3a1b2c3d-4e5f-4a6b-8c7d-222222222222",
          "PrimaryEntityId": "9ba1a68a-afc0-f111-aaad-6045bddce132",
          "PrimaryEntityName": "cr679_invoice",
          "Stage": 40
        }
        """;

    [Fact]
    public void Parse_reads_the_fields_the_function_needs()
    {
        var context = DataverseExecutionContext.Parse(Message);

        Assert.Equal("Create", context.MessageName);
        Assert.Equal("cr679_invoice", context.PrimaryEntityName);
        Assert.Equal(TestData.InvoiceId, context.PrimaryEntityId);
        Assert.Equal(Guid.Parse("3a1b2c3d-4e5f-4a6b-8c7d-222222222222"), context.OperationId);
        Assert.Equal(Guid.Parse("0c0e5b57-1d3f-4a5e-9a7b-111111111111"), context.CorrelationId);
    }

    [Fact]
    public void Parse_tolerates_a_byte_order_mark_and_different_casing()
    {
        var context = DataverseExecutionContext.Parse("﻿{\"primaryEntityId\":\"9ba1a68a-afc0-f111-aaad-6045bddce132\"}");

        Assert.Equal(TestData.InvoiceId, context.PrimaryEntityId);
        Assert.Equal(Guid.Empty, context.OperationId);
    }

    [Fact]
    public void Parse_rejects_a_message_without_primary_entity_id()
    {
        Assert.Throws<FormatException>(() => DataverseExecutionContext.Parse("{\"MessageName\":\"Create\"}"));
    }
}
