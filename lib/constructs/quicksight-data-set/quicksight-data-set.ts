// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { aws_quicksight as quicksight } from "aws-cdk-lib";
import { Construct } from "constructs";
import { QsUtil } from "../qs-util";
import { randomUUID } from "crypto";
import { Stack } from "aws-cdk-lib";
import { uniqueId } from "lodash";

type AthenaDataSetProps = {
  catalogName: string;
  databaseSchemaName: string;
  dataSetName: string;
  dataSourceArn: string;
  importMode?: string;
  inputColumnsDef: quicksight.CfnDataSet.InputColumnProperty[];
  lookbackWindowColumnName: string;
  qs_util: QsUtil;
  qsUserName: string;
  qsUserRegion: string;
  spiceRefreshInterval: string;
  tableName: string;
};

/*
    Creates a Athena DataSet with the given properties
*/

export class AthenaDataSet extends Construct {
  dataSetArn: string;
  dataSetName: string;

  /**
   * @param {Construct} scope
   * @param {string} id
   * @param {AthenaDataSetProps} props
   */

  constructor(scope: Construct, id: string, props: AthenaDataSetProps) {
    super(scope, id);

    const { catalogName, databaseSchemaName, dataSetName, dataSourceArn, importMode, inputColumnsDef, lookbackWindowColumnName, spiceRefreshInterval, qs_util, qsUserName, qsUserRegion, tableName } =
      props;

    const dataSet = new quicksight.CfnDataSet(this, dataSetName, {
      awsAccountId: Stack.of(this).account,
      dataSetId: randomUUID(),
      name: dataSetName,
      dataSetRefreshProperties: {
        refreshConfiguration: {
          incrementalRefresh: {
            lookbackWindow: {
              columnName: lookbackWindowColumnName,
              size: 7,
              sizeUnit: "DAY",
            },
          },
        },
      },
      physicalTableMap: {
        physicalTableMapKey: {
          relationalTable: {
            dataSourceArn: dataSourceArn,
            inputColumns: inputColumnsDef,
            name: tableName,
            schema: databaseSchemaName,
            catalog: catalogName,
          },
        },
      },
      permissions: [
        {
          principal: qs_util.getQuicksightUserArn(qsUserRegion, Stack.of(this).account, qsUserName),
          actions: qs_util.qsDataSetIamPermissionsActions,
        },
      ],
      importMode: importMode,
    });

    const dataSetRefreshPolicy = new quicksight.CfnRefreshSchedule(this, "CfnRefreshSchedule", {
      awsAccountId: Stack.of(this).account,
      dataSetId: dataSet.dataSetId,
      schedule: {
        scheduleId: uniqueId(tableName),
        refreshType: qs_util.qsSpiceRefreshType,
        scheduleFrequency: {
          interval: spiceRefreshInterval,
          //If you want to be more specific about when refresh schedules are run you can uncomment and edit the following code. See documentation for more details.
          // timeOfTheDay: "04:00",
          // timeZone: "US/Eastern",
        },
        // startAfterDateTime: new Date(Date.now() + 3600 * 1000 * 24).toISOString().slice(0, -5) + "Z", //Starts refresh 24 hours after deployment
      },
    });

    dataSetRefreshPolicy.addDependency(dataSet);

    this.dataSetArn = dataSet.attrArn;
    this.dataSetName = dataSetName;
  }
}
