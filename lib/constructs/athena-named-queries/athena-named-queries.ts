// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { AthenaUtil } from "../athena-util";
import { aws_athena as athena } from "aws-cdk-lib";
import { Construct } from "constructs";

type AthenaNamedQueriesProps = {
  athena_util: AthenaUtil;
  databaseName: string;
  dateRangeNumberOfMonths: number;
  dynamoDatabase: string;
  dynamoDataSource: string;
  dynamoTable: string;
  segmentDynamoDbTableName: string;
};

export class AthenaNamedQueries extends Construct {
  allCampaignEventsAttrNamedQueryId: string;
  allCustomEventsAttrNamedQueryId: string;
  allEmailEventsAttrNamedQueryId: string;
  allEmailEventsWithPinpointNamedQueryId: string;
  allJourneyEventsAttrNamedQueryId: string;
  allSendEventsAttrNamedQueryId: string;
  allSendEventsWithPinpointNamedQueryId: string;
  allSmsEventsAttrNamedQueryId: string;
  allSmsEventsWithPinpointNamedQueryId: string;

  constructor(scope: Construct, id: string, props: AthenaNamedQueriesProps) {
    super(scope, id);

    const { databaseName, dateRangeNumberOfMonths, dynamoDataSource, dynamoDatabase, dynamoTable: campaignJourneyDynamoTableName, segmentDynamoDbTableName, athena_util } = props;

    const athenaAllSendEvents = new athena.CfnNamedQuery(this, "athena-all-send-events", {
      name: athena_util.athenaAllSendEventsTableName(),
      database: `${databaseName}`,
      description: "Create the all send events view",
      queryString: `
            CREATE OR REPLACE VIEW ${athena_util.athenaAllSendEventsTableName()} AS
            SELECT
            event_type
            , from_unixtime((event_timestamp / 1000)) event_timestamp
            , from_unixtime((arrival_timestamp / 1000)) arrival_timestamp
            , application.app_id application_id
            , client.client_id endpoint_id
            , CASE
                WHEN attributes['campaign_id'] IS NOT NULL THEN attributes['campaign_id']
                WHEN attributes['journey_id'] IS NOT NULL THEN attributes['journey_id']
              END pinpoint_campaign_journey_id
              , CASE
                  WHEN attributes['campaign_id'] IS NOT NULL THEN 'campaign'
                  WHEN attributes['journey_id'] IS NOT NULL THEN 'journey'
                  ELSE 'transactional'
                END pinpoint_campaign_journey_type
            , attributes['treament_id'] pinpoint_treatment_id
            , attributes['journey_run_id'] journey_run_id
            , attributes['journey_send_status'] journey_send_status
            , attributes['journey_activity_id'] journey_activity_id
            , attributes['record_status'] record_status
            , awsaccountid aws_account_id
            , metrics.price_in_millicents_usd as price_in_millicents_usd
            , device.platform['name'] as device_platform_name
            FROM
            "${athena_util.athenaGlueCatalogName}"."${databaseName}"."${athena_util.athenaDataLakeAllEventsTableName}"
            WHERE from_unixtime((event_timestamp / 1000)) >= CAST(DATE_FORMAT(current_date, '%Y-%m-01') AS DATE) - interval '${dateRangeNumberOfMonths}' month 
              and (event_type in ('_SMS.SUCCESS', '_SMS.FAILURE') or event_type in ('_email.send', '_email.delivered', '_email.hardbounce', '_email.softbounce', '_email.complaint'))
            `,
    });

    const athenaAllSendEventsWithPinpointData = new athena.CfnNamedQuery(this, "athena-all-send-events-with-pinpoint", {
      name: athena_util.athenaAllSendEventsJoinedWithPinpointLookupTableName(),
      database: `${databaseName}`,
      description: "Create the all send events with pinpoint data view",
      queryString: `
            CREATE OR REPLACE VIEW ${athena_util.athenaAllSendEventsJoinedWithPinpointLookupTableName()} AS
            SELECT
              event.*
              , camp_jour.name as camp_jour_name
              , camp_jour.deleted as camp_jour_deleted_status
              , camp_jour.type as camp_jour_type
              , camp_jour.segment_id
              , camp_jour.event_name
              , segment.name as segment_name
              , segment.deleted as segment_deleted_status
            FROM "${athenaAllSendEvents.name}" as event
            LEFT JOIN "${dynamoDataSource}"."${dynamoDatabase}"."${campaignJourneyDynamoTableName}" as camp_jour 
              on event.pinpoint_campaign_journey_id = camp_jour.id
            LEFT JOIN "${dynamoDataSource}"."${dynamoDatabase}"."${segmentDynamoDbTableName}" as segment 
              on camp_jour.segment_id = segment.id
            `,
    });

    const athenaAllSmsView = new athena.CfnNamedQuery(this, "athena-view-all-sms", {
      name: athena_util.athenaSmsAllEventsTableName(),
      database: `${databaseName}`,
      description: "Create the All SMS View",
      queryString: `
            CREATE OR REPLACE VIEW ${athena_util.athenaSmsAllEventsTableName()} AS
            SELECT
              event_type
              , from_unixtime((event_timestamp / 1000)) event_timestamp
              , from_unixtime((arrival_timestamp / 1000)) arrival_timestamp
              , application.app_id application_id
              , client.client_id endpoint_id
              , CASE
                  WHEN attributes['campaign_id'] IS NOT NULL THEN attributes['campaign_id']
                  WHEN attributes['journey_id'] IS NOT NULL THEN attributes['journey_id']
                END pinpoint_campaign_journey_id
              , CASE
                  WHEN attributes['campaign_id'] IS NOT NULL THEN 'campaign'
                  WHEN attributes['journey_id'] IS NOT NULL THEN 'journey'
                  ELSE 'transactional'
                END pinpoint_campaign_journey_type
              , attributes['treament_id'] pinpoint_treatment_id
              , attributes['journey_run_id'] journey_run_id
              , attributes['journey_send_status'] journey_send_status
              , attributes['journey_activity_id'] journey_activity_id
              , awsaccountid aws_account_id
              , attributes['sender_request_id'] as sender_request_id
              , attributes['destination_phone_number'] as destination_phone_number
              , attributes['record_status'] as record_status
              , attributes['iso_country_code'] as iso_country_code
              , attributes['number_of_message_parts'] as number_of_message_parts
              , attributes['message_id'] as message_id
              , attributes['message_type'] as message_type
              , attributes['origination_phone_number'] as origination_phone_number
              , metrics.price_in_millicents_usd as price_in_millicents_usd
              , CAST(JSON_PARSE(attributes['customer_context']) AS MAP(VARCHAR, VARCHAR)) as message_tags
              , ingest_timestamp
              , device.platform['name'] as device_platform_name
            FROM
            "${athena_util.athenaGlueCatalogName}"."${databaseName}"."${athena_util.athenaDataLakeAllEventsTableName}"
            WHERE from_unixtime((event_timestamp / 1000)) >= CAST(DATE_FORMAT(current_date, '%Y-%m-01') AS DATE) - interval '${dateRangeNumberOfMonths}' month
              and (event_type LIKE '_SMS.%') 
            `,
    });

    const athenaAllSmsEventsWithPinpointData = new athena.CfnNamedQuery(this, "athena-all-sms-events-with-pinpoint", {
      name: "sms_all_events_with_pinpoint_camp_jour_data",
      database: `${databaseName}`,
      description: "Create the sms view with pinpoint data view",
      queryString: `
            CREATE OR REPLACE VIEW ${athena_util.athenaSmsAllEventsJoinedWithPinpointLookupTableName()} AS
            SELECT
              event.*
              , camp_jour.name as camp_jour_name
              , camp_jour.deleted as camp_jour_deleted_status
              , camp_jour.type as camp_jour_type
              , camp_jour.segment_id
              , camp_jour.event_name
              , segment.name as segment_name
              , segment.deleted as segment_deleted_status
            FROM "${athenaAllSmsView.name}" as event
            LEFT JOIN "${dynamoDataSource}"."${dynamoDatabase}"."${campaignJourneyDynamoTableName}" as camp_jour 
              on event.pinpoint_campaign_journey_id = camp_jour.id
            LEFT JOIN "${dynamoDataSource}"."${dynamoDatabase}"."${segmentDynamoDbTableName}" as segment 
              on camp_jour.segment_id = segment.id
            `,
    });

    const athenaAllEmailView = new athena.CfnNamedQuery(this, "athena-view-all-email", {
      name: athena_util.athenaEmailAllEventsTableName(),
      database: `${databaseName}`,
      description: "Create the Email All Events View",
      queryString: `
            CREATE OR REPLACE VIEW ${athena_util.athenaEmailAllEventsTableName()} AS
            SELECT
            event_type
              , from_unixtime((event_timestamp / 1000)) event_timestamp
              , from_unixtime((arrival_timestamp / 1000)) arrival_timestamp
              , application.app_id application_id
              , client.client_id endpoint_id
              , CASE
                  WHEN attributes['campaign_id'] IS NOT NULL THEN attributes['campaign_id']
                  WHEN attributes['journey_id'] IS NOT NULL THEN attributes['journey_id']
                END pinpoint_campaign_journey_id
              , CASE
                  WHEN attributes['campaign_id'] IS NOT NULL THEN 'campaign'
                  WHEN attributes['journey_id'] IS NOT NULL THEN 'journey'
                  ELSE 'transactional'
                END pinpoint_campaign_journey_type
              , attributes['treament_id'] pinpoint_treatment_id
              , attributes['journey_run_id'] journey_run_id
              , attributes['journey_send_status'] journey_send_status
              , attributes['journey_activity_id'] journey_activity_id
              , awsaccountid aws_account_id
              , facets.email_channel.mail_event.mail.message_id message_id
              , from_unixtime((facets.email_channel.mail_event.mail.message_send_timestamp / 1000)) message_send_timestamp
              , facets.email_channel.mail_event.mail.from_address from_address
              , element_at(facets.email_channel.mail_event.mail.destination, 1) destination
              , facets.email_channel.mail_event.mail.common_headers.subject as subject
              , MAP_CONCAT(COALESCE(client_context.custom, CAST(JSON '{}' AS MAP(varchar,varchar))),  attributes) as message_tags
              , ingest_timestamp
              , device.platform['name'] as device_platform_name
              , metrics.price_in_millicents_usd
            FROM
            "${athena_util.athenaGlueCatalogName}"."${databaseName}"."${athena_util.athenaDataLakeAllEventsTableName}"
            WHERE from_unixtime((event_timestamp / 1000)) >= CAST(DATE_FORMAT(current_date, '%Y-%m-01') AS DATE) - interval '${dateRangeNumberOfMonths}' month
              and (event_type LIKE '_email.%')
            `,
    });

    const athenaAllEmailEventsWithPinpointData = new athena.CfnNamedQuery(this, "athena-all-email-events-with-pinpoint", {
      name: "email_all_events_with_pinpoint_camp_jour_data",
      database: `${databaseName}`,
      description: "Create the all email events with pinpoint data view",
      queryString: `
            CREATE OR REPLACE VIEW ${athena_util.athenaEmailAllEventsJoinedWithPinpointLookupTableName()} AS
            SELECT
              event.*
              , camp_jour.name as camp_jour_name
              , camp_jour.deleted as camp_jour_deleted_status
              , camp_jour.type as camp_jour_type
              , camp_jour.segment_id
              , camp_jour.event_name
              , segment.name as segment_name
              , segment.deleted as segment_deleted_status
            FROM "${athenaAllEmailView.name}" as event
            LEFT JOIN "${dynamoDataSource}"."${dynamoDatabase}"."${campaignJourneyDynamoTableName}" as camp_jour 
              on event.pinpoint_campaign_journey_id = camp_jour.id
            LEFT JOIN "${dynamoDataSource}"."${dynamoDatabase}"."${segmentDynamoDbTableName}" as segment 
              on camp_jour.segment_id = segment.id
            `,
    });

    const athenaAllCampaignEventsView = new athena.CfnNamedQuery(this, "athena-view-all-campaign-events", {
      name: athena_util.athenaCampaignAllEventsTableName(),
      database: `${databaseName}`,
      description: "Creates the Campaign events View",
      queryString: `
            CREATE OR REPLACE VIEW ${athena_util.athenaCampaignAllEventsTableName()} AS
            SELECT
                event_type
              , from_unixtime((event_timestamp / 1000)) event_timestamp
              , from_unixtime((arrival_timestamp / 1000)) arrival_timestamp
              , application.app_id application_id
              , client.client_id endpoint_id
              , attributes['campaign_id'] pinpoint_campaign_id
              , attributes['treament_id'] pinpoint_treatment_id
              , awsaccountid aws_account_id
              , attributes['delivery_type'] delivery_type
              , attributes['campaign_send_status'] campaign_send_status
              , ingest_timestamp
              , metrics.price_in_millicents_usd
            FROM
            "${athena_util.athenaGlueCatalogName}"."${databaseName}"."${athena_util.athenaDataLakeAllEventsTableName}"
            WHERE from_unixtime((event_timestamp / 1000)) >= CAST(DATE_FORMAT(current_date, '%Y-%m-01') AS DATE) - interval '${dateRangeNumberOfMonths}' month
              and (event_type like '_campaign.%')
            `,
    });

    const athenaAllJourneyEventsView = new athena.CfnNamedQuery(this, "athena-view-all-journey-events", {
      name: athena_util.athenaJourneyAllEventsTableName(),
      database: `${databaseName}`,
      description: "Create all Journey View",
      queryString: `
            CREATE OR REPLACE VIEW ${athena_util.athenaJourneyAllEventsTableName()} AS
            SELECT
              event_type
              , from_unixtime((event_timestamp / 1000)) event_timestamp
              , from_unixtime((arrival_timestamp / 1000)) arrival_timestamp
              , application.app_id application_id
              , client.client_id endpoint_id
              , attributes['journey_id'] journey_id
              , attributes['journey_run_id'] journey_run_id
              , attributes['journey_send_status'] journey_send_status
              , attributes['journey_activity_id'] journey_activity_id
              , awsaccountid aws_account_id
              , typeof(client_context.custom['endpoint']) as custom
              , json_extract_scalar(client_context.custom['endpoint'], '$.EndpointStatus') as end_point_status
              , json_extract_scalar(client_context.custom['endpoint'], '$.ChannelType') as channel_type
              , json_extract_scalar(client_context.custom['endpoint'], '$.User.UserId') as user_id
              , ingest_timestamp
              , metrics.price_in_millicents_usd
            FROM
            "${athena_util.athenaGlueCatalogName}"."${databaseName}"."${athena_util.athenaDataLakeAllEventsTableName}"
            WHERE from_unixtime((event_timestamp / 1000)) >= CAST(DATE_FORMAT(current_date, '%Y-%m-01') AS DATE) - interval '${dateRangeNumberOfMonths}' month
              and (event_type like '_journey.%')  
            `,
    });

    const athenaAllCustomEventsView = new athena.CfnNamedQuery(this, "athena-view-all-custom-events", {
      name: athena_util.athenaCustomAllEventsTableName(),
      database: `${databaseName}`,
      description: "Create the Custom events View",
      queryString: `
            CREATE OR REPLACE VIEW ${athena_util.athenaCustomAllEventsTableName()} AS
            SELECT
              event_type
              , from_unixtime((event_timestamp / 1000)) event_timestamp
              , from_unixtime((arrival_timestamp / 1000)) arrival_timestamp
              , application.app_id application_id
              , client.client_id endpoint_id
              , client.cognito_id cognito_id
              , session['session_id'] session_id
              , from_unixtime(CAST(session['start_timestamp'] as BIGINT) / 1000) session_start_time
              , from_unixtime(CAST(session['stop_timestamp'] as BIGINT) / 1000) session_stop_time
              , ingest_timestamp
              , metrics.price_in_millicents_usd
            FROM
            "${athena_util.athenaGlueCatalogName}"."${databaseName}"."${athena_util.athenaDataLakeAllEventsTableName}"
            WHERE from_unixtime((event_timestamp / 1000)) >= CAST(DATE_FORMAT(current_date, '%Y-%m-01') AS DATE) - interval '${dateRangeNumberOfMonths}' month
              and (event_type NOT LIKE '_email.%' and event_type NOT LIKE '_SMS.%' and event_type NOT LIKE  '_campaign.%' and event_type NOT LIKE '_test.event%' and event_type NOT LIKE '_journey.%')  
            `,
    });

    this.allCampaignEventsAttrNamedQueryId = athenaAllCampaignEventsView.attrNamedQueryId;
    this.allCustomEventsAttrNamedQueryId = athenaAllCustomEventsView.attrNamedQueryId;
    this.allEmailEventsAttrNamedQueryId = athenaAllEmailView.attrNamedQueryId;
    this.allEmailEventsWithPinpointNamedQueryId = athenaAllEmailEventsWithPinpointData.attrNamedQueryId;
    this.allJourneyEventsAttrNamedQueryId = athenaAllJourneyEventsView.attrNamedQueryId;
    this.allSendEventsAttrNamedQueryId = athenaAllSendEvents.attrNamedQueryId;
    this.allSendEventsWithPinpointNamedQueryId = athenaAllSendEventsWithPinpointData.attrNamedQueryId;
    this.allSmsEventsAttrNamedQueryId = athenaAllSmsView.attrNamedQueryId;
    this.allSmsEventsWithPinpointNamedQueryId = athenaAllSmsEventsWithPinpointData.attrNamedQueryId;
  }
}
