// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { AthenaDataSet } from "./constructs/quicksight-data-set/quicksight-data-set";
import { AthenaUtil } from "./constructs/athena-util";
import { CfnOutput, aws_iam as iam } from "aws-cdk-lib";
import { Construct } from "constructs";
import { QsServiceRole, RefreshSchedule } from "./types/type-definitions";
import { QsUtil } from "./constructs/qs-util";
import { QuickSightAnalysisFromJSON } from "./constructs/quicksight-analysis/quicksight-analysis";
import { QuickSightDataSourceFromAthena } from "./constructs/quicksight-data-source/athena-data-source";
import { Stack } from "aws-cdk-lib";

type QuicksightResourcesConstructProps = {
  athenaDynamoLambdaArn: string;
  athena_util: AthenaUtil;
  athenaWorkGroupName: string;
  listS3BucketArnForQuickSightAccess: string[];
  qsDefaultServiceRole: QsServiceRole;
  qs_util: QsUtil;
  qsAdminUserName: string;
  qsUserRegion: string;
  spiceRefreshInterval: RefreshSchedule;
};

export class QuicksightResourcesConstruct extends Construct {
  //Look into stack sets or stack names
  constructor(scope: Construct, id: string, props: QuicksightResourcesConstructProps) {
    super(scope, id);

    const {
      athenaDynamoLambdaArn: athenaDynamoLambdaArn,
      athena_util: athena_util,
      athenaWorkGroupName: athenaWorkGroupName,
      listS3BucketArnForQuickSightAccess: listS3BucketArnForQuickSightAccess,
      qsDefaultServiceRole: qsDefaultServiceRole,
      qs_util: qs_util,
      qsAdminUserName: qsUserName,
      qsUserRegion: qsUserRegion,
      spiceRefreshInterval: spiceRefreshInterval,
    } = props;

    /* -------------------- QuickSight Resources -------------------- */

    /* -------------------- IAM Service Role for QuickSight to Access S3 -------------------- */
    //Get default service role  from IAM role name
    const quicksightRole = iam.Role.fromRoleArn(this, "qs-service-role", qs_util.getQSDefaultServiceRole(Stack.of(this).account, qsDefaultServiceRole));

    //Create a new policy to allow quicksight to access the Due Event DB S3 bucket
    const quicksightS3BucketAndLambdaInvokationAccessPolicy = new iam.ManagedPolicy(this, "quicksight-s3-lambda-managed-policy", {
      statements: [
        new iam.PolicyStatement({
          actions: ["s3:GetObject", "s3:GetObjectVersion", "s3:ListBucket"],
          resources: listS3BucketArnForQuickSightAccess.map((bucketArn) => bucketArn + "*"),
        }),
        new iam.PolicyStatement({
          actions: ["lambda:InvokeFunction"],
          resources: [athenaDynamoLambdaArn],
          effect: iam.Effect.ALLOW,
        }),
      ],
    });

    //Add new policy to the default athena role aws-quicksight-service-role-v0
    quicksightS3BucketAndLambdaInvokationAccessPolicy.attachToRole(quicksightRole);

    /* -------------------- Create QS Athena Data Source -------------------- */
    //Create Athena DataSource using Level 2 Construct
    const athenaDataSource = new QuickSightDataSourceFromAthena(this, "qs-athena-data-source", {
      athena_util: athena_util,
      dataSourceName: qs_util.qsAthenaDataSourceName(),
      qs_util: qs_util,
      qsUserName: qsUserName,
      qsUserRegion: qsUserRegion,
      workgroupName: athenaWorkGroupName,
    });

    //Create email_all_events Data Set
    const emailDataSetInstance = new AthenaDataSet(this, "email-all-events-data-set", {
      catalogName: athena_util.athenaGlueCatalogName,
      databaseSchemaName: athena_util.athenaGlueSchemaName,
      dataSetName: qs_util.emailAllEventsDataSetName(),
      dataSourceArn: athenaDataSource.dataSourceArn,
      importMode: qs_util.qsDefaultImportMode,
      inputColumnsDef: qs_util.emailAllEventsDataSetColumns,
      qs_util: qs_util,
      qsUserName: qsUserName,
      qsUserRegion: qsUserRegion,
      spiceRefreshInterval: spiceRefreshInterval,
      tableName: athena_util.athenaEmailAllEventsJoinedWithPinpointLookupTableName(),
    });

    //Create sms_all_events Data Set
    const smsDataSetInstance = new AthenaDataSet(this, "sms-all-events-data-set", {
      catalogName: athena_util.athenaGlueCatalogName,
      databaseSchemaName: athena_util.athenaGlueSchemaName,
      dataSetName: qs_util.smsAllEventsDataSetName(),
      dataSourceArn: athenaDataSource.dataSourceArn,
      importMode: qs_util.qsDefaultImportMode,
      inputColumnsDef: qs_util.smsAllEventsDataSetColumns,
      qs_util: qs_util,
      qsUserName: qsUserName,
      qsUserRegion: qsUserRegion,
      spiceRefreshInterval: spiceRefreshInterval,
      tableName: athena_util.athenaSmsAllEventsJoinedWithPinpointLookupTableName(),
    });

    //Create all_send_events Data Set
    const sendEventsDataSetInstance = new AthenaDataSet(this, "all-send-events-data-set", {
      catalogName: athena_util.athenaGlueCatalogName,
      databaseSchemaName: athena_util.athenaGlueSchemaName,
      dataSetName: qs_util.allSendEventsDataSetName(),
      dataSourceArn: athenaDataSource.dataSourceArn,
      importMode: qs_util.qsDefaultImportMode,
      inputColumnsDef: qs_util.allSendEventsDataSetColumn,
      qs_util: qs_util,
      qsUserName: qsUserName,
      qsUserRegion: qsUserRegion,
      spiceRefreshInterval: spiceRefreshInterval,
      tableName: athena_util.athenaAllSendEventsJoinedWithPinpointLookupTableName(),
    });

    /* -------------------- Create QS Analysis -------------------- */
    //Create Analysis
    const quicksightAnalysis = new QuickSightAnalysisFromJSON(this, "qs-analysis-template", {
      allSendEventsDataSetArn: sendEventsDataSetInstance.dataSetArn,
      allSendEventsDataSetIdentifierName: "all_send_events", //This has to match the identifier name from the JSON template
      analysisName: qs_util.qsPinpointAnalysisName(),
      emailAllEventsDataSetArn: emailDataSetInstance.dataSetArn,
      emailAllEventsDataSetIdentifierName: "email_all_events", //This has to match the identifier name from the JSON template
      previousAnalysisPath: qs_util.qsPinpointAnalysisTemplateRelativePath,
      qs_util: qs_util,
      qsUserName: qsUserName,
      qsUserRegion: qsUserRegion,
      smsAllEventsDataSetArn: smsDataSetInstance.dataSetArn,
      smsAllEventsDataSetIdentifierName: "sms_all_events", //This has to match the identifier name from the JSON template
    });

    new CfnOutput(this, "QuickSightPinpointAnalysisURL", { value: `https://${Stack.of(this).region}.quicksight.aws.amazon.com/sn/analyses/${quicksightAnalysis.analysisId}` });
  }
}
