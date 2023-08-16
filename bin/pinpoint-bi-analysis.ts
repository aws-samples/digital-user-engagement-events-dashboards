#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as cdk from "aws-cdk-lib";
import { Aspects } from "aws-cdk-lib";
import { AthenaUtil } from "../lib/constructs/athena-util";
import { AwsSolutionsChecks, NagSuppressions } from "cdk-nag";
import { MainApp } from "../lib/main-app";
import { QsUtil } from "../lib/constructs/qs-util";

const resourcePrefix = "pinpoint_analytics_"; // Can lowercase and (_) charachters
const athena_util = new AthenaUtil(resourcePrefix);
const qs_util = new QsUtil(resourcePrefix);

const app = new cdk.App();

const stack = new MainApp(app, "PinpointAnalytics", {
  env: {
    region: "us-east-1", //This region resources will be deployed. This must be where Pinpoint project is
  },

  //Attributes to change
  dueDbBucketName: "due-database-lp7jz6mzm0us-east-1",
  pinpointProjectId: "5f15f080a1024dd188fe09330c55a062",
  qsUserName: "Admin/sirbia-Isengard",

  //Default settings
  athenaWorkGroupName: "primary", //Can use any workgroup. Athena workgroup output bucket must be setup. Go to Athena > Workgroups > "workgroup" > Edit > Query result configuration
  dataLakeDbName: "due_eventdb", //Created during the DUE DB project. Default name is "due_eventdb"
  dateRangeNumberOfMonths: 6, //The number of months of data the Athena views and QuickSight SPICE datasets will contain
  qsUserRegion: "us-east-1", //Use CLI command aws quicksight list-users --aws-account-id {accout-id} --namespace default and look for the region in the arn
  qsDefaultServiceRole: "aws-quicksight-service-role-v0", // QuickSight uses aws-quicksight-s3-consumers-role-v0 by Default. If not present then QS uses aws-quicksight-service-role-v0
  spiceRefreshInterval: "DAILY", //Options Include "HOURLY", "DAILY" - Only Enterprise accounts can setup Hourly Data Refresh

  //Constants
  athena_util: athena_util,
  qs_util: qs_util,
});

Aspects.of(app).add(new AwsSolutionsChecks());
NagSuppressions.addStackSuppressions(stack, [
  { id: "AwsSolutions-IAM5", reason: "The only wildcards left in permissions are as specific as possible" },
  { id: "AwsSolutions-IAM4", reason: "This is a aws serverless application - Athena to Dynamo Connector" },
  { id: "AwsSolutions-L1", reason: "This is a aws serverless application - Athena to Dynamo Connector" },
]);
