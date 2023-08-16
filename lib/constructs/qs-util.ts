// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { aws_quicksight as quicksight } from "aws-cdk-lib";

export class QsUtil {
  private resourcePrefix: string;

  constructor(resourcePrefix: string) {
    this.resourcePrefix = resourcePrefix;
  }

  /* -------------- Constants and Objects for QuickSight -------------- */
  public readonly lookbackWindowColumnName = "event_timestamp";

  /* -------------- Constants and Objects for QuickSight -------------- */

  public readonly emailAllEventsDataSetName = (): string => this.resourcePrefix + "email_all_events_data_set_cdk";
  public readonly smsAllEventsDataSetName = (): string => this.resourcePrefix + "sms_all_events_data_set_cdk";
  public readonly allSendEventsDataSetName = (): string => this.resourcePrefix + "all_send_events_data_set_cdk";

  public readonly qsAthenaDataSourceName = (): string => this.resourcePrefix + "qs_athena_data_source_cdk";

  public readonly qsPinpointAnalysisName = (): string => this.resourcePrefix + "qs_pinpoint_events_analysis_cdk";

  /* -------------- QuickSight Refresh Settings -------------- */
  public readonly qsDefaultImportMode = "SPICE";
  public readonly qsSpiceRefreshType = "INCREMENTAL_REFRESH"; //"FULL_REFRESH" is the other option

  /* -------------- Constants and Objects for IAM Role Changes -------------- */

  public readonly getQSDefaultServiceRole = (account: string, qsDefaultServiceRoleName: string) => {
    return `arn:aws:iam::${account}:role/service-role/${qsDefaultServiceRoleName}`;
  };

  /* -------------- Data Set Helper Functions -------------- */
  public readonly getQuicksightUserArn = (region: string, account: string, qsUserName: string) => {
    return `arn:aws:quicksight:${region}:${account}:user/default/${qsUserName}`;
  };

  /* -------------- Data Source Constants -------------- */
  public readonly qsDataSourceIamPermissionsActions = [
    "quicksight:DeleteDataSource",
    "quicksight:DescribeDataSource",
    "quicksight:DescribeDataSourcePermissions",
    "quicksight:PassDataSource",
    "quicksight:UpdateDataSource",
    "quicksight:UpdateDataSourcePermissions",
  ];

  /* -------------- Data Set Constants -------------- */

  public readonly qsDataSetIamPermissionsActions = [
    "quicksight:CancelIngestion",
    "quicksight:CreateIngestion",
    "quicksight:CreateRefreshSchedule",
    "quicksight:DeleteDataSet",
    "quicksight:DeleteDataSetRefreshProperties",
    "quicksight:DeleteRefreshSchedule",
    "quicksight:DescribeDataSet",
    "quicksight:DescribeDataSetPermissions",
    // "quicksight:DescribeDataSetRefreshProperties",
    "quicksight:DescribeIngestion",
    "quicksight:DescribeRefreshSchedule",
    "quicksight:ListIngestions",
    // "quicksight:ListRefreshSchedules",
    "quicksight:PassDataSet",
    "quicksight:PutDataSetRefreshProperties",
    "quicksight:UpdateDataSet",
    "quicksight:UpdateDataSetPermissions",
    "quicksight:UpdateRefreshSchedule",
  ];

  public readonly pinpointLookupTableDataSetColumns: quicksight.CfnDataSet.InputColumnProperty[] = [
    {
      name: "deleted",
      type: "STRING",
    },
    {
      name: "name",
      type: "STRING",
    },
    {
      name: "id",
      type: "STRING",
    },
    {
      name: "type",
      type: "STRING",
    },
  ];
  public readonly allSendEventsDataSetColumn: quicksight.CfnDataSet.InputColumnProperty[] = [
    {
      name: "event_type",
      type: "STRING",
    },
    {
      name: "event_timestamp",
      type: "DATETIME",
    },
    {
      name: "arrival_timestamp",
      type: "DATETIME",
    },
    {
      name: "application_id",
      type: "STRING",
    },
    {
      name: "endpoint_id",
      type: "STRING",
    },
    {
      name: "pinpoint_campaign_journey_id",
      type: "STRING",
    },
    {
      name: "pinpoint_campaign_journey_type",
      type: "STRING",
    },
    {
      name: "pinpoint_treatment_id",
      type: "STRING",
    },
    {
      name: "journey_run_id",
      type: "STRING",
    },
    {
      name: "journey_send_status",
      type: "STRING",
    },
    {
      name: "journey_activity_id",
      type: "STRING",
    },
    {
      name: "aws_account_id",
      type: "STRING",
    },
    {
      name: "price_in_millicents_usd",
      type: "DECIMAL",
    },
    {
      name: "device_platform_name",
      type: "STRING",
    },
    {
      name: "camp_jour_deleted_status",
      type: "STRING",
    },
    {
      name: "camp_jour_name",
      type: "STRING",
    },
    {
      name: "camp_jour_type",
      type: "STRING",
    },
    {
      name: "segment_id",
      type: "STRING",
    },
    {
      name: "event_name",
      type: "STRING",
    },
    {
      name: "segment_name",
      type: "STRING",
    },
    {
      name: "segment_deleted_status",
      type: "STRING",
    },
  ];

  public readonly emailAllEventsDataSetColumns: quicksight.CfnDataSet.InputColumnProperty[] = [
    {
      name: "event_type",
      type: "STRING",
    },
    {
      name: "event_timestamp",
      type: "DATETIME",
    },
    {
      name: "arrival_timestamp",
      type: "DATETIME",
    },
    {
      name: "application_id",
      type: "STRING",
    },
    {
      name: "endpoint_id",
      type: "STRING",
    },
    {
      name: "pinpoint_campaign_journey_id",
      type: "STRING",
    },
    {
      name: "pinpoint_campaign_journey_type",
      type: "STRING",
    },
    {
      name: "pinpoint_treatment_id",
      type: "STRING",
    },
    {
      name: "journey_run_id",
      type: "STRING",
    },
    {
      name: "journey_send_status",
      type: "STRING",
    },
    {
      name: "journey_activity_id",
      type: "STRING",
    },
    {
      name: "aws_account_id",
      type: "STRING",
    },
    {
      name: "message_id",
      type: "STRING",
    },
    {
      name: "message_send_timestamp",
      type: "DATETIME",
    },
    {
      name: "from_address",
      type: "STRING",
    },
    {
      name: "destination",
      type: "STRING",
    },
    {
      name: "subject",
      type: "STRING",
    },
    {
      name: "message_tags",
      type: "STRING",
    },
    {
      name: "ingest_timestamp",
      type: "DATETIME",
    },
    {
      name: "price_in_millicents_usd",
      type: "DECIMAL",
    },
    {
      name: "device_platform_name",
      type: "STRING",
    },
    {
      name: "camp_jour_deleted_status",
      type: "STRING",
    },
    {
      name: "camp_jour_name",
      type: "STRING",
    },
    {
      name: "camp_jour_type",
      type: "STRING",
    },
    {
      name: "segment_id",
      type: "STRING",
    },
    {
      name: "event_name",
      type: "STRING",
    },
    {
      name: "segment_name",
      type: "STRING",
    },
    {
      name: "segment_deleted_status",
      type: "STRING",
    },
  ];

  public readonly smsAllEventsDataSetColumns: quicksight.CfnDataSet.InputColumnProperty[] = [
    {
      name: "event_type",
      type: "STRING",
    },
    {
      name: "event_timestamp",
      type: "DATETIME",
    },
    {
      name: "arrival_timestamp",
      type: "DATETIME",
    },
    {
      name: "application_id",
      type: "STRING",
    },
    {
      name: "endpoint_id",
      type: "STRING",
    },
    {
      name: "pinpoint_campaign_journey_id",
      type: "STRING",
    },
    {
      name: "pinpoint_campaign_journey_type",
      type: "STRING",
    },
    {
      name: "pinpoint_treatment_id",
      type: "STRING",
    },
    {
      name: "journey_run_id",
      type: "STRING",
    },
    {
      name: "journey_send_status",
      type: "STRING",
    },
    {
      name: "journey_activity_id",
      type: "STRING",
    },
    {
      name: "aws_account_id",
      type: "STRING",
    },
    {
      name: "sender_request_id",
      type: "STRING",
    },
    {
      name: "destination_phone_number",
      type: "STRING",
    },
    {
      name: "record_status",
      type: "STRING",
    },
    {
      name: "iso_country_code",
      type: "STRING",
    },
    {
      name: "number_of_message_parts",
      type: "STRING",
    },
    {
      name: "message_id",
      type: "STRING",
    },
    {
      name: "message_type",
      type: "STRING",
    },
    {
      name: "origination_phone_number",
      type: "STRING",
    },
    {
      name: "price_in_millicents_usd",
      type: "DECIMAL",
    },
    {
      name: "message_tags",
      type: "STRING",
    },
    {
      name: "ingest_timestamp",
      type: "DATETIME",
    },
    {
      name: "device_platform_name",
      type: "STRING",
    },
    {
      name: "camp_jour_deleted_status",
      type: "STRING",
    },
    {
      name: "camp_jour_name",
      type: "STRING",
    },
    {
      name: "camp_jour_type",
      type: "STRING",
    },
    {
      name: "segment_id",
      type: "STRING",
    },
    {
      name: "event_name",
      type: "STRING",
    },
    {
      name: "segment_name",
      type: "STRING",
    },
    {
      name: "segment_deleted_status",
      type: "STRING",
    },
  ];

  /* The QuickSight DataSet Identifier Name MUST match the references in the JSON file */
  /* This is the path from the top level of the CDK project to the template */
  public readonly qsPinpointAnalysisTemplateRelativePath = "./qs_analysis_definitions/pinpoint_event_analysis.json";
}
