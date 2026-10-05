using 'main.bicep'

param environment = 'dev'
param locationAbbreviation = 'neu'
param dataverseUrl = readEnvironmentVariable('DATAVERSE_URL')
param monthlyBudget = 4 // billing currency is EUR; ~5 USD
param budgetStartDate = '2026-10-01'
param budgetContactEmail = readEnvironmentVariable('BUDGET_CONTACT_EMAIL')
