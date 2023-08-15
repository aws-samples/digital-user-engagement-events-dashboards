// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { AthenaUtil } from "../athena-util";
import { aws_quicksight as quicksight } from "aws-cdk-lib";
import { Construct } from "constructs";
import { QsUtil } from "../qs-util";
import { randomUUID } from "crypto";
import { Stack } from "aws-cdk-lib";

type QuickSightDataSourceProps = {
  athena_util: AthenaUtil;
  dataSourceName: string;
  qs_util: QsUtil;
  qsUserName: string;
  qsUserRegion: string;
  workgroupName?: string;
};

/*
    Creates a QuickSight Analysis with the given properties
*/

export class QuickSightDataSourceFromAthena extends Construct {
  dataSourceArn: string;

  /**
   * @param {Construct} scope
   * @param {string} id
   * @param {QuickSightDataSourceProps} props
   */

  constructor(scope: Construct, id: string, props: QuickSightDataSourceProps) {
    super(scope, id);

    const { athena_util, dataSourceName, qs_util, qsUserName, qsUserRegion, workgroupName } = props;

    const cfnDataSource = new quicksight.CfnDataSource(this, "email-all-events-data-source", {
      name: dataSourceName,
      dataSourceId: randomUUID(),
      type: "ATHENA",
      awsAccountId: Stack.of(this).account,
      dataSourceParameters: {
        athenaParameters: {
          workGroup: workgroupName ?? athena_util.athenaDefaultWorkGroup,
        },
      },
      permissions: [
        {
          principal: qs_util.getQuicksightUserArn(qsUserRegion, Stack.of(this).account, qsUserName),
          actions: qs_util.qsDataSourceIamPermissionsActions,
        },
      ],
    });

    this.dataSourceArn = cfnDataSource.attrArn;
  }
}
