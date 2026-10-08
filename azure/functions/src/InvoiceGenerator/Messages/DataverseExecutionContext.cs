using System.Text.Json;

namespace InvoiceGenerator.Messages;

/// <summary>
/// The fields this function needs from the Dataverse RemoteExecutionContext that a Service Endpoint posts
/// to Service Bus in JSON format (DataContract serialization, so property names match the .NET type).
/// </summary>
public sealed record DataverseExecutionContext(
    string MessageName,
    string PrimaryEntityName,
    Guid PrimaryEntityId,
    Guid CorrelationId,
    Guid OperationId)
{
    private static readonly JsonDocumentOptions Options = new() { AllowTrailingCommas = true };

    public static DataverseExecutionContext Parse(string json)
    {
        using var document = JsonDocument.Parse(json.Trim().TrimStart('﻿'), Options);
        var root = document.RootElement;

        return new DataverseExecutionContext(
            GetString(root, "MessageName"),
            GetString(root, "PrimaryEntityName"),
            GetGuid(root, "PrimaryEntityId", required: true),
            GetGuid(root, "CorrelationId", required: false),
            GetGuid(root, "OperationId", required: false));
    }

    private static bool TryGetProperty(JsonElement root, string name, out JsonElement value)
    {
        foreach (var property in root.EnumerateObject())
        {
            if (string.Equals(property.Name, name, StringComparison.OrdinalIgnoreCase))
            {
                value = property.Value;
                return true;
            }
        }

        value = default;
        return false;
    }

    private static string GetString(JsonElement root, string name) =>
        TryGetProperty(root, name, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString() ?? string.Empty
            : string.Empty;

    private static Guid GetGuid(JsonElement root, string name, bool required)
    {
        if (Guid.TryParse(GetString(root, name), out var id) && id != Guid.Empty)
        {
            return id;
        }

        return required
            ? throw new FormatException($"The Dataverse execution context has no valid '{name}'.")
            : Guid.Empty;
    }
}
