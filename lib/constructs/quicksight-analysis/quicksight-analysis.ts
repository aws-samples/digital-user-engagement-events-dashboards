// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { aws_quicksight as quicksight } from "aws-cdk-lib";
import { camelCase } from "lodash";
import { Construct } from "constructs";
import { QsUtil } from "../qs-util";
import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import { Stack } from "aws-cdk-lib";

type QuicksightDataSetProps = {
  allSendEventsDataSetArn: string;
  allSendEventsDataSetIdentifierName: string;
  analysisName: string;
  emailAllEventsDataSetArn: string;
  emailAllEventsDataSetIdentifierName: string;
  previousAnalysisPath: string;
  qs_util: QsUtil;
  qsUserName: string;
  qsUserRegion: string;
  smsAllEventsDataSetArn: string;
  smsAllEventsDataSetIdentifierName: string;
};

/*
    Creates a QuickSight Analysis with the given properties
*/

export class QuickSightAnalysisFromJSON extends Construct {
  analysisId: string;

  constructor(scope: Construct, id: string, props: QuicksightDataSetProps) {
    super(scope, id);

    const {
      allSendEventsDataSetArn,
      allSendEventsDataSetIdentifierName,
      analysisName,
      emailAllEventsDataSetArn,
      emailAllEventsDataSetIdentifierName,
      previousAnalysisPath,
      qs_util,
      qsUserName,
      qsUserRegion,
      smsAllEventsDataSetArn,
      smsAllEventsDataSetIdentifierName,
    } = props;

    const buffer = readFileSync(previousAnalysisPath, { encoding: "latin1" });
    const jsonObj = JSON.parse(buffer);
    const camelCaseJsonObj = JSON.parse(JSON.stringify(updateToLowerCamelCase(jsonObj)));

    const quickSightAnalysis = new quicksight.CfnAnalysis(this, "quicksightAnalysis", {
      analysisId: randomUUID(),
      awsAccountId: Stack.of(this).account,
      name: analysisName,
      definition: {
        dataSetIdentifierDeclarations: [
          /*
            IMPORTANT
            Order is very important here. Check the JSON file and make sure that it matches
            The data set identifier name MUST match the new dataset arn being created
            The data set identifier is not changed from the file so it MUST match what the file has
          */
          {
            identifier: allSendEventsDataSetIdentifierName ?? camelCaseJsonObj.definition.dataSetIdentifierDeclarations[0]?.identifier,
            dataSetArn: allSendEventsDataSetArn,
          },
          {
            identifier: emailAllEventsDataSetIdentifierName ?? camelCaseJsonObj.definition.dataSetIdentifierDeclarations[1]?.identifier,
            dataSetArn: emailAllEventsDataSetArn,
          },
          {
            identifier: smsAllEventsDataSetIdentifierName ?? camelCaseJsonObj.definition.dataSetIdentifierDeclarations[2]?.identifier,
            dataSetArn: smsAllEventsDataSetArn,
          },
        ],
        //This is all possible properties of an AnalysisDefinitionProperty. Not all may be present in the template json provided
        // analysisDefaults: camelCaseJsonObj.definition?.analysisDefaults,
        calculatedFields: camelCaseJsonObj.definition?.calculatedFields,
        columnConfigurations: camelCaseJsonObj.definition?.columnConfigurations,
        filterGroups: camelCaseJsonObj.definition?.filterGroups,
        parameterDeclarations: camelCaseJsonObj.definition?.parameterDeclarations,
        sheets: camelCaseJsonObj.definition?.sheets,
      },
      permissions: [
        {
          principal: qs_util.getQuicksightUserArn(qsUserRegion, Stack.of(this).account, qsUserName),
          actions: [
            "quicksight:DeleteAnalysis",
            "quicksight:DescribeAnalysis",
            "quicksight:DescribeAnalysisPermissions",
            "quicksight:QueryAnalysis",
            "quicksight:RestoreAnalysis",
            "quicksight:UpdateAnalysis",
            "quicksight:UpdateAnalysisPermissions",
          ],
        },
      ],
      parameters: camelCaseJsonObj.parameters,
    });
    this.analysisId = quickSightAnalysis.analysisId;
  }
}

/*----------------Helper Functions------------*/
const updateToLowerCamelCase: any = function (obj: any) {
  if (Array.isArray(obj)) {
    return obj.map((v) => updateToLowerCamelCase(v));
  } else if (obj != null && obj.constructor === Object) {
    return Object.keys(obj).reduce(
      (result, key) => ({
        ...result,
        [camelCase(key)]: updateToLowerCamelCase(obj[key]),
      }),
      {}
    );
  }
  return obj;
};
