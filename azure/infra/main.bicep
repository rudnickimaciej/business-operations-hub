// Invoice generator infrastructure (ADR-004). Deployed per environment into its own resource group:
//   az deployment group create -g <rg> -f main.bicep -p <env>.bicepparam -p budgetContactEmail=<you@example.com>
// Everything authenticates with the function's managed identity; no connection strings or keys are stored,
// except the Service Bus "send" SAS rule that Dataverse needs (its key is never output; read it with the CLI).

targetScope = 'resourceGroup'

@allowed(['dev', 'tst'])
param environment string

@description('Short workload name used in resource names.')
param workload string = 'rentmachines'

param location string = resourceGroup().location

@description('Region abbreviation used in resource names, e.g. "neu" for North Europe.')
param locationAbbreviation string = 'neu'

@description('Dataverse environment URL the function reads from and writes to, e.g. https://org.crm4.dynamics.com')
param dataverseUrl string

@description('Delivery attempts before a message goes to the dead-letter queue.')
param maxDeliveryCount int = 5

@description('Monthly budget for the resource group, in the billing currency (EUR for this subscription).')
param monthlyBudget int = 5

@description('First day of the month the budget starts (yyyy-MM-01). Must not change after the first deployment.')
param budgetStartDate string

@description('Who gets the budget alert. Passed at deployment time, not stored in the repo.')
param budgetContactEmail string

var suffix = take(uniqueString(resourceGroup().id), 5)
var baseName = '${workload}-${environment}-${locationAbbreviation}'
var queueName = 'invoice-requests'
var deploymentContainerName = 'deployments'
var tags = {
  project: 'business-operations-hub'
  env: environment
}

// Built-in role definition ids
var roles = {
  storageBlobDataOwner: 'b7e6dc6d-f1e8-4753-8033-0f276bb0955b'
  monitoringMetricsPublisher: '3913510d-42f4-4e42-8a64-420c390055eb'
  serviceBusDataReceiver: '4f6d3b9b-027b-4f4c-9142-0e5a2a2247e0'
}

// ── Monitoring ───────────────────────────────────────────────────────────────

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'log-${baseName}'
  location: location
  tags: tags
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-${baseName}'
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    DisableLocalAuth: true // telemetry is sent with the managed identity
  }
}

// ── Storage (Functions host state and deployment packages) ───────────────────

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: toLower('st${workload}${environment}${suffix}')
  location: location
  tags: tags
  kind: 'StorageV2'
  sku: { name: 'Standard_LRS' }
  properties: {
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false // managed identity only
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
}

resource deploymentContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: deploymentContainerName
}

// ── Service Bus ──────────────────────────────────────────────────────────────

resource serviceBus 'Microsoft.ServiceBus/namespaces@2022-10-01-preview' = {
  name: 'sb-${baseName}-${suffix}'
  location: location
  tags: tags
  sku: {
    name: 'Basic'
    tier: 'Basic'
  }
  properties: {
    minimumTlsVersion: '1.2'
  }
}

resource queue 'Microsoft.ServiceBus/namespaces/queues@2022-10-01-preview' = {
  parent: serviceBus
  name: queueName
  properties: {
    maxDeliveryCount: maxDeliveryCount
    lockDuration: 'PT1M'
    defaultMessageTimeToLive: 'P14D' // Basic tier maximum
    deadLetteringOnMessageExpiration: true
  }
}

// Dataverse Service Endpoints authenticate with SAS. Send-only, scoped to this one queue.
resource dataverseSendRule 'Microsoft.ServiceBus/namespaces/queues/authorizationRules@2022-10-01-preview' = {
  parent: queue
  name: 'dataverse-send'
  properties: {
    rights: ['Send']
  }
}

// ── Function App (Flex Consumption) ──────────────────────────────────────────

resource hostingPlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: 'asp-${baseName}'
  location: location
  tags: tags
  kind: 'functionapp'
  sku: {
    name: 'FC1'
    tier: 'FlexConsumption'
  }
  properties: {
    reserved: true // Linux
  }
}

resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: 'func-invoice-${baseName}-${suffix}'
  location: location
  tags: tags
  kind: 'functionapp,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: hostingPlan.id
    httpsOnly: true
    functionAppConfig: {
      deployment: {
        storage: {
          type: 'blobContainer'
          value: '${storage.properties.primaryEndpoints.blob}${deploymentContainerName}'
          authentication: {
            type: 'SystemAssignedIdentity'
          }
        }
      }
      scaleAndConcurrency: {
        maximumInstanceCount: 40
        instanceMemoryMB: 2048
      }
      runtime: {
        name: 'dotnet-isolated'
        version: '8.0'
      }
    }
    siteConfig: {
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      appSettings: [
        { name: 'AzureWebJobsStorage__accountName', value: storage.name }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsights.properties.ConnectionString }
        { name: 'APPLICATIONINSIGHTS_AUTHENTICATION_STRING', value: 'Authorization=AAD' }
        { name: 'ServiceBusConnection__fullyQualifiedNamespace', value: '${serviceBus.name}.servicebus.windows.net' }
        { name: 'InvoiceQueueName', value: queueName }
        { name: 'DataverseUrl', value: dataverseUrl }
      ]
    }
  }
}

// ── Role assignments for the function's managed identity ─────────────────────

resource storageRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storage
  name: guid(storage.id, functionApp.id, roles.storageBlobDataOwner)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roles.storageBlobDataOwner)
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource telemetryRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: appInsights
  name: guid(appInsights.id, functionApp.id, roles.monitoringMetricsPublisher)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roles.monitoringMetricsPublisher)
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource queueReceiverRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: queue
  name: guid(queue.id, functionApp.id, roles.serviceBusDataReceiver)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roles.serviceBusDataReceiver)
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// ── Cost guard ───────────────────────────────────────────────────────────────

resource budget 'Microsoft.Consumption/budgets@2023-11-01' = {
  name: 'budget-${baseName}'
  properties: {
    category: 'Cost'
    amount: monthlyBudget
    timeGrain: 'Monthly'
    timePeriod: {
      startDate: budgetStartDate
    }
    notifications: {
      actual80: {
        enabled: true
        operator: 'GreaterThanOrEqualTo'
        threshold: 80
        thresholdType: 'Actual'
        contactEmails: [budgetContactEmail]
      }
      forecast100: {
        enabled: true
        operator: 'GreaterThanOrEqualTo'
        threshold: 100
        thresholdType: 'Forecasted'
        contactEmails: [budgetContactEmail]
      }
    }
  }
}

output functionAppName string = functionApp.name
output functionPrincipalId string = functionApp.identity.principalId
output serviceBusNamespace string = '${serviceBus.name}.servicebus.windows.net'
output queueName string = queueName
output dataverseSendRuleName string = dataverseSendRule.name
