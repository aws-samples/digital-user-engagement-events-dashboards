// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
export class AthenaUtil {
  private resourcePrefix: string;
  constructor(resourcePrefix: string) {
    this.resourcePrefix = resourcePrefix;
  }

  /* -------------- Athena Constants -------------- */
  /* Athena Schema Name */
  public readonly athenaGlueSchemaName = "due_eventdb";
  public readonly athenaDynamoSchemaName = "default";

  /* Athena Catalog Name */
  public readonly athenaGlueCatalogName = "AwsDataCatalog";
  public readonly athenaDynamoCatalogName = (): string => this.resourcePrefix + "dynamo_db_catalog_cdk";

  /*Table Names */
  public readonly athenaDataLakeAllEventsTableName = "all_events";
  public readonly athenaEmailAllEventsTableName = (): string => this.resourcePrefix + "email_all_events";
  public readonly athenaSmsAllEventsTableName = (): string => this.resourcePrefix + "sms_all_events";
  public readonly athenaAllSendEventsTableName = (): string => this.resourcePrefix + "all_send_events";
  public readonly athenaCampaignAllEventsTableName = (): string => this.resourcePrefix + "campaign_all_events";
  public readonly athenaJourneyAllEventsTableName = (): string => this.resourcePrefix + "journey_all_events";
  public readonly athenaCustomAllEventsTableName = (): string => this.resourcePrefix + "custom_all_events";

  public readonly athenaEmailAllEventsJoinedWithPinpointLookupTableName = (): string => this.resourcePrefix + "email_all_events_with_pinpoint_camp_jour_data";
  public readonly athenaSmsAllEventsJoinedWithPinpointLookupTableName = (): string => this.resourcePrefix + "sms_all_events_with_pinpoint_camp_jour_data";
  public readonly athenaAllSendEventsJoinedWithPinpointLookupTableName = (): string => this.resourcePrefix + "all_send_events_with_pinpoint_camp_jour_data";

  /* Other */
  public readonly athenaDefaultWorkGroup = "primary";

  /* -------------- Dynamo DB & Catalog Setup Constants -------------- */
  public readonly dynamoDbCloudFormationSetupRelativeFileLocation = "./cf-templates/CF-PinpointCampaignJourneyDB.yaml";
  public readonly athenaToDynamoDbConnectorLambdaFunctionName = (): string => this.resourcePrefix + `athena-dynamo-db-catalog-metadata-function`;
}
