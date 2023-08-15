// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { AthenaUtil } from "./constructs/athena-util";
import { aws_athena as athena } from "aws-cdk-lib";
import { aws_s3 as s3 } from "aws-cdk-lib";
import { CfnApplication } from "aws-cdk-lib/aws-sam";
import { Construct } from "constructs";
import { Stack } from "aws-cdk-lib";
import * as cfninc from "aws-cdk-lib/cloudformation-include";

// import { PinpointProject } from 'aws-cdk-lib/aws-pinpoint';

type PinpointCampaignJourneyDBProps = {
  athena_util: AthenaUtil;
  pinpointProjectId: string;
};

export class PinpointCampaignJourneyDB extends Construct {
  campaignJourneyDynamoDbTableName: string;
  segmentDynamoDbTableName: string;
  spillBucketArn: string;
  athenaDynamoLambdaArn: string;

  //Look into stack sets or stack names
  constructor(scope: Construct, id: string, props: PinpointCampaignJourneyDBProps) {
    super(scope, id);

    const { pinpointProjectId: PINPOINT_PROJECT_ID, athena_util } = props;

    //Import cloud formation template that is in yaml format
    const template = new cfninc.CfnInclude(this, "pinpoint-campaign-journey-db", {
      templateFile: athena_util.dynamoDbCloudFormationSetupRelativeFileLocation,
      parameters: {
        PinpointProjectId: PINPOINT_PROJECT_ID,
      },
    });

    this.campaignJourneyDynamoDbTableName = template.getOutput("campaignJourneyDynamoDbTableName").value;
    this.segmentDynamoDbTableName = template.getOutput("segmentDynamoDbTableName").value;
    const logbucketName = template.getOutput("S3logBucket").value;

    const logBucket = s3.Bucket.fromBucketName(this, "LogBucket", logbucketName);
    logBucket.node.addDependency(template);

    //add removal policy?
    const spillBucket = new s3.Bucket(this, "SpillBucket", {
      enforceSSL: true,
      serverAccessLogsBucket: logBucket,
      serverAccessLogsPrefix: "spill",
    });
    this.spillBucketArn = spillBucket.bucketArn;

    const cfnAthenaConnector = new CfnApplication(this, "AthenaToDynamoConnector", {
      location: {
        applicationId: "arn:aws:serverlessrepo:us-east-1:292517598671:applications/AthenaDynamoDBConnector",
        semanticVersion: "2022.34.1",
      },
      parameters: {
        AthenaCatalogName: athena_util.athenaToDynamoDbConnectorLambdaFunctionName(),
        SpillBucket: spillBucket.bucketName,
      },
    });

    let athenaDynamoLambdaArn = `arn:aws:lambda:${Stack.of(this).region}:${Stack.of(this).account}:function:${athena_util.athenaToDynamoDbConnectorLambdaFunctionName()}`;
    this.athenaDynamoLambdaArn = athenaDynamoLambdaArn;

    const cfnDataCatalog = new athena.CfnDataCatalog(this, "MyCfnDataCatalog", {
      name: athena_util.athenaDynamoCatalogName(),
      type: "LAMBDA",
      description: "cdk catalog",
      parameters: {
        function: athenaDynamoLambdaArn,
      },
    });
  }
}
