// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { AthenaNamedQueries } from "./constructs/athena-named-queries/athena-named-queries";
import { AthenaUtil } from "./constructs/athena-util";
import { aws_iam as iam } from "aws-cdk-lib";
import { aws_lambda as lambda } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Duration } from "aws-cdk-lib";
import { Stack } from "aws-cdk-lib/core";
import * as cr from "aws-cdk-lib/custom-resources";
import * as s3 from "aws-cdk-lib/aws-s3";

type AthenaViewConstructProps = {
  athenaDynamoLambdaArn: string;
  athenaWorkGroupName: string;
  athena_util: AthenaUtil;
  bucketArn: string;
  dataLakeSchemaName: string;
  dateRangeNumberOfMonths: number;
  campaignJourneyDynamoDbTableName: string;
  segmentDynamoDbTableName: string;
};

export class AthenaViewConstruct extends Construct {
  dynamoDbTableOutput: string;

  constructor(scope: Construct, id: string, props: AthenaViewConstructProps) {
    super(scope, id);

    const { athenaDynamoLambdaArn, athenaWorkGroupName, athena_util, bucketArn, dataLakeSchemaName, dateRangeNumberOfMonths, campaignJourneyDynamoDbTableName, segmentDynamoDbTableName } = props;

    /*----------------------- Athena Resources -------------------------*/

    const importedBucketFromArn = s3.Bucket.fromBucketArn(this, "imported-bucket-from-arn", bucketArn);

    const athenaNamedQueries = new AthenaNamedQueries(this, "athena-named-queries", {
      athena_util: athena_util,
      databaseName: dataLakeSchemaName,
      dateRangeNumberOfMonths: dateRangeNumberOfMonths,
      dynamoDataSource: athena_util.athenaDynamoCatalogName(),
      dynamoDatabase: athena_util.athenaDynamoSchemaName,
      dynamoTable: campaignJourneyDynamoDbTableName,
      segmentDynamoDbTableName,
    });

    //Create a role for the lambda to have access to logs
    const customViewHelperRole = new iam.Role(this, "custom-view-helper-role", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      path: "/",
    });

    //Create a lambda that will run name queries
    const customViewHelper = new lambda.Function(this, "custom-view-helper", {
      runtime: lambda.Runtime.PYTHON_3_10,
      memorySize: 256,
      timeout: Duration.seconds(300),
      code: lambda.Code.fromAsset("lambda"),
      handler: "index.lambda_handler",
      description: `lambda to create views from named queries in the ${dataLakeSchemaName} database`,
      role: customViewHelperRole,
      environment: {
        ALL_SEND_EVENTS: athenaNamedQueries.allSendEventsAttrNamedQueryId,
        ALL_SEND_EVENT_PINPOINT: athenaNamedQueries.allSendEventsWithPinpointNamedQueryId,
        CAMPAIGN_ALL_EVENTS: athenaNamedQueries.allCampaignEventsAttrNamedQueryId,
        CUSTOM_ALL_EVENTS: athenaNamedQueries.allCustomEventsAttrNamedQueryId,
        EMAIL_ALL_EVENTS: athenaNamedQueries.allEmailEventsAttrNamedQueryId,
        EMAIL_ALL_EVENTS_PINPOINT: athenaNamedQueries.allEmailEventsWithPinpointNamedQueryId,
        JOURNEY_ALL_EVENTS: athenaNamedQueries.allJourneyEventsAttrNamedQueryId,
        LOG_LEVEL: "DEBUG",
        S3_DATA_BUCKET: importedBucketFromArn.bucketName,
        SMS_ALL_EVENTS: athenaNamedQueries.allSmsEventsAttrNamedQueryId,
        SMS_ALL_EVENTS_PINPOINT: athenaNamedQueries.allSmsEventsWithPinpointNamedQueryId,
      },
    });

    //Create an IAM policy for the labmda to have access to Athena, S3, glue, and logs
    const customViewHelperRolePolicy = new iam.Policy(this, "custom-view-helper-policy", {
      policyName: "custom-view-helper-policy",
      roles: [customViewHelperRole],
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: [importedBucketFromArn.bucketArn],
          actions: ["s3:AbortMultipartUpload", "s3:GetBucketLocation", "s3:GetObject", "s3:ListBucket", "s3:ListBucketMultipartUploads", "s3:ListMultipartUploadParts"],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: [`${importedBucketFromArn.bucketArn}/temp/*`],
          actions: [
            "s3:PutObject", //Writes query execution files to S3
          ],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: [`arn:aws:athena:${Stack.of(this).region}:${Stack.of(this).account}:workgroup/${athenaWorkGroupName}`],
          actions: ["athena:GetQueryExecution", "athena:StartQueryExecution", "athena:GetNamedQuery", "athena:BatchGetNamedQuery", "athena:ListNamedQueries"],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: [
            `arn:aws:glue:${Stack.of(this).region}:${Stack.of(this).account}:table/${dataLakeSchemaName}/*`,
            `arn:aws:glue:${Stack.of(this).region}:${Stack.of(this).account}:database/${dataLakeSchemaName}`,
            `arn:aws:glue:${Stack.of(this).region}:${Stack.of(this).account}:catalog`,
          ],
          actions: ["glue:CreateTable", "glue:GetDatabase", "glue:GetDatabases", "glue:GetPartition", "glue:GetPartitions", "glue:GetTable", "glue:GetTables", "glue:UpdateTable"],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: [
            `arn:aws:athena:${Stack.of(this).region}:${Stack.of(this).account}:datacatalog/${athena_util.athenaGlueCatalogName}`,
            `arn:aws:athena:${Stack.of(this).region}:${Stack.of(this).account}:datacatalog/${athena_util.athenaDynamoCatalogName()}`,
          ],
          actions: ["athena:GetDataCatalog"],
        }),
        new iam.PolicyStatement({
          actions: ["lambda:InvokeFunction"],
          resources: [athenaDynamoLambdaArn],
          effect: iam.Effect.ALLOW,
        }),
        new iam.PolicyStatement({
          actions: ["logs:CreateLogGroup"],
          resources: [`arn:aws:logs:${Stack.of(this).region}:${Stack.of(this).account}:*`],
          effect: iam.Effect.ALLOW,
        }),
        new iam.PolicyStatement({
          actions: ["logs:CreateLogStream", "logs:PutLogEvents"],
          resources: [`arn:aws:logs:${Stack.of(this).region}:${Stack.of(this).account}:log-group:/aws/lambda/${customViewHelper.functionName}:*`],
          effect: iam.Effect.ALLOW,
        }),
      ],
    });

    //NOT REALLY SURE HOW THIS WORKS
    //Creates a lambda that calls my lambda a single time with an empty event
    const setupSampleFiles = new cr.AwsCustomResource(this, "SetupSampleFiles", {
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ["lambda:InvokeFunction"],
          effect: iam.Effect.ALLOW,
          resources: [customViewHelper.functionArn],
        }),
      ]),
      onCreate: {
        service: "Lambda",
        action: "invoke",
        parameters: {
          FunctionName: customViewHelper.functionName,
          InvocationType: "Event",
        },
        physicalResourceId: cr.PhysicalResourceId.of("JobSenderTriggerPhysicalId"),
      },
      onUpdate: {
        service: "Lambda",
        action: "invoke",
        parameters: {
          FunctionName: customViewHelper.functionName,
          InvocationType: "Event",
        },
        physicalResourceId: cr.PhysicalResourceId.of("JobSenderTriggerPhysicalId"),
      },
    });
  }
}
