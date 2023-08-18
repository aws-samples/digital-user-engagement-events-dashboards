// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { AthenaUtil } from "./constructs/athena-util";
import { AthenaViewConstruct } from "./athena-view-construct";
import { aws_s3 as s3 } from "aws-cdk-lib";
import { Construct } from "constructs";
import { QuicksightResourcesConstruct } from "./quicksight-resources-construct";
import { PinpointCampaignJourneyDB } from "./pinpoint-campaign-journey-db";
import { QsServiceRole, RefreshSchedule } from "./types/type-definitions";
import { QsUtil } from "./constructs/qs-util";
import { Stack, StackProps } from "aws-cdk-lib";

interface MainAppProps extends StackProps {
  athenaWorkGroupName: string;
  athena_util: AthenaUtil;
  dueDbBucketName: string;
  dataLakeDbName: string;
  dateRangeNumberOfMonths: number;
  pinpointProjectId: string;
  qsDefaultServiceRole: QsServiceRole;
  qsUserName: string;
  qsUserRegion: string;
  qs_util: QsUtil;
  spiceRefreshInterval: RefreshSchedule;
}

export class MainApp extends Stack {
  athenaViewConstruct: AthenaViewConstruct;
  quicksightResourcesConstruct: QuicksightResourcesConstruct;
  pinpointCampaignJourneyDB: PinpointCampaignJourneyDB;

  constructor(scope: Construct, id: string, props: MainAppProps) {
    super(scope, id, props);

    const {
      athenaWorkGroupName,
      athena_util,
      dueDbBucketName,
      dataLakeDbName,
      dateRangeNumberOfMonths,
      pinpointProjectId,
      qsDefaultServiceRole,
      qsUserName,
      qsUserRegion,
      qs_util,
      spiceRefreshInterval,
    } = props;

    //This is the list of buckets that Quicksight will have access to
    const listS3BucketArnForQuickSightAccess = new Array<string>();

    //DUE DB bucket
    const dueDbBucket = s3.Bucket.fromBucketName(this, "due-db-bucket", dueDbBucketName);
    listS3BucketArnForQuickSightAccess.push(dueDbBucket.bucketArn);

    //DynamoDB lookup table resources
    this.pinpointCampaignJourneyDB = new PinpointCampaignJourneyDB(this, "pinpoint-campaign-journey-db", {
      athena_util: athena_util,
      pinpointProjectId: pinpointProjectId,
    });
    listS3BucketArnForQuickSightAccess.push(this.pinpointCampaignJourneyDB.spillBucketArn);

    //Athena View Resources
    this.athenaViewConstruct = new AthenaViewConstruct(this, "athena-view-stack", {
      athenaDynamoLambdaArn: this.pinpointCampaignJourneyDB.athenaDynamoLambdaArn,
      athenaWorkGroupName: athenaWorkGroupName,
      athena_util: athena_util,
      bucketArn: dueDbBucket.bucketArn,
      dataLakeSchemaName: dataLakeDbName,
      dateRangeNumberOfMonths: dateRangeNumberOfMonths,
      campaignJourneyDynamoDbTableName: this.pinpointCampaignJourneyDB.campaignJourneyDynamoDbTableName,
      segmentDynamoDbTableName: this.pinpointCampaignJourneyDB.segmentDynamoDbTableName,
    });

    //Quicksight resources
    this.quicksightResourcesConstruct = new QuicksightResourcesConstruct(this, "pinpoint-athena-quick-sight-analysis", {
      athenaDynamoLambdaArn: this.pinpointCampaignJourneyDB.athenaDynamoLambdaArn,
      athena_util: athena_util,
      athenaWorkGroupName: athenaWorkGroupName,
      listS3BucketArnForQuickSightAccess: listS3BucketArnForQuickSightAccess,
      qsDefaultServiceRole: qsDefaultServiceRole,
      qs_util: qs_util,
      qsAdminUserName: qsUserName,
      qsUserRegion: qsUserRegion,
      spiceRefreshInterval: spiceRefreshInterval,
    });

    this.athenaViewConstruct.node.addDependency(this.pinpointCampaignJourneyDB);
    this.quicksightResourcesConstruct.node.addDependency(this.athenaViewConstruct);
  }
}
